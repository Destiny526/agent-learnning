"""AI Service - FastAPI application"""
from fastapi import FastAPI, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import json

from database import get_db, Base, engine
from config import settings
from cache import CacheManager
from engine import Recommender, Scorer, CandidateFilter

app = FastAPI(
    title="AI Travel Assistant - AI Service",
    version="2.0.0",
    description="AI Recommendation Engine",
)

# 创建表
Base.metadata.create_all(bind=engine)


# ── Schemas ────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    origin: str
    destination: str
    expected_time: str  # ISO format datetime
    budget_max: Optional[float] = None
    user_id: Optional[int] = None


class ScoreBreakdownResponse(BaseModel):
    s_time: float
    s_price: float
    s_duration: float
    s_comfort: float
    total: float


class CandidateResponse(BaseModel):
    ticket_id: int
    ticket_type: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    duration: float
    price: float
    seat_type: Optional[str]
    available_seats: int
    score: float
    score_breakdown: ScoreBreakdownResponse


class RecommendResponse(BaseModel):
    best_option: Optional[CandidateResponse]
    cheapest_option: Optional[CandidateResponse]
    fastest_option: Optional[CandidateResponse]
    closest_time_option: Optional[CandidateResponse]
    all_options: List[CandidateResponse]
    total_candidates: int
    filtered_candidates: int


# ── Routes ─────────────────────────────────────────────────────────

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "ai-service", "version": "2.0.0"}


@app.post("/api/ai/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest, db: Session = Depends(get_db)):
    """综合推荐"""
    try:
        expected_time = datetime.fromisoformat(request.expected_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format, use ISO 8601")

    recommender = Recommender(db=db)
    result = recommender.recommend(
        origin=request.origin,
        destination=request.destination,
        expected_time=expected_time,
        budget_max=request.budget_max,
        user_id=request.user_id,
    )
    return result.to_dict()


@app.post("/api/ai/recommend/{ticket_type}", response_model=RecommendResponse)
async def recommend_by_type(
    ticket_type: str,
    request: RecommendRequest,
    db: Session = Depends(get_db),
):
    """按类型推荐（train / high_speed / flight / hotel / route）"""
    valid_types = {"train", "high_speed", "flight", "hotel", "route"}
    if ticket_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid type: {ticket_type}, must be one of {valid_types}")

    try:
        expected_time = datetime.fromisoformat(request.expected_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")

    recommender = Recommender(db=db)
    # 通过 provider 获取时限定类型
    candidates = recommender.provider.get_candidates(
        request.origin, request.destination, expected_time, ticket_type=ticket_type,
    )
    filtered = recommender.candidate_filter.filter(candidates, expected_time, request.budget_max)

    if not filtered:
        return {
            "best_option": None, "cheapest_option": None,
            "fastest_option": None, "closest_time_option": None,
            "all_options": [], "total_candidates": len(candidates), "filtered_candidates": 0,
        }

    scored = recommender.scorer.score_all(filtered, expected_time)
    best = scored[0]
    cheapest = min(scored, key=lambda x: x.price)
    fastest = min(scored, key=lambda x: x.duration)
    closest = min(scored, key=lambda x: abs((x.departure_time - expected_time).total_seconds()))

    return {
        "best_option": best.to_dict(),
        "cheapest_option": cheapest.to_dict(),
        "fastest_option": fastest.to_dict(),
        "closest_time_option": closest.to_dict(),
        "all_options": [s.to_dict() for s in scored],
        "total_candidates": len(candidates),
        "filtered_candidates": len(filtered),
    }


@app.get("/api/ai/config")
async def get_config():
    """查看当前评分权重配置"""
    return {
        "weights": {
            "time": settings.WEIGHT_TIME,
            "price": settings.WEIGHT_PRICE,
            "duration": settings.WEIGHT_DURATION,
            "comfort": settings.WEIGHT_COMFORT,
        },
        "time_decay_window_minutes": settings.TIME_DECAY_WINDOW,
        "search_window_hours": settings.SEARCH_WINDOW_HOURS,
        "comfort_scores": settings.COMFORT_SCORES,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
