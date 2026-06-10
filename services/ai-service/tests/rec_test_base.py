"""Tests for base recommender"""
import pytest
from recommenders.base import (
    BaseRecommender,
    RecommendationResult,
    SearchCriteria,
    RecommendationType,
    RecommenderType
)

class TestRecommendationResult:
    """Test RecommendationResult dataclass"""

    def test_recommendation_result_creation(self):
        result = RecommendationResult(
            item_id="test_001",
            item_type=RecommenderType.TRAIN,
            title="测试火车票",
            description="北京到上海",
            price=299.5,
            origin="北京",
            destination="上海"
        )
        assert result.item_id == "test_001"
        assert result.item_type == RecommenderType.TRAIN
        assert result.price == 299.5
        assert result.currency == "CNY"

    def test_recommendation_result_to_dict(self):
        result = RecommendationResult(
            item_id="test_002",
            item_type=RecommenderType.FLIGHT,
            title="测试航班",
            description="北京到上海",
            price=800.0,
            origin="北京",
            destination="上海"
        )
        data = result.to_dict()
        assert data["item_id"] == "test_002"
        assert data["item_type"] == "flight"
        assert data["price"] == 800.0
        assert "metadata" in data

class TestSearchCriteria:
    """Test SearchCriteria dataclass"""

    def test_search_criteria_creation(self):
        criteria = SearchCriteria(
            origin="北京",
            destination="上海",
            departure_date="2024-01-15"
        )
        assert criteria.origin == "北京"
        assert criteria.destination == "上海"
        assert criteria.recommendation_type == RecommendationType.OPTIMAL
        assert criteria.max_results == 10

    def test_search_criteria_with_all_params(self):
        criteria = SearchCriteria(
            origin="北京",
            destination="上海",
            departure_date="2024-01-15",
            recommendation_type=RecommendationType.CHEAPEST,
            user_id=123,
            max_results=5,
            budget_min=100,
            budget_max=500,
            preferred_time="09:00"
        )
        assert criteria.recommendation_type == RecommendationType.CHEAPEST
        assert criteria.user_id == 123
        assert criteria.max_results == 5
        assert criteria.budget_min == 100
        assert criteria.budget_max == 500

class TestBaseRecommenderScoring:
    """Test BaseRecommender scoring methods"""

    def test_calculate_price_score_full_range(self):
        class TestRecommender(BaseRecommender):
            async def get_recommendations(self, criteria):
                pass
            async def search(self, criteria):
                pass

        recommender = TestRecommender()
        score = recommender.calculate_price_score(50, 10, 100)
        assert 0 <= score <= 1

    def test_calculate_price_score_same_prices(self):
        class TestRecommender(BaseRecommender):
            async def get_recommendations(self, criteria):
                pass
            async def search(self, criteria):
                pass

        recommender = TestRecommender()
        score = recommender.calculate_price_score(50, 50, 50)
        assert score == 1.0

    def test_calculate_time_score_within_optimal(self):
        class TestRecommender(BaseRecommender):
            async def get_recommendations(self, criteria):
                pass
            async def search(self, criteria):
                pass

        recommender = TestRecommender()
        score = recommender.calculate_time_score(60, 60)
        assert score == 1.0

    def test_calculate_time_score_beyond_optimal(self):
        class TestRecommender(BaseRecommender):
            async def get_recommendations(self, criteria):
                pass
            async def search(self, criteria):
                pass

        recommender = TestRecommender()
        score = recommender.calculate_time_score(120, 60)
        assert 0 <= score < 1

    def test_calculate_comprehensive_score_default_weights(self):
        class TestRecommender(BaseRecommender):
            async def get_recommendations(self, criteria):
                pass
            async def search(self, criteria):
                pass

        recommender = TestRecommender()
        score = recommender.calculate_comprehensive_score(0.8, 0.9, 1.0, 0.7)
        assert 0 <= score <= 1
        assert isinstance(score, float)

    def test_calculate_comprehensive_score_custom_weights(self):
        class TestRecommender(BaseRecommender):
            async def get_recommendations(self, criteria):
                pass
            async def search(self, criteria):
                pass

        recommender = TestRecommender()
        weights = {"price": 0.5, "time": 0.5, "availability": 0.0, "preference": 0.0}
        score = recommender.calculate_comprehensive_score(
            0.8, 0.9, 1.0, 0.7, weights
        )
        expected = 0.5 * 0.8 + 0.5 * 0.9
        assert abs(score - expected) < 0.0001

    def test_sort_by_cheapest(self):
        class TestRecommender(BaseRecommender):
            async def get_recommendations(self, criteria):
                pass
            async def search(self, criteria):
                pass

        recommender = TestRecommender()
        results = [
            RecommendationResult("1", RecommenderType.TRAIN, "A", "", 300, "B", "C"),
            RecommendationResult("2", RecommenderType.TRAIN, "B", "", 100, "B", "C"),
            RecommendationResult("3", RecommenderType.TRAIN, "C", "", 200, "B", "C"),
        ]
        sorted_results = recommender.sort_by_recommendation_type(
            results, RecommendationType.CHEAPEST
        )
        assert sorted_results[0].price == 100
        assert sorted_results[1].price == 200
        assert sorted_results[2].price == 300

    def test_sort_by_fastest(self):
        class TestRecommender(BaseRecommender):
            async def get_recommendations(self, criteria):
                pass
            async def search(self, criteria):
                pass

        recommender = TestRecommender()
        results = [
            RecommendationResult("1", RecommenderType.TRAIN, "A", "", 300, "B", "C", duration_minutes=120),
            RecommendationResult("2", RecommenderType.TRAIN, "B", "", 100, "B", "C", duration_minutes=60),
            RecommendationResult("3", RecommenderType.TRAIN, "C", "", 200, "B", "C", duration_minutes=90),
        ]
        sorted_results = recommender.sort_by_recommendation_type(
            results, RecommendationType.FASTEST
        )
        assert sorted_results[0].duration_minutes == 60
        assert sorted_results[1].duration_minutes == 90
        assert sorted_results[2].duration_minutes == 120
