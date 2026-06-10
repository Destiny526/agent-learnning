"""Tests for ticket recommenders"""
import pytest
from recommenders.base import SearchCriteria, RecommendationType, RecommenderType

class TestTrainRecommender:
    """Test TrainTicketRecommender"""

    @pytest.mark.asyncio
    async def test_train_recommender_get_recommendations(self, train_recommender, search_criteria):
        results = await train_recommender.get_recommendations(search_criteria)
        assert len(results) <= search_criteria.max_results
        for result in results:
            assert result.item_type == RecommenderType.TRAIN
            assert result.origin == search_criteria.origin
            assert result.destination == search_criteria.destination

    @pytest.mark.asyncio
    async def test_train_recommender_search(self, train_recommender, search_criteria):
        results = await train_recommender.search(search_criteria)
        assert isinstance(results, list)
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_train_recommender_budget_filter(self, train_recommender):
        criteria = SearchCriteria(
            origin="北京",
            destination="上海",
            departure_date="2024-01-15",
            budget_min=100,
            budget_max=200
        )
        results = await train_recommender.search(criteria)
        for result in results:
            assert result.price >= 100
            assert result.price <= 200

    @pytest.mark.asyncio
    async def test_train_recommender_sort_cheapest(self, train_recommender):
        criteria = SearchCriteria(
            origin="北京",
            destination="上海",
            departure_date="2024-01-15",
            recommendation_type=RecommendationType.CHEAPEST
        )
        results = await train_recommender.get_recommendations(criteria)
        if len(results) > 1:
            for i in range(len(results) - 1):
                assert results[i].price <= results[i + 1].price

class TestHighSpeedRecommender:
    """Test HighSpeedRecommender"""

    @pytest.mark.asyncio
    async def test_high_speed_get_recommendations(self, high_speed_recommender, search_criteria):
        results = await high_speed_recommender.get_recommendations(search_criteria)
        assert len(results) <= search_criteria.max_results
        for result in results:
            assert result.item_type == RecommenderType.HIGH_SPEED

    @pytest.mark.asyncio
    async def test_high_speed_search(self, high_speed_recommender, search_criteria):
        results = await high_speed_recommender.search(search_criteria)
        assert isinstance(results, list)
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_high_speed_all_have_score(self, high_speed_recommender, search_criteria):
        results = await high_speed_recommender.search(search_criteria)
        for result in results:
            assert 0 <= result.score <= 1

class TestFlightRecommender:
    """Test FlightRecommender"""

    @pytest.mark.asyncio
    async def test_flight_get_recommendations(self, flight_recommender, search_criteria):
        results = await flight_recommender.get_recommendations(search_criteria)
        assert len(results) <= search_criteria.max_results
        for result in results:
            assert result.item_type == RecommenderType.FLIGHT

    @pytest.mark.asyncio
    async def test_flight_search(self, flight_recommender, search_criteria):
        results = await flight_recommender.search(search_criteria)
        assert isinstance(results, list)
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_flight_metadata_airline(self, flight_recommender, search_criteria):
        results = await flight_recommender.search(search_criteria)
        for result in results:
            if result.metadata:
                assert "airline" in result.metadata or "flight_no" in result.metadata

    @pytest.mark.asyncio
    async def test_flight_sort_fastest(self, flight_recommender):
        criteria = SearchCriteria(
            origin="北京",
            destination="上海",
            departure_date="2024-01-15",
            recommendation_type=RecommendationType.FASTEST
        )
        results = await flight_recommender.get_recommendations(criteria)
        if len(results) > 1:
            for i in range(len(results) - 1):
                assert results[i].duration_minutes <= results[i + 1].duration_minutes
