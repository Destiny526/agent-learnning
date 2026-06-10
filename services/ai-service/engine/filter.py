"""Candidate pre-filter"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from config import settings


class CandidateFilter:
    """预过滤器：在评分前剔除不合格候选"""

    def __init__(self, search_window_hours: int = None):
        self.search_window_hours = search_window_hours or settings.SEARCH_WINDOW_HOURS

    def filter(
        self,
        candidates: list[dict],
        expected_time: datetime,
        budget_max: Optional[float] = None,
    ) -> list[dict]:
        """
        过滤规则：
        1. available_seats > 0
        2. price <= budget_max（如指定）
        3. departure_time 在 expected_time ±12h 内
        """
        window = timedelta(hours=self.search_window_hours)
        result = []

        for c in candidates:
            # 余票
            if c.get("available_seats", 0) <= 0:
                continue

            # 预算
            if budget_max is not None and c["price"] > budget_max:
                continue

            # 时间窗口
            departure = c["departure_time"]
            if isinstance(departure, str):
                departure = datetime.fromisoformat(departure)
            if abs((departure - expected_time).total_seconds()) > window.total_seconds():
                continue

            result.append(c)

        return result
