from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone
import socket
import redis
import os
from dotenv import load_dotenv
from typing import List, Optional

from database import get_db, Base, engine
from models import Order, Favorite

load_dotenv()

# 创建表
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Travel Assistant - Order Service",
    version="1.0.0",
    description="Order Management Service"
)


def _get_redis():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        if s.connect_ex((os.getenv("REDIS_HOST", "localhost"), int(os.getenv("REDIS_PORT", "6379")))) != 0:
            s.close()
            return None
        s.close()
        return redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=int(os.getenv("REDIS_PORT", "6379")), decode_responses=True, socket_timeout=2)
    except Exception:
        return None


redis_client = _get_redis()

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
    return 1

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "order-service"}

@app.post("/api/orders", response_model=OrderResponse)
async def create_order(
    request: CreateOrderRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user_id = get_user_id_from_token(credentials)
    
    new_order = Order(
        user_id=user_id,
        ticket_id=request.ticket_id,
        status="pending"
    )
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    return OrderResponse.from_orm(new_order)

@app.get("/api/orders", response_model=List[OrderResponse])
async def get_orders(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user_id = get_user_id_from_token(credentials)
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    return [OrderResponse.from_orm(order) for order in orders]

@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
):
    user_id = get_user_id_from_token(credentials)
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel completed order")
    
    order.status = "cancelled"
    db.commit()
    
    return {"message": "Order cancelled successfully"}

@app.post("/api/favorites", response_model=FavoriteResponse)
async def add_favorite(
    ticket_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user_id = get_user_id_from_token(credentials)
    
    existing = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.ticket_id == ticket_id
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
    db: Session = Depends(get_db)
):
    user_id = get_user_id_from_token(credentials)
    favorites = db.query(Favorite).filter(Favorite.user_id == user_id).all()
    return [FavoriteResponse.from_orm(fav) for fav in favorites]

@app.delete("/api/favorites/{favorite_id}")
async def remove_favorite(
    favorite_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user_id = get_user_id_from_token(credentials)
    favorite = db.query(Favorite).filter(
        Favorite.id == favorite_id,
        Favorite.user_id == user_id
    ).first()
    
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    db.delete(favorite)
    db.commit()
    
    return {"message": "Favorite removed successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)