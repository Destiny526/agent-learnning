"""User Service - Profile tests (get, update, delete)"""
import pytest


class TestGetProfile:
    def test_get_profile_success(self, client, test_user_data, registered_user, auth_headers):
        resp = client.get("/api/user/profile", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == test_user_data["username"]
        assert data["email"] == test_user_data["email"]
        assert data["phone"] == test_user_data["phone"]

    def test_get_profile_without_token(self, client):
        resp = client.get("/api/user/profile")
        assert resp.status_code == 403

    def test_get_profile_invalid_token(self, client):
        resp = client.get("/api/user/profile", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401


class TestUpdateProfile:
    def test_update_username_and_phone(self, client, registered_user, auth_headers):
        resp = client.put("/api/user/profile", headers=auth_headers, json={
            "username": "newname",
            "phone": "13900139000",
        })
        assert resp.status_code == 200
        assert resp.json()["username"] == "newname"
        assert resp.json()["phone"] == "13900139000"

    def test_update_only_username(self, client, registered_user, auth_headers):
        resp = client.put("/api/user/profile", headers=auth_headers, json={
            "username": "updatedname",
        })
        assert resp.status_code == 200
        assert resp.json()["username"] == "updatedname"

    def test_update_only_phone(self, client, registered_user, auth_headers):
        resp = client.put("/api/user/profile", headers=auth_headers, json={
            "phone": "13700137000",
        })
        assert resp.status_code == 200
        assert resp.json()["phone"] == "13700137000"

    def test_update_no_changes(self, client, registered_user, auth_headers):
        resp = client.put("/api/user/profile", headers=auth_headers, json={})
        assert resp.status_code == 200

    def test_update_username_taken(self, client, registered_user, auth_headers):
        client.post("/api/auth/register", json={
            "username": "otheruser",
            "email": "other@example.com",
            "password": "password123",
        })
        resp = client.put("/api/user/profile", headers=auth_headers, json={
            "username": "otheruser",
        })
        assert resp.status_code == 400
        assert resp.json()["detail"] == "Username already taken"

    def test_update_without_token(self, client):
        resp = client.put("/api/user/profile", json={"username": "x"})
        assert resp.status_code == 403


class TestDeleteProfile:
    def test_delete_without_token(self, client):
        resp = client.delete("/api/user/profile")
        assert resp.status_code == 403
