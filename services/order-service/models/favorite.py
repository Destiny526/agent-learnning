from sqlalchemy import Column, Integer, DateTime, UniqueConstraint
from database import Base
from datetime import datetime, timezone


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "ticket_id", name="uk_favorites_user_ticket"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    ticket_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))