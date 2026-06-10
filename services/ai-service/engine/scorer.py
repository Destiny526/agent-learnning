"""Recommendation scoring engine

Implements the 4-dimension scoring algorithm from recommendation-engine.md:
  score = w_time×S_time + w_price×S_price + w_duration×S_duration + w_comfort×S_comfort
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from config import settings


@dataclass
class ScoreBreakdown:
    """单条候选的评分明细"""
    s_time: float = 0.0
    s_price: float = 0.0
    s_duration: float = 0.0
    s_comfort: float = 0.0
    total: float = 0.0

    def to_dict(self) -> dict:
        return {
            "s_time": round(self.s_time, 4),
            "s_price": round(self.s_price, 4),
            "s_duration": round(self.s_duration, 4),
            "s_comfort": round(self.s_comfort, 4),
            "total": round(self.total, 4),
        }


@dataclass
class ScoredCandidate:
    """评分后的候选"""
    ticket_id: int
    ticket_type: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    duration: float
    price: float
    seat_type: Optional[str]
    available_seats: int
    score: ScoreBreakdown = field(default_factory=ScoreBreakdown)

    def to_dict(self) -> dict:
        return {
            "ticket_id": self.ticket_id,
            "ticket_type": self.ticket_type,
            "origin": self.origin,
            "destination": self.destination,
            "departure_time": str(self.departure_time),
            "arrival_time": str(self.arrival_time),
            "duration": self.duration,
            "price": self.price,
            "seat_type": self.seat_type,
            "available_seats": self.available_seats,
            "score": round(self.score.total, 4),
            "score_breakdown": self.score.to_dict(),
        }


class Scorer:
    """推荐评分器"""

    def __init__(
        self,
        weight_time: float = None,
        weight_price: float = None,
        weight_duration: float = None,
        weight_comfort: float = None,
        time_decay_window: int = None,
        comfort_scores: dict = None,
    ):
        self.w_time = weight_time or settings.WEIGHT_TIME
        self.w_price = weight_price or settings.WEIGHT_PRICE
        self.w_duration = weight_duration or settings.WEIGHT_DURATION
        self.w_comfort = weight_comfort or settings.WEIGHT_COMFORT
        self.time_decay_window = time_decay_window or settings.TIME_DECAY_WINDOW
        self.comfort_scores = comfort_scores or settings.COMFORT_SCORES

    # ── Individual dimension scores ─────────────────────────────────

    def score_time(self, departure_time: datetime, expected_time: datetime) -> float:
        """时间匹配评分：线性衰减"""
        diff = abs((departure_time - expected_time).total_seconds() / 60)
        return max(0.0, 1.0 - diff / self.time_decay_window)

    def score_price(self, price: float, min_price: float, max_price: float) -> float:
        """价格评分：Min-Max 归一化"""
        if max_price == min_price:
            return 1.0
        return 1.0 - (price - min_price) / (max_price - min_price)

    def score_duration(self, duration: float, min_duration: float, max_duration: float) -> float:
        """耗时评分：Min-Max 归一化"""
        if max_duration == min_duration:
            return 1.0
        return 1.0 - (duration - min_duration) / (max_duration - min_duration)

    def score_comfort(self, ticket_type: str) -> float:
        """舒适度评分：类型固定映射"""
        return self.comfort_scores.get(ticket_type, 0.5)

    # ── Composite scoring ───────────────────────────────────────────

    def score_candidate(
        self,
        candidate: dict,
        expected_time: datetime,
        price_range: tuple[float, float],
        duration_range: tuple[float, float],
    ) -> ScoredCandidate:
        """对单个候选计算四维评分"""
        min_p, max_p = price_range
        min_d, max_d = duration_range

        departure = candidate["departure_time"]
        if isinstance(departure, str):
            departure = datetime.fromisoformat(departure)

        s_time = self.score_time(departure, expected_time)
        s_price = self.score_price(candidate["price"], min_p, max_p)
        s_duration = self.score_duration(candidate["duration"], min_d, max_d)
        s_comfort = self.score_comfort(candidate["ticket_type"])

        total = (
            self.w_time * s_time
            + self.w_price * s_price
            + self.w_duration * s_duration
            + self.w_comfort * s_comfort
        )

        breakdown = ScoreBreakdown(
            s_time=s_time, s_price=s_price, s_duration=s_duration,
            s_comfort=s_comfort, total=total,
        )

        arrival = candidate.get("arrival_time", candidate["departure_time"])
        if isinstance(arrival, str):
            arrival = datetime.fromisoformat(arrival)

        return ScoredCandidate(
            ticket_id=candidate["id"],
            ticket_type=candidate["ticket_type"],
            origin=candidate["origin"],
            destination=candidate["destination"],
            departure_time=departure,
            arrival_time=arrival,
            duration=candidate["duration"],
            price=candidate["price"],
            seat_type=candidate.get("seat_type"),
            available_seats=candidate.get("available_seats", 0),
            score=breakdown,
        )

    def score_all(
        self,
        candidates: list[dict],
        expected_time: datetime,
    ) -> list[ScoredCandidate]:
        """对候选池批量评分"""
        if not candidates:
            return []

        prices = [c["price"] for c in candidates]
        durations = [c["duration"] for c in candidates]
        price_range = (min(prices), max(prices))
        duration_range = (min(durations), max(durations))

        scored = [
            self.score_candidate(c, expected_time, price_range, duration_range)
            for c in candidates
        ]

        return sorted(scored, key=lambda x: x.score.total, reverse=True)
