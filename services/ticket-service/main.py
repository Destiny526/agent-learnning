from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from scraper_12306 import fetch_tickets, STATION_CODES
from scraper_flights import fetch_flights
from redis_client import get_redis
from lock_manager import StockManager
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Travel Assistant - Ticket Service",
    version="2.0.0",
    description="Ticket Search Service (12306 Real-time)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-initialized stock manager
_stock_manager = None


def get_stock_manager() -> StockManager | None:
    """Get stock manager (lazy initialization)."""
    global _stock_manager
    if _stock_manager is None:
        redis = get_redis()
        if redis:
            _stock_manager = StockManager(redis)
    return _stock_manager


class TicketResponse(BaseModel):
    id: str
    ticket_type: str
    train_no: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    duration: float
    duration_str: str
    price: float
    seat_type: str
    available_seats: int


class BookTicketRequest(BaseModel):
    ticket_id: str
    quantity: int = 1


class BookTicketResponse(BaseModel):
    reservation_id: str
    ticket_id: str
    quantity: int
    status: str


@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "ticket-service"}


@app.get("/api/tickets/search", response_model=List[TicketResponse])
async def search_tickets(
    origin: str = Query(..., description="出发地"),
    destination: str = Query(..., description="目的地"),
    date: str = Query(..., description="出发日期 YYYY-MM-DD"),
    ticket_type: Optional[str] = Query(None, description="票务类型: train, high_speed, flight"),
):
    """从 12306 + 航班数据源实时抓取票务数据"""
    # 获取火车/高铁数据（12306）
    train_tickets = fetch_tickets(origin, destination, date)

    # 获取航班数据
    flight_tickets = fetch_flights(origin, destination, date)

    # 合并
    all_tickets = train_tickets + flight_tickets

    # 按类型过滤
    if ticket_type:
        if ticket_type == "flight":
            all_tickets = flight_tickets
        else:
            all_tickets = [t for t in train_tickets if t["ticket_type"] == ticket_type]

    # 转为统一格式
    results = []
    stock_manager = get_stock_manager()

    for i, t in enumerate(all_tickets):
        # 航班数据
        if "flight_no" in t:
            ticket_id = f"{t['flight_no']}_{date}"
            results.append(TicketResponse(
                id=ticket_id,
                ticket_type="flight",
                train_no=t["flight_no"],
                origin=t["origin"],
                destination=t["destination"],
                departure_time=t["departure_time"],
                arrival_time=t["arrival_time"],
                duration=t["duration"],
                duration_str=t["duration_str"],
                price=t["price"],
                seat_type=t.get("seat_class", "经济舱"),
                available_seats=t.get("available_seats", 0),
            ))
            # Initialize stock in Redis
            if stock_manager and t.get("available_seats", 0) > 0:
                stock_manager.init_stock(ticket_id, t["available_seats"])
            continue

        # 火车/高铁数据
        PRICE_MAP = {
            "second_class": 553, "hard_seat": 178,
            "first_class": 933, "hard_sleeper": 328,
            "soft_sleeper": 515, "soft_seat": 280,
            "business": 1748, "sleeper": 650,
            "no_seat": 178,
        }
        SEAT_LABELS = {
            "second_class": "二等座", "first_class": "一等座", "business": "商务座",
            "hard_seat": "硬座", "soft_seat": "软座", "hard_sleeper": "硬卧",
            "soft_sleeper": "软卧", "sleeper": "动卧", "no_seat": "无座",
        }
        best_seat = None
        best_price = 0
        best_count = 0
        for seat in t.get("seats", []):
            if seat["type"] == "no_seat":
                continue
            price = PRICE_MAP.get(seat["type"], 200)
            if best_seat is None or price < best_price:
                best_seat = seat["type"]
                best_price = price
                best_count = seat["count"]

        if best_seat is None:
            for seat in t.get("seats", []):
                if seat["type"] == "no_seat":
                    best_seat = "no_seat"
                    best_price = PRICE_MAP.get("no_seat", 178)
                    best_count = seat["count"]
                    break

        if best_seat is None:
            best_seat = "no_seat"
            best_price = 178
            best_count = 0

        ticket_id = f"{t['train_no']}_{date}"
        results.append(TicketResponse(
            id=ticket_id,
            ticket_type=t["ticket_type"],
            train_no=t["train_no"],
            origin=t["origin"],
            destination=t["destination"],
            departure_time=t["departure_time"],
            arrival_time=t["arrival_time"],
            duration=t["duration"],
            duration_str=t["duration_str"],
            price=best_price,
            seat_type=SEAT_LABELS.get(best_seat, best_seat),
            available_seats=best_count,
        ))

        # Initialize stock in Redis
        if stock_manager and best_count > 0:
            stock_manager.init_stock(ticket_id, best_count)

    return results


@app.post("/api/tickets/book", response_model=BookTicketResponse)
async def book_ticket(request: BookTicketRequest):
    """
    Book a ticket with atomic stock decrement.
    Returns success with reservation ID, or 409 if out of stock.
    """
    stock_manager = get_stock_manager()
    if not stock_manager:
        raise HTTPException(status_code=503, detail="Stock management unavailable (Redis not configured)")

    if request.quantity < 1 or request.quantity > 5:
        raise HTTPException(status_code=400, detail="Quantity must be between 1 and 5")

    result, reservation_id = stock_manager.try_decrement(request.ticket_id, request.quantity)

    if result == -1:
        raise HTTPException(status_code=404, detail="Ticket not found or inventory not initialized")
    if result == 0:
        raise HTTPException(status_code=409, detail="Insufficient stock")

    return BookTicketResponse(
        reservation_id=reservation_id,
        ticket_id=request.ticket_id,
        quantity=request.quantity,
        status="reserved",
    )


@app.post("/api/tickets/rollback")
async def rollback_ticket(
    ticket_id: str = Query(..., description="票务 ID"),
    quantity: int = Query(1, ge=1, le=5, description="回滚数量"),
):
    """Rollback stock (e.g., on order failure)."""
    stock_manager = get_stock_manager()
    if not stock_manager:
        raise HTTPException(status_code=503, detail="Stock management unavailable")

    success = stock_manager.rollback(ticket_id, quantity)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket stock not found")

    return {"success": True, "ticket_id": ticket_id, "quantity": quantity}


@app.get("/api/tickets/stock/{ticket_id}")
async def get_stock(ticket_id: str):
    """Get current stock count for a ticket."""
    stock_manager = get_stock_manager()
    if not stock_manager:
        raise HTTPException(status_code=503, detail="Stock management unavailable")

    stock = stock_manager.get_stock(ticket_id)
    return {"ticket_id": ticket_id, "stock": stock}


@app.get("/api/tickets/recommend")
async def recommend_tickets(
    origin: str = Query(..., description="出发地"),
    destination: str = Query(..., description="目的地"),
    expected_time: str = Query(..., description="期望时间 HH:MM"),
):
    """推荐票务（基于时间匹配）"""
    from datetime import datetime as dt
    today = dt.now().strftime("%Y-%m-%d")
    tickets = fetch_tickets(origin, destination, today)

    # 按时间排序，取最近的
    def time_diff(t):
        dep = t.get("departure_time", "")
        try:
            dep_time = dep.split(" ")[1] if " " in dep else dep
            h, m = map(int, dep_time.split(":")[:2])
            th, tm = map(int, expected_time.split(":")[:2])
            return abs((h * 60 + m) - (th * 60 + tm))
        except Exception:
            return 9999

    tickets.sort(key=time_diff)
    return tickets[:10]


@app.get("/api/tickets/stations")
async def get_stations():
    """获取支持的车站列表"""
    return {"stations": list(STATION_CODES.keys())}


@app.get("/api/tickets/detail/{ticket_id}")
async def get_ticket_detail(ticket_id: str):
    """票务详情（12306 数据不支持单独查询，返回提示）"""
    raise HTTPException(status_code=404, detail="Use search endpoint for real-time data")


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
