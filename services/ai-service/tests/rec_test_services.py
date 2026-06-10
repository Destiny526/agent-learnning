"""Tests for hotel and route recommenders"""
import pytest
from recommenders.base import SearchCriteria, RecommendationType, RecommenderType

class TestHotelRecommender:
    """Test HotelRecommender"""

    @pytest.mark.asyncio
    async def test_hotel_get_recommendations(self, hotel_recommender, search_criteria):
        results = await hotel_recommender.get_recommendations(search_criteria)
        assert len(results) <= search_criteria.max_results
        for result in results:
            assert result.item_type == RecommenderType.HOTEL

    @pytest.mark.asyncio
    async def test_hotel_search(self, hotel_recommender, search_criteria):
        results = await hotel_recommender.search(search_criteria)
        assert isinstance(results, list)
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_hotel_metadata_fields(self, hotel_recommender, search_criteria):
        results = await hotel_recommender.search(search_criteria)
        for result in results:
            if result.metadata:
                assert "room_type" in result.metadata or "location" in result.metadata
                assert "rating" in result.metadata

    @pytest.mark.asyncio
    async def test_hotel_budget_filter(self, hotel_recommender):
        criteria = SearchCriteria(
            origin="北京",
            destination="上海",
            departure_date="2024-01-15",
            budget_max=400
        )
        results = await hotel_recommender.search(criteria)
        for result in results:
            assert result.price <= 400

    @pytest.mark.asyncio
    async def test_hotel_has_description(self, hotel_recommender, search_criteria):
        results = await hotel_recommender.search(search_criteria)
        for result in results:
            assert result.description
            assert len(result.description) > 0

class TestRouteRecommender:
    """Test RouteRecommender"""

    @pytest.mark.asyncio
    async def test_route_get_recommendations(self, route_recommender, search_criteria):
        results = await route_recommender.get_recommendations(search_criteria)
        assert len(results) <= search_criteria.max_results
        for result in results:
            assert result.item_type == RecommenderType.ROUTE

    @pytest.mark.asyncio
    async def test_route_search(self, route_recommender, search_criteria):
        results = await route_recommender.search(search_criteria)
        assert isinstance(results, list)
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_route_metadata_highlights(self, route_recommender, search_criteria):
        results = await route_recommender.search(search_criteria)
        for result in results:
            if result.metadata:
                assert "highlights" in result.metadata
                assert isinstance(result.metadata["highlights"], list)

    @pytest.mark.asyncio
    async def test_route_metadata_duration(self, route_recommender, search_criteria):
        results = await route_recommender.search(search_criteria)
        for result in results:
            if result.metadata:
                assert "duration_days" in result.metadata

    @pytest.mark.asyncio
    async def test_route_availability(self, route_recommender, search_criteria):
        results = await route_recommender.search(search_criteria)
        for result in results:
            assert result.availability is True
