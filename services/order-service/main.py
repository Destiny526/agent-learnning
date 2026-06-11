from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone
from contextlib import asynccontextmanager
import threading
import redis
import os
import logging
from dotenv import load_dotenv
from typing import List, Optional

from database import get_db, Base, engine
from models import Order, Favorite
from notification_queue import enqueue_notification, run_consumer, get_queue_stats

load_dotenv()

logger = logging.getLogger(__name__)

# 创建表
Base.metadata.create_all(bind=engine)


def create_redis_client() -> redis.Redis | None:
    """Create Redis client. Returns None if Redis is not configured."""
    host = os.getenv("REDIS_HOST")
    if not host:
        return None
    return redis.Redis(
        host=host,
        port=int(os.getenv("REDIS_PORT", "6379")),
        password=os.getenv("REDIS_PASSWORD", None) or None,
        decode_responses=True,
        socket_timeout=2,
        socket_connect_timeout=2,
        retry_on_timeout=True,
    )


# Lazy-initialized Redis client to avoid fork safety issues with Gunicorn
_redis_client = None


def get_redis() -> redis.Redis | None:
    """Get Redis client (lazy initialization)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = create_redis_client()
    return _redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: start notification consumer in background thread."""
    # Startup: start notification consumer
    redis = get_redis()
    if redis:
        consumer_thread = threading.Thread(
            target=run_consumer,
            args=(redis,),
            daemon=True,
        )
        consumer_thread.start()
        logger.info("Notification consumer thread started")
    else:
        logger.warning("Redis not available, notification consumer not started")

    yield

    # Shutdown: consumer will stop due to daemon thread
    logger.info("Shutting down...")


app = FastAPI(
    title="AI Travel Assistant - Order Service",
    version="2.0.0",
    description="Order Management Service",
    lifespan=lifespan,
)


security = HTTPBearer()


class CreateOrderRequest(BaseModel):
    ticket_id: int


class OrderResponse(BaseModel):
    id: int
    user_id: int
    ticket_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    ticket_id: int
    created_at: datetime

    class Config:
        from_attributes = True


def get_user_id_from_token(credentials: HTTPAuthorizationCredentials):
    """Extract user ID from JWT token. Currently a stub."""
    # TODO: Implement proper JWT validation using Gateway's X-User-Id header
    return 1


@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "order-service"}


@app.post("/api/orders", response_model=OrderResponse)
async def create_order(
    request: CreateOrderRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = get_user_id_from_token(credentials)

    new_order = Order(
        user_id=user_id,
        ticket_id=request.ticket_id,
        status="pending",
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Enqueue notification (non-blocking, fire-and-forget)
    redis = get_redis()
    if redis:
        try:
            enqueue_notification(redis, user_id, new_order.id, request.ticket_id)
        except Exception as e:
            # Notification failure should not fail the order
            logger.error(f"Failed to enqueue notification: {e}")

    return OrderResponse.from_orm(new_order)


@app.get("/api/orders", response_model=List[OrderResponse])
async def get_orders(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = get_user_id_from_token(credentials)
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    return [OrderResponse.from_orm(order) for order in orders]


@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = get_user_id_from_token(credentials)
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return OrderResponse.from_orm(order)


@app.delete("/api/orders/{order_id}")
async def cancel_order(
    order_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = get_user_id_from_token(credentials)
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel completed order")

    order.status = "cancelled"
    db.commit()

    # Enqueue cancellation notification
    redis = get_redis()
    if redis:
        try:
            message = {
                "id": str(__import__("uuid").uuid4()),
                "type": "order_cancelled",
                "user_id": user_id,
                "order_id": order_id,
                "ticket_id": order.ticket_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "retry_count": 0,
                "max_retries": 3,
            }
            import json
            redis.lpush("queue:notifications", json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to enqueue cancellation notification: {e}")

    return {"message": "Order cancelled successfully"}


@app.post("/api/favorites", response_model=FavoriteResponse)
async def add_favorite(
    ticket_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = get_user_id_from_token(credentials)

    existing = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.ticket_id == ticket_id,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already favorited")

    new_favorite = Favorite(user_id=user_id, ticket_id=ticket_id)
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)

    return FavoriteResponse.from_orm(new_favorite)


@app.get("/api/favorites", response_model=List[FavoriteResponse])
async def get_favorites(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = get_user_id_from_token(credentials)
    favorites = db.query(Favorite).filter(Favorite.user_id == user_id).all()
    return [FavoriteResponse.from_orm(fav) for fav in favorites]


@app.delete("/api/favorites/{favorite_id}")
async def remove_favorite(
    favorite_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = get_user_id_from_token(credentials)
    favorite = db.query(Favorite).filter(
        Favorite.id == favorite_id,
        Favorite.user_id == user_id,
    ).first()

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    db.delete(favorite)
    db.commit()

    return {"message": "Favorite removed successfully"}


@app.get("/api/debug/queue-stats")
async def queue_stats():
    """Get queue statistics for monitoring."""
    redis = get_redis()
    if not redis:
        return {"error": "Redis not available"}
    return get_queue_stats(redis)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8004))
    uvicorn.run(app, host="0.0.0.0", port=port)
