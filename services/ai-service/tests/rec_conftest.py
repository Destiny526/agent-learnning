"""Pytest configuration and fixtures"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@pytest.fixture
def search_criteria():
    """Default search criteria for testing"""
    from recommenders.base import SearchCriteria, RecommendationType

    return SearchCriteria(
        origin="北京",
        destination="上海",
        departure_date="2024-01-15",
        recommendation_type=RecommendationType.OPTIMAL,
        max_results=10
    )

@pytest.fixture
def train_recommender():
    """Train ticket recommender instance"""
    from recommenders.train import TrainTicketRecommender
    return TrainTicketRecommender()

@pytest.fixture
def high_speed_recommender():
    """High-speed train recommender instance"""
    from recommenders.high_speed import HighSpeedRecommender
    return HighSpeedRecommender()

@pytest.fixture
def flight_recommender():
    """Flight recommender instance"""
    from recommenders.flight import FlightRecommender
    return FlightRecommender()

@pytest.fixture
def hotel_recommender():
    """Hotel recommender instance"""
    from recommenders.hotel import HotelRecommender
    return HotelRecommender()

@pytest.fixture
def route_recommender():
    """Route recommender instance"""
    from recommenders.route import RouteRecommender
    return RouteRecommender()

@pytest.fixture
def recommendation_engine():
    """Recommendation engine instance"""
    from engine import RecommendationEngine
    return RecommendationEngine()
