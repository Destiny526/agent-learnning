"""API Gateway - 统一入口，转发请求到各微服务"""
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from datetime import datetime, timezone
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="AI Travel Assistant - Gateway",
    version="2.0.0",
    description="API Gateway for AI Travel Assistant",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ─────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "test-secret-key-for-dev")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

SERVICE_URLS = {
    "user": os.getenv("USER_SERVICE_URL", "http://localhost:8001"),
    "ticket": os.getenv("TICKET_SERVICE_URL", "http://localhost:8002"),
    "ai": os.getenv("AI_SERVICE_URL", "http://localhost:8003"),
    "order": os.getenv("ORDER_SERVICE_URL", "http://localhost:8004"),
    "notification": os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8005"),
}

security = HTTPBearer(auto_error=False)


# ── Helpers ────────────────────────────────────────────────────────

async def _forward(method: str, url: str, **kwargs) -> JSONResponse:
    """通用请求转发，返回 JSONResponse"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = getattr(client, method)
            response = await resp(url, **kwargs)
            return JSONResponse(
                status_code=response.status_code,
                content=response.json() if response.content else None,
            )
        except httpx.ConnectError:
            return JSONResponse(status_code=503, content={"detail": "Service unavailable"})
        except Exception as e:
            return JSONResponse(status_code=500, content={"detail": str(e)})


async def _get_current_user_id(credentials: HTTPAuthorizationCredentials) -> int:
    """从 JWT token 解析 user_id"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


# ── Auth (公开接口) ────────────────────────────────────────────────

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "gateway"}


@app.get("/api/health")
async def api_health_check():
    """API 健康检查端点"""
    return {
        "status": "healthy",
        "service": "gateway",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "user": SERVICE_URLS["user"],
            "ticket": SERVICE_URLS["ticket"],
            "ai": SERVICE_URLS["ai"],
            "order": SERVICE_URLS["order"],
            "notification": SERVICE_URLS["notification"],
        }
    }


@app.post("/api/auth/register")
async def register(request: Request):
    return await _forward("post", f"{SERVICE_URLS['user']}/api/auth/register", json=await request.json())


@app.post("/api/auth/login")
async def login(request: Request):
    return await _forward("post", f"{SERVICE_URLS['user']}/api/auth/login", json=await request.json())


@app.post("/api/auth/refresh")
async def refresh(request: Request):
    return await _forward("post", f"{SERVICE_URLS['user']}/api/auth/refresh", json=await request.json())


# ── User (需登录) ─────────────────────────────────────────────────

@app.get("/api/user/profile")
async def get_profile(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    return await _forward("get", f"{SERVICE_URLS['user']}/api/user/profile",
                          headers={"Authorization": f"Bearer {token}"})


@app.put("/api/user/profile")
async def update_profile(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    return await _forward("put", f"{SERVICE_URLS['user']}/api/user/profile",
                          json=await request.json(),
                          headers={"Authorization": f"Bearer {token}"})


@app.delete("/api/user/profile")
async def delete_profile(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    return await _forward("delete", f"{SERVICE_URLS['user']}/api/user/profile",
                          headers={"Authorization": f"Bearer {token}"})


# ── Tickets (公开接口，不需要登录) ─────────────────────────────────

@app.get("/api/tickets/search")
async def search_tickets(request: Request):
    return await _forward("get", f"{SERVICE_URLS['ticket']}/api/tickets/search",
                          params=dict(request.query_params))


@app.post("/api/tickets/search/{ticket_type}")
async def search_tickets_by_type(ticket_type: str, request: Request):
    """按类型搜索票务（前端调用）"""
    body = await request.json()
    params = {
        "origin": body.get("origin", ""),
        "destination": body.get("destination", ""),
        "date": body.get("departure_date", body.get("date", "")),
        "ticket_type": ticket_type,
    }
    return await _forward("get", f"{SERVICE_URLS['ticket']}/api/tickets/search", params=params)


@app.get("/api/tickets/recommend")
async def recommend_tickets(request: Request):
    return await _forward("get", f"{SERVICE_URLS['ticket']}/api/tickets/recommend",
                          params=dict(request.query_params))


@app.get("/api/tickets/detail/{ticket_id}")
async def get_ticket_detail(ticket_id: int):
    return await _forward("get", f"{SERVICE_URLS['ticket']}/api/tickets/detail/{ticket_id}")


# ── AI Recommend (公开接口) ───────────────────────────────────────

def _to_frontend_item(item: dict, item_type: str = None) -> dict:
    """将后端票务数据转为前端 RecommendResult 格式"""
    t = item_type or item.get("ticket_type", "unknown")
    TYPE_TITLES = {"train": "火车", "high_speed": "高铁", "flight": "飞机"}
    train_no = item.get("train_no", item.get("ticket_id", ""))
    origin = item.get("origin", "")
    destination = item.get("destination", "")
    title = f"{train_no} {origin} → {destination}" if train_no else f"{origin} → {destination}"
    desc_parts = []
    if item.get("seat_type"):
        desc_parts.append(str(item["seat_type"]))
    if item.get("duration_str"):
        desc_parts.append(item["duration_str"])
    elif item.get("duration"):
        desc_parts.append(f"{int(item['duration'])//60}h{int(item['duration'])%60}m")

    return {
        "item_id": str(item.get("id", item.get("ticket_id", train_no))),
        "item_type": t,
        "title": title,
        "description": " | ".join(desc_parts) if desc_parts else TYPE_TITLES.get(t, t),
        "price": float(item.get("price", 0)),
        "currency": "CNY",
        "score": float(item.get("score", 0)),
        "origin": origin,
        "destination": destination,
        "departure_time": str(item.get("departure_time", "")),
        "arrival_time": str(item.get("arrival_time", "")),
        "duration_minutes": item.get("duration"),
        "seat_type": item.get("seat_type"),
        "availability": item.get("available_seats", 0) > 0,
        "metadata": item.get("score_breakdown", {}),
    }


def _build_backend_params(body: dict) -> dict:
    """前端参数 → 后端参数"""
    # 前端 departure_date (YYYY-MM-DD) → 后端 expected_time (ISO datetime)
    date = body.get("departure_date", "")
    preferred = body.get("preferred_time", "")
    time_map = {"morning": "09:00:00", "afternoon": "14:00:00", "evening": "20:00:00"}
    time_part = time_map.get(preferred, "10:00:00")
    expected_time = f"{date}T{time_part}" if date else "2026-06-08T10:00:00"

    return {
        "origin": body.get("origin", ""),
        "destination": body.get("destination", ""),
        "expected_time": expected_time,
        "budget_max": body.get("budget_max"),
    }


@app.post("/api/ai/recommend")
async def ai_recommend(request: Request):
    body = await request.json()
    params = _build_backend_params(body) if "departure_date" in body else body
    async with httpx.AsyncClient(timeout=20.0) as client:
        # 先从 ticket-service 获取实时 12306 数据
        try:
            t_resp = await client.get(f"{SERVICE_URLS['ticket']}/api/tickets/search", params={
                "origin": params["origin"],
                "destination": params["destination"],
                "date": params["expected_time"][:10],
            })
            tickets = t_resp.json()
        except Exception:
            tickets = []

        # 调用 AI 服务评分
        try:
            resp = await client.post(f"{SERVICE_URLS['ai']}/api/ai/recommend", json=params)
            data = resp.json()
        except Exception:
            data = {"all_options": []}

    # 合并：AI 评分结果 + 12306 实时数据
    if "all_options" in data and data["all_options"]:
        items = [_to_frontend_item(o) for o in data["all_options"]]
    elif tickets:
        # AI 没有数据时，直接用 12306 数据
        items = [_to_frontend_item(t) for t in tickets]
    else:
        items = []
    return JSONResponse(content=items)


@app.post("/api/ai/recommend/all")
async def ai_recommend_all(request: Request):
    """全类型推荐 — 前端主入口（从 12306 实时获取 + AI 评分）"""
    import json as _json
    try:
        body = await request.json()
    except Exception:
        raw = await request.body()
        for enc in ("utf-8", "gbk", "gb2312", "latin-1"):
            try:
                body = _json.loads(raw.decode(enc))
                break
            except Exception:
                continue
        else:
            return JSONResponse(status_code=400, content={"detail": "Cannot decode request body"})
    origin = body.get("origin", "")
    destination = body.get("destination", "")
    date = body.get("departure_date", "")

    async with httpx.AsyncClient(timeout=20.0) as client:
        # 从 12306 获取实时数据
        try:
            t_resp = await client.get(
                f"{SERVICE_URLS['ticket']}/api/tickets/search",
                params={"origin": origin, "destination": destination, "date": date}
            )
            all_tickets = t_resp.json()
        except Exception:
            all_tickets = []

    # 按类型分组
    results = {"train": [], "high_speed": [], "flight": []}
    for t in all_tickets:
        ttype = t.get("ticket_type", "train")
        if ttype in results:
            results[ttype].append(_to_frontend_item(t, ttype))

    return JSONResponse(content=results)


@app.post("/api/ai/recommend/{ticket_type}")
async def ai_recommend_by_type(ticket_type: str, request: Request):
    body = await request.json()
    origin = body.get("origin", "")
    destination = body.get("destination", "")
    date = body.get("departure_date", "")

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            t_resp = await client.get(f"{SERVICE_URLS['ticket']}/api/tickets/search", params={
                "origin": origin,
                "destination": destination,
                "date": date,
                "ticket_type": ticket_type,
            })
            tickets = t_resp.json()
        except Exception:
            tickets = []

    items = [_to_frontend_item(t, ticket_type) for t in tickets]
    return JSONResponse(content=items)


@app.get("/api/ai/config")
async def ai_config():
    return await _forward("get", f"{SERVICE_URLS['ai']}/api/ai/config")


# ── Orders (需登录) ───────────────────────────────────────────────

@app.post("/api/orders")
async def create_order(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    return await _forward("post", f"{SERVICE_URLS['order']}/api/orders",
                          json=await request.json(),
                          headers={"Authorization": f"Bearer {token}"})


@app.get("/api/orders")
async def get_orders(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    return await _forward("get", f"{SERVICE_URLS['order']}/api/orders",
                          headers={"Authorization": f"Bearer {token}"})


@app.get("/api/orders/{order_id}")
async def get_order(order_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    return await _forward("get", f"{SERVICE_URLS['order']}/api/orders/{order_id}",
                          headers={"Authorization": f"Bearer {token}"})


@app.delete("/api/orders/{order_id}")
async def cancel_order(order_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    return await _forward("delete", f"{SERVICE_URLS['order']}/api/orders/{order_id}",
                          headers={"Authorization": f"Bearer {token}"})


# ── Favorites (需登录) ────────────────────────────────────────────

@app.get("/api/favorites")
async def get_favorites(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    return await _forward("get", f"{SERVICE_URLS['order']}/api/favorites",
                          headers={"Authorization": f"Bearer {token}"})


@app.post("/api/favorites")
async def add_favorite(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    body = await request.json()
    return await _forward("post", f"{SERVICE_URLS['order']}/api/favorites",
                          params={"ticket_id": body.get("ticket_id")},
                          headers={"Authorization": f"Bearer {token}"})


@app.delete("/api/favorites/{favorite_id}")
async def remove_favorite(favorite_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    return await _forward("delete", f"{SERVICE_URLS['order']}/api/favorites/{favorite_id}",
                          headers={"Authorization": f"Bearer {token}"})


# ── Notifications (需登录) ────────────────────────────────────────

@app.get("/api/notifications")
async def get_notifications(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = await _get_current_user_id(credentials)
    return await _forward("get", f"{SERVICE_URLS['notification']}/api/notifications/{user_id}",
                          params=dict(request.query_params))


@app.post("/api/notifications")
async def send_notification(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await _forward("post", f"{SERVICE_URLS['notification']}/api/notifications",
                          json=await request.json())


# ── 启动 ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
