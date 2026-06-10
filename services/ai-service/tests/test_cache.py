"""Tests for cache layer"""
import pytest
from unittest.mock import MagicMock
import redis as redis_lib

from cache import CacheManager, _make_hash


@pytest.fixture
def mock_redis():
    r = MagicMock(spec=redis_lib.Redis)
    r.get.return_value = None
    r.setex.return_value = True
    r.delete.return_value = True
    return r


@pytest.fixture
def cache(mock_redis):
    return CacheManager(client=mock_redis)


class TestMakeHash:
    def test_consistent(self):
        h1 = _make_hash({"a": 1, "b": 2})
        h2 = _make_hash({"b": 2, "a": 1})
        assert h1 == h2

    def test_length(self):
        assert len(_make_hash({"x": 1})) == 8

    def test_different_data(self):
        assert _make_hash({"a": 1}) != _make_hash({"a": 2})


class TestTicketPoolCache:
    def test_miss(self, cache, mock_redis):
        mock_redis.get.return_value = None
        assert cache.get_ticket_pool("A", "B", "2024-01-01") is None

    def test_hit(self, cache, mock_redis):
        mock_redis.get.return_value = '[{"id": 1}]'
        result = cache.get_ticket_pool("A", "B", "2024-01-01")
        assert result == [{"id": 1}]

    def test_empty_marker(self, cache, mock_redis):
        mock_redis.get.return_value = '{"empty": true}'
        assert cache.get_ticket_pool("A", "B", "2024-01-01") == []

    def test_set_normal(self, cache, mock_redis):
        cache.set_ticket_pool("A", "B", "2024-01-01", [{"id": 1}])
        mock_redis.setex.assert_called_once()
        args = mock_redis.setex.call_args
        assert "tickets:A:B:2024-01-01" == args[0][0]

    def test_set_empty(self, cache, mock_redis):
        cache.set_ticket_pool("A", "B", "2024-01-01", [])
        args = mock_redis.setex.call_args
        assert '{"empty": true}' == args[0][2]


class TestRecommendCache:
    def test_miss(self, cache, mock_redis):
        mock_redis.get.return_value = None
        assert cache.get_recommend("A", "B", "2024-01-01", {"x": 1}) is None

    def test_hit(self, cache, mock_redis):
        mock_redis.get.return_value = '{"result": "ok"}'
        result = cache.get_recommend("A", "B", "2024-01-01", {"x": 1})
        assert result == {"result": "ok"}


class TestTicketCache:
    def test_miss(self, cache, mock_redis):
        mock_redis.get.return_value = None
        assert cache.get_ticket(42) is None

    def test_hit(self, cache, mock_redis):
        mock_redis.get.return_value = '{"id": 42}'
        assert cache.get_ticket(42) == {"id": 42}

    def test_set(self, cache, mock_redis):
        cache.set_ticket(42, {"id": 42})
        mock_redis.setex.assert_called_once()
