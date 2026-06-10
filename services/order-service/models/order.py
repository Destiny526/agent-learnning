from sqlalchemy import Column, Integer, String, DateTime, Enum
from database import Base
from datetime import datetime, timezone

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    ticket_id = Column(Integer, nullable=False)
    status = Column(Enum("pending", "paid", "cancelled", "completed"), default="pending", index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))