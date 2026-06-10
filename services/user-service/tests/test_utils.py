"""User Service - Utility function tests (password, JWT)"""
import pytest
from datetime import timedelta, datetime, timezone
from jose import jwt

from deps import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
)
from config import settings


class TestPassword:
    def test_hash_and_verify(self):
        pw = "testpassword123"
        hashed = get_password_hash(pw)
        assert hashed != pw
        assert verify_password(pw, hashed) is True

    def test_wrong_password_fails(self):
        hashed = get_password_hash("correct")
        assert verify_password("wrong", hashed) is False

    def test_different_passwords_different_hashes(self):
        h1 = get_password_hash("password1")
        h2 = get_password_hash("password2")
        assert h1 != h2

    def test_empty_password(self):
        hashed = get_password_hash("")
        assert verify_password("", hashed) is True


class TestAccessToken:
    def test_creates_valid_jwt(self):
        token = create_access_token({"sub": "42"})
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == "42"
        assert "exp" in payload

    def test_custom_expiry(self):
        token = create_access_token({"sub": "1"}, expires_delta=timedelta(minutes=5))
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        diff = (exp - datetime.now(timezone.utc)).total_seconds()
        assert 290 < diff < 310  # ~5 minutes

    def test_expired_token_raises(self):
        token = create_access_token({"sub": "1"}, expires_delta=timedelta(seconds=-1))
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

    def test_custom_claims(self):
        token = create_access_token({"sub": "1", "role": "admin"})
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert payload["role"] == "admin"


class TestRefreshToken:
    def test_creates_valid_jwt(self):
        token = create_refresh_token({"sub": "42"})
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == "42"
        assert "exp" in payload

    def test_expiry_is_refresh_duration(self):
        token = create_refresh_token({"sub": "1"})
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        diff_days = (exp - datetime.now(timezone.utc)).days
        assert diff_days in (settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS - 1, settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
