from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum as SQLEnum
from sqlalchemy.sql import func
import enum
from database import Base

class TicketType(str, enum.Enum):
    TRAIN = "train"
    HIGH_SPEED = "high_speed"
    FLIGHT = "flight"

class RecommendationType(str, enum.Enum):
    OPTIMAL = "optimal"
    CHEAPEST = "cheapest"
    FASTEST = "fastest"
    EARLIEST = "earliest"

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    preferred_departure_time = Column(String(10), nullable=True)
    budget_range_min = Column(Float, nullable=True)
    budget_range_max = Column(Float, nullable=True)
    preferred_seat_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class RecommendationHistory(Base):
    __tablename__ = "recommendation_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    departure_date = Column(String(20), nullable=False)
    recommendation_type = Column(SQLEnum(RecommendationType), nullable=False)
    result_data = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
