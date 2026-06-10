"""AI Service - Test fixtures"""
import os
import sys

os.environ["MYSQL_HOST"] = ""
os.environ["REDIS_HOST"] = "localhost"
os.environ["REDIS_PORT"] = "6379"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from models import Ticket, RecommendLog
import cache as cache_module


# ── Mock Redis ─────────────────────────────────────────────────────

class MockRedis:
    def __init__(self):
        self.store: dict = {}

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, expire, value):
        self.store[key] = value

    def delete(self, key):
        self.store.pop(key, None)

    def scan_iter(self, match=""):
        import fnmatch
        for k in list(self.store.keys()):
            if fnmatch.fnmatch(k, match):
                yield k

    def clear(self):
        self.store.clear()


mock_redis = MockRedis()


# ── Test DB ────────────────────────────────────────────────────────

TEST_DB = os.path.join(os.path.dirname(__file__), "test.db")
engine = create_engine(f"sqlite:///{TEST_DB}", connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


# ── Sample data ────────────────────────────────────────────────────

def make_sample_tickets() -> list[dict]:
    """生成测试用票务数据"""
    now = datetime.now()
    return [
        {
            "id": 1, "ticket_type": "high_speed", "origin": "北京", "destination": "上海",
            "departure_time": (now + timedelta(hours=1)).isoformat(),
            "arrival_time": (now + timedelta(hours=5)).isoformat(),
            "duration": 240, "price": 553.0, "seat_type": "二等座", "available_seats": 100,
        },
        {
            "id": 2, "ticket_type": "train", "origin": "北京", "destination": "上海",
            "departure_time": (now + timedelta(hours=2)).isoformat(),
            "arrival_time": (now + timedelta(hours=12)).isoformat(),
            "duration": 600, "price": 178.0, "seat_type": "硬座", "available_seats": 200,
        },
        {
            "id": 3, "ticket_type": "flight", "origin": "北京", "destination": "上海",
            "departure_time": (now + timedelta(hours=3)).isoformat(),
            "arrival_time": (now + timedelta(hours=5, minutes=30)).isoformat(),
            "duration": 150, "price": 800.0, "seat_type": "经济舱", "available_seats": 50,
        },
        {
            "id": 4, "ticket_type": "high_speed", "origin": "北京", "destination": "上海",
            "departure_time": (now + timedelta(hours=0, minutes=30)).isoformat(),
            "arrival_time": (now + timedelta(hours=4, minutes=30)).isoformat(),
            "duration": 240, "price": 553.0, "seat_type": "一等座", "available_seats": 0,  # 无票
        },
        {
            "id": 5, "ticket_type": "train", "origin": "北京", "destination": "上海",
            "departure_time": (now + timedelta(hours=20)).isoformat(),  # 超出窗口
            "arrival_time": (now + timedelta(hours=30)).isoformat(),
            "duration": 600, "price": 178.0, "seat_type": "硬座", "available_seats": 100,
        },
    ]


def insert_sample_tickets(db):
    """插入测试票务到数据库"""
    now = datetime.now()
    tickets = [
        Ticket(
            id=1, ticket_type="high_speed", origin="北京", destination="上海",
            departure_time=now + timedelta(hours=1),
            arrival_time=now + timedelta(hours=5),
            duration=240, price=553.0, seat_type="二等座",
            total_seats=100, available_seats=100,
        ),
        Ticket(
            id=2, ticket_type="train", origin="北京", destination="上海",
            departure_time=now + timedelta(hours=2),
            arrival_time=now + timedelta(hours=12),
            duration=600, price=178.0, seat_type="硬座",
            total_seats=200, available_seats=200,
        ),
        Ticket(
            id=3, ticket_type="flight", origin="北京", destination="上海",
            departure_time=now + timedelta(hours=3),
            arrival_time=now + timedelta(hours=5, minutes=30),
            duration=150, price=800.0, seat_type="经济舱",
            total_seats=50, available_seats=50,
        ),
        Ticket(
            id=4, ticket_type="high_speed", origin="北京", destination="上海",
            departure_time=now + timedelta(minutes=30),
            arrival_time=now + timedelta(hours=4, minutes=30),
            duration=240, price=553.0, seat_type="一等座",
            total_seats=100, available_seats=0,  # 无票
        ),
        Ticket(
            id=5, ticket_type="train", origin="北京", destination="上海",
            departure_time=now + timedelta(hours=20),
            arrival_time=now + timedelta(hours=30),
            duration=600, price=178.0, seat_type="硬座",
            total_seats=100, available_seats=100,
        ),
    ]
    db.add_all(tickets)
    db.commit()
