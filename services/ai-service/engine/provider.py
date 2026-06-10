"""Data provider - fetches candidates from DB with cache layer"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from models.ticket import Ticket
from cache import CacheManager


class DataProvider:
    """票务数据提供者（DB + 缓存）"""

    def __init__(self, db: Session, cache: CacheManager = None):
        self.db = db
        self.cache = cache or CacheManager()

    def get_candidates(
        self,
        origin: str,
        destination: str,
        expected_time: datetime,
        window_hours: int = 12,
        ticket_type: Optional[str] = None,
    ) -> list[dict]:
        """
        获取候选票务，优先走缓存。
        返回 list[dict]，每个 dict 包含 Ticket 字段。
        """
        date_str = expected_time.strftime("%Y-%m-%d")

        # 尝试缓存
        cached = self.cache.get_ticket_pool(origin, destination, date_str)
        if cached is not None:
            candidates = cached
        else:
            # DB 查询
            window = timedelta(hours=window_hours)
            rows = (
                self.db.query(Ticket)
                .filter(
                    Ticket.origin == origin,
                    Ticket.destination == destination,
                    Ticket.departure_time >= expected_time - window,
                    Ticket.departure_time <= expected_time + window,
                )
                .order_by(Ticket.departure_time)
                .all()
            )
            candidates = [self._row_to_dict(r) for r in rows]
            self.cache.set_ticket_pool(origin, destination, date_str, candidates)

        # 可选按类型过滤
        if ticket_type:
            candidates = [c for c in candidates if c["ticket_type"] == ticket_type]

        return candidates

    def get_ticket(self, ticket_id: int) -> Optional[dict]:
        """获取单条票务（带缓存）"""
        cached = self.cache.get_ticket(ticket_id)
        if cached:
            return cached

        row = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not row:
            return None

        data = self._row_to_dict(row)
        self.cache.set_ticket(ticket_id, data)
        return data

    @staticmethod
    def _row_to_dict(row: Ticket) -> dict:
        return {
            "id": row.id,
            "ticket_type": row.ticket_type,
            "origin": row.origin,
            "destination": row.destination,
            "departure_time": str(row.departure_time),
            "arrival_time": str(row.arrival_time),
            "duration": row.duration,
            "price": row.price,
            "seat_type": row.seat_type,
            "total_seats": row.total_seats,
            "available_seats": row.available_seats,
        }
