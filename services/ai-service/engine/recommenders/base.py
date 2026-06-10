"""Base recommender interface"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class RecommendationType(str, Enum):
    OPTIMAL = "optimal"
    CHEAPEST = "cheapest"
    FASTEST = "fastest"
    EARLIEST = "earliest"

class RecommenderType(str, Enum):
    TRAIN = "train"
    HIGH_SPEED = "high_speed"
    FLIGHT = "flight"
    HOTEL = "hotel"
    ROUTE = "route"

@dataclass
class RecommendationResult:
    """推荐结果数据类"""
    item_id: str
    item_type: RecommenderType
    title: str
    description: str
    price: float
    currency: str = "CNY"
    score: float = 0.0
    origin: str = ""
    destination: str = ""
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    seat_type: Optional[str] = None
    availability: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "item_id": self.item_id,
            "item_type": self.item_type.value,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "currency": self.currency,
            "score": self.score,
            "origin": self.origin,
            "destination": self.destination,
            "departure_time": self.departure_time,
            "arrival_time": self.arrival_time,
            "duration_minutes": self.duration_minutes,
            "seat_type": self.seat_type,
            "availability": self.availability,
            "metadata": self.metadata,
        }

@dataclass
class SearchCriteria:
    """搜索条件数据类"""
    origin: str
    destination: str
    departure_date: str
    recommendation_type: RecommendationType = RecommendationType.OPTIMAL
    user_id: Optional[int] = None
    max_results: int = 10
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    preferred_time: Optional[str] = None

class BaseRecommender(ABC):
    """推荐器基类，定义推荐器接口"""

    def __init__(self):
        self.recommender_type: RecommenderType = None

    @abstractmethod
    async def get_recommendations(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """获取推荐结果"""
        pass

    @abstractmethod
    async def search(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """搜索符合条件的结果"""
        pass

    def calculate_price_score(self, price: float, min_price: float, max_price: float) -> float:
        """计算价格评分（越低越好）"""
        if max_price == min_price:
            return 1.0
        return 1.0 - (price - min_price) / (max_price - min_price)

    def calculate_time_score(self, duration: int, optimal_duration: int) -> float:
        """计算时间评分（越接近最优时间越好）"""
        if duration <= optimal_duration:
            return 1.0
        return max(0.0, 1.0 - (duration - optimal_duration) / optimal_duration)

    def calculate_comprehensive_score(
        self,
        price_score: float,
        time_score: float,
        availability_score: float = 1.0,
        preference_score: float = 1.0,
        weights: Dict[str, float] = None
    ) -> float:
        """计算综合评分"""
        if weights is None:
            weights = {"price": 0.3, "time": 0.3, "availability": 0.2, "preference": 0.2}

        score = (
            weights.get("price", 0.3) * price_score +
            weights.get("time", 0.3) * time_score +
            weights.get("availability", 0.2) * availability_score +
            weights.get("preference", 0.2) * preference_score
        )
        return round(score, 4)

    def sort_by_recommendation_type(
        self,
        results: List[RecommendationResult],
        recommendation_type: RecommendationType
    ) -> List[RecommendationResult]:
        """根据推荐类型排序"""
        if recommendation_type == RecommendationType.CHEAPEST:
            return sorted(results, key=lambda x: x.price)
        elif recommendation_type == RecommendationType.FASTEST:
            return sorted(results, key=lambda x: x.duration_minutes or float('inf'))
        elif recommendation_type == RecommendationType.EARLIEST:
            return sorted(results, key=lambda x: x.departure_time or "")
        else:
            return sorted(results, key=lambda x: x.score, reverse=True)
