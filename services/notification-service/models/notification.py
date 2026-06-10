"""Notification Service - Notification model"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from database import Base
from datetime import datetime, timezone


class Notification(Base):
    """通知表"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(20), default="system", comment="system/email/sms/reminder")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
