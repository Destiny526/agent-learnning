"""Tests for API endpoints"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

class TestHealthCheck:
    """Test health check endpoint"""

    def test_health_check(self):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert response.json()["service"] == "recommendation-service"

class TestRecommendationTypes:
    """Test recommendation types endpoint"""

    def test_get_available_types(self):
        response = client.get("/api/recommendation/types")
        assert response.status_code == 200
        data = response.json()
        assert "types" in data
        assert "count" in data
        assert len(data["types"]) >= 5

class TestRecommendations:
    """Test recommendation endpoints"""

    def test_get_train_recommendations(self):
        response = client.post(
            "/api/recommendation/train",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15",
                "recommendation_type": "optimal",
                "max_results": 10
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert data[0]["item_type"] == "train"

    def test_get_flight_recommendations(self):
        response = client.post(
            "/api/recommendation/flight",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_hotel_recommendations(self):
        response = client.post(
            "/api/recommendation/hotel",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15",
                "budget_max": 500
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert data[0]["item_type"] == "hotel"

    def test_get_route_recommendations(self):
        response = client.post(
            "/api/recommendation/route",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_invalid_recommender_type(self):
        response = client.post(
            "/api/recommendation/invalid_type",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15"
            }
        )
        assert response.status_code in [400, 422]

    def test_recommendation_with_budget_filter(self):
        response = client.post(
            "/api/recommendation/train",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15",
                "budget_min": 100,
                "budget_max": 300
            }
        )
        assert response.status_code == 200
        data = response.json()
        for item in data:
            assert 100 <= item["price"] <= 300

    def test_recommendation_with_user_id(self):
        response = client.post(
            "/api/recommendation/train",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15",
                "user_id": 123
            }
        )
        assert response.status_code == 200

class TestSearchEndpoint:
    """Test search endpoint"""

    def test_search_train(self):
        response = client.post(
            "/api/recommendation/search/train",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

class TestAllRecommendations:
    """Test all recommendations endpoint"""

    def test_get_all_recommendations(self):
        response = client.post(
            "/api/recommendation/all",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15",
                "recommendation_type": "optimal",
                "max_results": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "train" in data
        assert "high_speed" in data
        assert "flight" in data
        assert "hotel" in data
        assert "route" in data

class TestCompareEndpoint:
    """Test compare endpoint"""

    def test_compare_recommendations(self):
        response = client.post(
            "/api/recommendation/compare",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15",
                "compare_types": ["train", "high_speed", "flight"],
                "max_results": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_compare_with_single_type(self):
        response = client.post(
            "/api/recommendation/compare",
            json={
                "origin": "北京",
                "destination": "上海",
                "departure_date": "2024-01-15",
                "compare_types": ["train"],
                "max_results": 5
            }
        )
        assert response.status_code == 200
