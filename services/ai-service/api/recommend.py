"""Recommend API - Traditional recommendation endpoints (migrated from main.py)"""
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from engine.recommender import Recommender
from engine.provider import DataProvider
from engine.filter import CandidateFilter
from engine.scorer import Scorer
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["recommend"])


class RecommendRequest(BaseModel):
    origin: str
    destination: str
    expected_time: str  # ISO format: "2026-06-08T10:00:00" or "HH:MM"
    budget_max: Optional[float] = None
    user_id: Optional[int] = None


class TicketResponse(BaseModel):
    id: str
    ticket_type: str
    train_no: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    duration: float
    price: float
    seat_type: str
    available_seats: int
    score: float


@router.post("/recommend")
async def recommend(
    request: RecommendRequest,
    db: Session = Depends(get_db),
):
    """综合推荐（全类型）"""
    try:
        # 解析 expected_time
        try:
            if "T" in request.expected_time:
                expected_dt = datetime.fromisoformat(request.expected_time)
            else:
                # HH:MM 格式，使用今天的日期
                today = datetime.now().strftime("%Y-%m-%d")
                expected_dt = datetime.fromisoformat(f"{today}T{request.expected_time}:00")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid expected_time format. Use ISO format or HH:MM",
            )

        # 创建推荐器
        provider = DataProvider(db)
        candidate_filter = CandidateFilter(
            expected_time=expected_dt,
            budget_max=request.budget_max,
            search_window_hours=settings.SEARCH_WINDOW_HOURS,
        )
        scorer = Scorer(
            weight_time=settings.WEIGHT_TIME,
            weight_price=settings.WEIGHT_PRICE,
            weight_duration=settings.WEIGHT_DURATION,
            weight_comfort=settings.WEIGHT_COMFORT,
            time_decay_window=settings.TIME_DECAY_WINDOW,
            comfort_scores=settings.COMFORT_SCORES,
        )
        recommender = Recommender(provider, candidate_filter, scorer, db)

        # 执行推荐
        result = recommender.recommend(
            origin=request.origin,
            destination=request.destination,
            expected_time=expected_dt,
            budget_max=request.budget_max,
        )

        return result.to_dict()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend/{ticket_type}")
async def recommend_by_type(
    ticket_type: str,
    request: RecommendRequest,
    db: Session = Depends(get_db),
):
    """按类型推荐（train / high_speed / flight / hotel / route）"""
    valid_types = ["train", "high_speed", "flight", "hotel", "route"]
    if ticket_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ticket_type. Must be one of: {valid_types}",
        )

    try:
        # 解析 expected_time
        try:
            if "T" in request.expected_time:
                expected_dt = datetime.fromisoformat(request.expected_time)
            else:
                today = datetime.now().strftime("%Y-%m-%d")
                expected_dt = datetime.fromisoformat(f"{today}T{request.expected_time}:00")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid expected_time format. Use ISO format or HH:MM",
            )

        # 创建推荐器
        provider = DataProvider(db)
        candidate_filter = CandidateFilter(
            expected_time=expected_dt,
            budget_max=request.budget_max,
            search_window_hours=settings.SEARCH_WINDOW_HOURS,
        )
        scorer = Scorer(
            weight_time=settings.WEIGHT_TIME,
            weight_price=settings.WEIGHT_PRICE,
            weight_duration=settings.WEIGHT_DURATION,
            weight_comfort=settings.WEIGHT_COMFORT,
            time_decay_window=settings.TIME_DECAY_WINDOW,
            comfort_scores=settings.COMFORT_SCORES,
        )
        recommender = Recommender(provider, candidate_filter, scorer, db)

        # 执行推荐
        result = recommender.recommend(
            origin=request.origin,
            destination=request.destination,
            expected_time=expected_dt,
            budget_max=request.budget_max,
            ticket_type=ticket_type,
        )

        return result.to_dict()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recommendation by type failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_config():
    """查看当前评分权重配置"""
    return {
        "weights": {
            "time": settings.WEIGHT_TIME,
            "price": settings.WEIGHT_PRICE,
            "duration": settings.WEIGHT_DURATION,
            "comfort": settings.WEIGHT_COMFORT,
        },
        "time_decay_window": settings.TIME_DECAY_WINDOW,
        "search_window_hours": settings.SEARCH_WINDOW_HOURS,
        "comfort_scores": settings.COMFORT_SCORES,
    }
