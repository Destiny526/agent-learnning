"""User Service - Test fixtures"""
import pytest
import os
import sys

# 环境变量必须在 import 业务模块之前设置
os.environ["JWT_SECRET_KEY"] = "test_secret_key_123"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["JWT_REFRESH_TOKEN_EXPIRE_DAYS"] = "7"
os.environ["REDIS_HOST"] = "localhost"
os.environ["REDIS_PORT"] = "6379"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
import deps


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

    def clear(self):
        self.store.clear()


mock_redis = MockRedis()
deps.redis_client = mock_redis


# ── 测试数据库 ─────────────────────────────────────────────────────

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test.db")
engine = create_engine(f"sqlite:///{TEST_DB_PATH}", connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


# import app AFTER env setup
from main import app  # noqa: E402
app.dependency_overrides[get_db] = override_get_db


# ── Module-scoped fixtures ─────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """整个 test module 共享的 TestClient"""
    Base.metadata.create_all(bind=engine)
    mock_redis.clear()
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    try:
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)
    except PermissionError:
        pass


@pytest.fixture(scope="module")
def test_user_data():
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123",
        "phone": "13800138000",
    }


@pytest.fixture(scope="module")
def registered_user(client, test_user_data):
    """注册一个用户，module 内复用"""
    resp = client.post("/api/auth/register", json=test_user_data)
    assert resp.status_code == 200
    return resp.json()["user"]


@pytest.fixture(scope="module")
def tokens(client, test_user_data, registered_user):
    """登录获取 tokens，module 内复用"""
    resp = client.post("/api/auth/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"],
    })
    assert resp.status_code == 200
    return resp.json()


@pytest.fixture(scope="module")
def auth_headers(tokens):
    """带 Bearer token 的 headers"""
    return {"Authorization": f"Bearer {tokens['access_token']}"}
