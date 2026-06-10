"""Tests for recommender (integration)"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock

from engine.recommender import Recommender, RecommendResult
from engine.scorer import Scorer
from engine.filter import CandidateFilter
from cache import CacheManager


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def mock_cache():
    """返回一个不做任何事的 cache mock"""
    c = MagicMock(spec=CacheManager)
    c.get_recommend.return_value = None
    c.get_ticket_pool.return_value = None
    return c


@pytest.fixture
def now():
    return datetime.now()


def _sample_candidates(now):
    return [
        {
            "id": 1, "ticket_type": "high_speed", "origin": "北京", "destination": "上海",
            "departure_time": (now + timedelta(hours=1)).isoformat(),
            "arrival_time": (now + timedelta(hours=5)).isoformat(),
            "duration": 240, "price": 553.0, "seat_type": "二等座", "available_seats": 100,
        },
        {
            "id": 2, "ticket_type": "train", "origin": "北京", "destination": "上海",
            "departure_time": (now + timedelta(hours=2)).isoformat(),
            "arrival_time": (now + timedelta(hours=12)).isoformat(),
            "duration": 600, "price": 178.0, "seat_type": "硬座", "available_seats": 200,
        },
        {
            "id": 3, "ticket_type": "flight", "origin": "北京", "destination": "上海",
            "departure_time": (now + timedelta(hours=3)).isoformat(),
            "arrival_time": (now + timedelta(hours=5, minutes=30)).isoformat(),
            "duration": 150, "price": 800.0, "seat_type": "经济舱", "available_seats": 50,
        },
    ]


class TestRecommender:
    def test_recommend_returns_all_fields(self, mock_db, mock_cache, now):
        """推荐结果应包含所有必要字段"""
        candidates = _sample_candidates(now)
        mock_cache.get_recommend.return_value = None
        mock_cache.get_ticket_pool.return_value = candidates

        rec = Recommender(db=mock_db, cache=mock_cache)
        # 直接 mock provider
        rec.provider = MagicMock()
        rec.provider.get_candidates.return_value = candidates

        result = rec.recommend("北京", "上海", now)

        assert isinstance(result, RecommendResult)
        assert result.best is not None
        assert result.cheapest is not None
        assert result.fastest is not None
        assert result.closest_time is not None
        assert result.filtered_candidates == 3

    def test_recommend_best_is_highest_scored(self, mock_db, mock_cache, now):
        """best 应该是总分最高的"""
        candidates = _sample_candidates(now)
        rec = Recommender(db=mock_db, cache=mock_cache)
        rec.provider = MagicMock()
        rec.provider.get_candidates.return_value = candidates

        result = rec.recommend("北京", "上海", now)
        assert result.best.ticket_id == result.all_options[0].ticket_id

    def test_recommend_cheapest(self, mock_db, mock_cache, now):
        """cheapest 应该是价格最低的"""
        candidates = _sample_candidates(now)
        rec = Recommender(db=mock_db, cache=mock_cache)
        rec.provider = MagicMock()
        rec.provider.get_candidates.return_value = candidates

        result = rec.recommend("北京", "上海", now)
        assert result.cheapest.price == 178.0

    def test_recommend_fastest(self, mock_db, mock_cache, now):
        """fastest 应该是耗时最短的"""
        candidates = _sample_candidates(now)
        rec = Recommender(db=mock_db, cache=mock_cache)
        rec.provider = MagicMock()
        rec.provider.get_candidates.return_value = candidates

        result = rec.recommend("北京", "上海", now)
        assert result.fastest.duration == 150

    def test_empty_candidates(self, mock_db, mock_cache, now):
        """无候选时应返回空结果"""
        rec = Recommender(db=mock_db, cache=mock_cache)
        rec.provider = MagicMock()
        rec.provider.get_candidates.return_value = []

        result = rec.recommend("北京", "上海", now)
        assert result.best is None
        assert result.filtered_candidates == 0
        assert result.all_options == []

    def test_budget_filter(self, mock_db, mock_cache, now):
        """预算过滤应生效"""
        candidates = _sample_candidates(now)
        rec = Recommender(db=mock_db, cache=mock_cache)
        rec.provider = MagicMock()
        rec.provider.get_candidates.return_value = candidates

        result = rec.recommend("北京", "上海", now, budget_max=600)
        # 只有 553 和 178 通过
        assert result.filtered_candidates == 2
        for opt in result.all_options:
            assert opt.price <= 600

    def test_result_to_dict(self, mock_db, mock_cache, now):
        """to_dict 应返回完整字典"""
        candidates = _sample_candidates(now)
        rec = Recommender(db=mock_db, cache=mock_cache)
        rec.provider = MagicMock()
        rec.provider.get_candidates.return_value = candidates

        result = rec.recommend("北京", "上海", now)
        d = result.to_dict()
        assert "best_option" in d
        assert "cheapest_option" in d
        assert "all_options" in d
        assert d["total_candidates"] == 3
