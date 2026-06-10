"""AI Service - Ticket model"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from database import Base
from datetime import datetime, timezone


class Ticket(Base):
    """票务表"""
    __tablename__ = "tickets"
    __table_args__ = (
        Index("idx_route", "origin", "destination"),
        Index("idx_departure", "departure_time"),
        Index("idx_route_time", "origin", "destination", "departure_time"),
    )

    id = Column(Integer, primary_key=True, index=True)
    ticket_type = Column(String(20), nullable=False, comment="train / high_speed / flight / hotel / route")
    origin = Column(String(50), nullable=False)
    destination = Column(String(50), nullable=False)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)
    duration = Column(Float, nullable=False, comment="耗时（分钟）")
    price = Column(Float, nullable=False)
    seat_type = Column(String(20), nullable=True)
    total_seats = Column(Integer, default=0)
    available_seats = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
