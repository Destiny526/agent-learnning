"""Tests for recommendation engine"""
import pytest
from engine import RecommendationEngine
from recommenders.base import SearchCriteria, RecommendationType, RecommenderType

class TestRecommendationEngine:
    """Test RecommendationEngine"""

    def test_engine_initialization(self, recommendation_engine):
        assert recommendation_engine is not None
        types = recommendation_engine.get_available_types()
        assert len(types) >= 5
        assert RecommenderType.TRAIN in types
        assert RecommenderType.HIGH_SPEED in types
        assert RecommenderType.FLIGHT in types
        assert RecommenderType.HOTEL in types
        assert RecommenderType.ROUTE in types

    def test_get_recommender_train(self, recommendation_engine):
        recommender = recommendation_engine.get_recommender(RecommenderType.TRAIN)
        assert recommender is not None
        assert recommender.recommender_type == RecommenderType.TRAIN

    def test_get_recommender_high_speed(self, recommendation_engine):
        recommender = recommendation_engine.get_recommender(RecommenderType.HIGH_SPEED)
        assert recommender is not None
        assert recommender.recommender_type == RecommenderType.HIGH_SPEED

    def test_get_recommender_flight(self, recommendation_engine):
        recommender = recommendation_engine.get_recommender(RecommenderType.FLIGHT)
        assert recommender is not None
        assert recommender.recommender_type == RecommenderType.FLIGHT

    def test_get_recommender_hotel(self, recommendation_engine):
        recommender = recommendation_engine.get_recommender(RecommenderType.HOTEL)
        assert recommender is not None
        assert recommender.recommender_type == RecommenderType.HOTEL

    def test_get_recommender_route(self, recommendation_engine):
        recommender = recommendation_engine.get_recommender(RecommenderType.ROUTE)
        assert recommender is not None
        assert recommender.recommender_type == RecommenderType.ROUTE

    def test_get_recommender_invalid_type(self, recommendation_engine):
        with pytest.raises(ValueError):
            recommendation_engine.get_recommender("invalid_type")

    def test_is_type_available(self, recommendation_engine):
        assert recommendation_engine.is_type_available(RecommenderType.TRAIN) is True
        assert recommendation_engine.is_type_available(RecommenderType.FLIGHT) is True

    @pytest.mark.asyncio
    async def test_recommend_train(self, recommendation_engine, search_criteria):
        results = await recommendation_engine.recommend(RecommenderType.TRAIN, search_criteria)
        assert isinstance(results, list)
        assert len(results) > 0
        assert len(results) <= search_criteria.max_results

    @pytest.mark.asyncio
    async def test_recommend_flight(self, recommendation_engine, search_criteria):
        results = await recommendation_engine.recommend(RecommenderType.FLIGHT, search_criteria)
        assert isinstance(results, list)
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_search_train(self, recommendation_engine, search_criteria):
        results = await recommendation_engine.search(RecommenderType.TRAIN, search_criteria)
        assert isinstance(results, list)
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_recommend_all(self, recommendation_engine, search_criteria):
        results = await recommendation_engine.recommend_all(search_criteria)
        assert isinstance(results, dict)
        assert RecommenderType.TRAIN in results
        assert RecommenderType.HIGH_SPEED in results
        assert RecommenderType.FLIGHT in results
        assert RecommenderType.HOTEL in results
        assert RecommenderType.ROUTE in results

    @pytest.mark.asyncio
    async def test_recommend_all_with_exclude(self, recommendation_engine, search_criteria):
        results = await recommendation_engine.recommend_all(
            search_criteria,
            exclude_types=[RecommenderType.FLIGHT, RecommenderType.HOTEL]
        )
        assert RecommenderType.FLIGHT not in results
        assert RecommenderType.HOTEL not in results
        assert RecommenderType.TRAIN in results

    @pytest.mark.asyncio
    async def test_compare(self, recommendation_engine, search_criteria):
        results = await recommendation_engine.compare(
            search_criteria,
            compare_types=[RecommenderType.TRAIN, RecommenderType.HIGH_SPEED, RecommenderType.FLIGHT]
        )
        assert isinstance(results, list)
        if len(results) > 1:
            for i in range(len(results) - 1):
                assert results[i].score >= results[i + 1].score

    @pytest.mark.asyncio
    async def test_compare_empty_types(self, recommendation_engine, search_criteria):
        results = await recommendation_engine.compare(
            search_criteria,
            compare_types=[]
        )
        assert isinstance(results, list)
        assert len(results) >= 0
