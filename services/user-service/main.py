"""User Service - FastAPI application"""
from fastapi import FastAPI, HTTPException, Depends
from datetime import timedelta
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

from database import get_db, Base, engine
from models import User
from config import settings
from deps import (
    redis_client,
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    get_current_user,
)

app = FastAPI(
    title="AI Travel Assistant - User Service",
    version="1.0.0",
    description="User Management Service",
)

# 创建表（开发用，生产用 alembic）
Base.metadata.create_all(bind=engine)


# ── Pydantic schemas ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    phone: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    phone: Optional[str] = None


# ── Routes ─────────────────────────────────────────────────────────

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "user-service"}


@app.post("/api/auth/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    new_user = User(
        username=request.username,
        email=request.email,
        password_hash=get_password_hash(request.password),
        phone=request.phone,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully", "user": UserResponse.model_validate(new_user)}


@app.post("/api/auth/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    if redis_client:
        try:
            redis_client.setex(
                f"refresh_token:{user.id}",
                timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
                refresh_token,
            )
        except Exception:
            pass

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@app.post("/api/auth/refresh")
async def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(request.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        if redis_client:
            try:
                stored_token = redis_client.get(f"refresh_token:{user_id}")
                if stored_token != request.refresh_token:
                    raise HTTPException(status_code=401, detail="Invalid refresh token")
            except Exception:
                pass

        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer"}

    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


@app.get("/api/user/profile", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@app.put("/api/user/profile", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if request.username:
        existing = db.query(User).filter(User.username == request.username, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = request.username
    if request.phone is not None:
        user.phone = request.phone
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@app.delete("/api/user/profile")
async def delete_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if redis_client:
        try:
            redis_client.delete(f"refresh_token:{user.id}")
        except Exception:
            pass
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@app.post("/api/auth/logout")
async def logout(user: User = Depends(get_current_user)):
    if redis_client:
        try:
            redis_client.delete(f"refresh_token:{user.id}")
        except Exception:
            pass
    return {"message": "Logged out successfully"}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
