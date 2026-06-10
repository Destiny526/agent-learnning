"""Tests for candidate filter"""
import pytest
from datetime import datetime, timedelta

from engine.filter import CandidateFilter


@pytest.fixture
def flt():
    return CandidateFilter()


@pytest.fixture
def now():
    return datetime.now()


def _make_candidate(id, price, seats, hours_offset, **extra):
    now = datetime.now()
    return {
        "id": id,
        "ticket_type": "train",
        "origin": "A",
        "destination": "B",
        "departure_time": (now + timedelta(hours=hours_offset)).isoformat(),
        "arrival_time": (now + timedelta(hours=hours_offset + 3)).isoformat(),
        "duration": 180,
        "price": price,
        "available_seats": seats,
        **extra,
    }


class TestCandidateFilter:
    def test_filters_zero_seats(self, flt, now):
        candidates = [_make_candidate(1, 100, 0, 1), _make_candidate(2, 100, 10, 1)]
        result = flt.filter(candidates, now)
        assert len(result) == 1
        assert result[0]["id"] == 2

    def test_filters_over_budget(self, flt, now):
        candidates = [_make_candidate(1, 100, 10, 1), _make_candidate(2, 500, 10, 1)]
        result = flt.filter(candidates, now, budget_max=200)
        assert len(result) == 1
        assert result[0]["id"] == 1

    def test_filters_outside_time_window(self, flt, now):
        candidates = [_make_candidate(1, 100, 10, 1), _make_candidate(2, 100, 10, 20)]
        result = flt.filter(candidates, now)
        assert len(result) == 1
        assert result[0]["id"] == 1

    def test_keeps_valid_candidates(self, flt, now):
        candidates = [_make_candidate(1, 100, 10, 2), _make_candidate(2, 200, 5, 3)]
        result = flt.filter(candidates, now, budget_max=300)
        assert len(result) == 2

    def test_empty_input(self, flt, now):
        assert flt.filter([], now) == []

    def test_all_filtered_out(self, flt, now):
        candidates = [_make_candidate(1, 100, 0, 20)]
        result = flt.filter(candidates, now, budget_max=50)
        assert len(result) == 0

    def test_budget_none_ignores(self, flt, now):
        """budget_max=None 时不过滤价格"""
        candidates = [_make_candidate(1, 9999, 10, 1)]
        result = flt.filter(candidates, now, budget_max=None)
        assert len(result) == 1
