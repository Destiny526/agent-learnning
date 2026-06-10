"""User Service - Auth tests (register, login, refresh, logout)"""
import pytest


class TestHealthCheck:
    def test_health_check(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
        assert resp.json()["service"] == "user-service"


class TestRegister:
    def test_register_success(self, client, test_user_data, registered_user):
        """registered_user 已验证注册成功"""
        assert registered_user["username"] == test_user_data["username"]
        assert registered_user["email"] == test_user_data["email"]
        assert registered_user["phone"] == test_user_data["phone"]
        assert "id" in registered_user
        assert "created_at" in registered_user

    def test_register_duplicate_email(self, client, test_user_data, registered_user):
        resp = client.post("/api/auth/register", json=test_user_data)
        assert resp.status_code == 400
        assert resp.json()["detail"] == "Email already registered"

    def test_register_duplicate_username(self, client, registered_user):
        resp = client.post("/api/auth/register", json={
            "username": "testuser",
            "email": "another@example.com",
            "password": "password123",
        })
        assert resp.status_code == 400
        assert resp.json()["detail"] == "Username already taken"

    def test_register_invalid_email(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "baduser",
            "email": "not-an-email",
            "password": "password123",
        })
        assert resp.status_code == 422

    def test_register_missing_password(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "nopass",
            "email": "nopass@example.com",
        })
        assert resp.status_code == 422

    def test_register_without_phone(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "nophone",
            "email": "nophone@example.com",
            "password": "password123",
        })
        assert resp.status_code == 200
        assert resp.json()["user"]["phone"] is None


class TestLogin:
    def test_login_success(self, client, test_user_data, registered_user, tokens):
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"

    def test_login_wrong_email(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123",
        })
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

    def test_login_wrong_password(self, client, test_user_data, registered_user):
        resp = client.post("/api/auth/login", json={
            "email": test_user_data["email"],
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post("/api/auth/login", json={"email": "test@example.com"})
        assert resp.status_code == 422


class TestRefreshToken:
    def test_refresh_success(self, client, registered_user, tokens):
        resp = client.post("/api/auth/refresh", json={
            "refresh_token": tokens["refresh_token"],
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()
        assert resp.json()["token_type"] == "bearer"

    def test_refresh_invalid_token(self, client):
        resp = client.post("/api/auth/refresh", json={
            "refresh_token": "invalid.token.here",
        })
        assert resp.status_code == 401

    def test_refresh_mismatched_token(self, client, registered_user, tokens):
        resp = client.post("/api/auth/refresh", json={
            "refresh_token": tokens["refresh_token"] + "tampered",
        })
        assert resp.status_code == 401


class TestLogout:
    def test_logout_success(self, client, registered_user, auth_headers):
        resp = client.post("/api/auth/logout", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["message"] == "Logged out successfully"

    def test_logout_without_token(self, client):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 403
