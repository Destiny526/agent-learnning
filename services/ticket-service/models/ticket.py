from sqlalchemy import Column, Integer, String, DateTime, Float
from database import Base
from datetime import datetime, timezone

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_type = Column(String(20), nullable=False)
    origin = Column(String(50), nullable=False)
    destination = Column(String(50), nullable=False)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)
    duration = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    seat_type = Column(String(20))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))