"""LLM Output Pydantic Models - Trip Plan Schema"""
from pydantic import BaseModel
from typing import List, Optional


class TransportOption(BaseModel):
    """交通选项"""
    ticket_type: str
    train_no: str = ""
    carrier: str = ""
    departure_time: str
    arrival_time: str
    duration: str
    price: float
    seat_type: str
    recommendation_reason: str = ""


class HotelRecommendation(BaseModel):
    """酒店推荐"""
    name: str
    price_per_night: float
    nights: int
    location: str
    rating: float = 0.0
    recommendation_reason: str = ""


class TimelineEvent(BaseModel):
    """时间线事件"""
    time: str
    title: str
    detail: Optional[str] = None
    icon: str = ""


class DayPlan(BaseModel):
    """每日行程"""
    day: int
    title: str
    events: List[TimelineEvent] = []


class BudgetAnalysis(BaseModel):
    """预算分析"""
    transport: float = 0.0
    hotel: float = 0.0
    meals: float = 0.0
    attractions: float = 0.0
    total: float = 0.0
    remaining: float = 0.0


class TripPlan(BaseModel):
    """完整行程方案"""
    summary: str
    total_estimated_cost: float = 0.0
    outbound_transport: Optional[TransportOption] = None
    inbound_transport: Optional[TransportOption] = None
    hotel_recommendation: Optional[HotelRecommendation] = None
    daily_itinerary: List[DayPlan] = []
    tips: List[str] = []
    budget_analysis: Optional[BudgetAnalysis] = None
