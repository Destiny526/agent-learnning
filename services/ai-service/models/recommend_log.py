"""AI Service - RecommendLog model"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
from datetime import datetime, timezone


class RecommendLog(Base):
    """推荐日志表 - 记录每次推荐请求和结果"""
    __tablename__ = "recommend_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    query_data = Column(Text, nullable=True, comment="请求参数 JSON")
    result_data = Column(Text, nullable=True, comment="推荐结果 JSON")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
