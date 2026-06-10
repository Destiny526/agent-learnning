"""Tests for scoring engine"""
import pytest
from datetime import datetime, timedelta

from engine.scorer import Scorer, ScoreBreakdown, ScoredCandidate


@pytest.fixture
def scorer():
    return Scorer()


@pytest.fixture
def now():
    return datetime.now()


class TestScoreTime:
    def test_exact_match(self, scorer, now):
        assert scorer.score_time(now, now) == 1.0

    def test_30_min_diff(self, scorer, now):
        score = scorer.score_time(now + timedelta(minutes=30), now)
        assert abs(score - 0.9167) < 0.01

    def test_1_hour_diff(self, scorer, now):
        score = scorer.score_time(now + timedelta(hours=1), now)
        assert abs(score - 0.8333) < 0.01

    def test_3_hour_diff(self, scorer, now):
        score = scorer.score_time(now + timedelta(hours=3), now)
        assert abs(score - 0.5) < 0.01

    def test_6_hour_diff(self, scorer, now):
        assert scorer.score_time(now + timedelta(hours=6), now) == 0.0

    def test_beyond_window(self, scorer, now):
        assert scorer.score_time(now + timedelta(hours=10), now) == 0.0


class TestScorePrice:
    def test_min_price(self, scorer):
        assert scorer.score_price(100, 100, 500) == 1.0

    def test_max_price(self, scorer):
        assert scorer.score_price(500, 100, 500) == 0.0

    def test_mid_price(self, scorer):
        assert scorer.score_price(300, 100, 500) == 0.5

    def test_same_price(self, scorer):
        assert scorer.score_price(100, 100, 100) == 1.0


class TestScoreDuration:
    def test_min_duration(self, scorer):
        assert scorer.score_duration(60, 60, 300) == 1.0

    def test_max_duration(self, scorer):
        assert scorer.score_duration(300, 60, 300) == 0.0

    def test_same_duration(self, scorer):
        assert scorer.score_duration(100, 100, 100) == 1.0


class TestScoreComfort:
    def test_flight(self, scorer):
        assert scorer.score_comfort("flight") == 1.0

    def test_high_speed(self, scorer):
        assert scorer.score_comfort("high_speed") == 0.7

    def test_train(self, scorer):
        assert scorer.score_comfort("train") == 0.3

    def test_unknown_type(self, scorer):
        assert scorer.score_comfort("unknown") == 0.5


class TestScoreAll:
    def test_empty_candidates(self, scorer, now):
        assert scorer.score_all([], now) == []

    def test_score_ordering(self, scorer, now):
        """评分后应按总分降序排列"""
        candidates = [
            {
                "id": 1, "ticket_type": "train", "origin": "A", "destination": "B",
                "departure_time": (now + timedelta(hours=5)).isoformat(),
                "arrival_time": (now + timedelta(hours=10)).isoformat(),
                "duration": 300, "price": 200.0, "seat_type": "硬座", "available_seats": 10,
            },
            {
                "id": 2, "ticket_type": "high_speed", "origin": "A", "destination": "B",
                "departure_time": (now + timedelta(minutes=10)).isoformat(),
                "arrival_time": (now + timedelta(hours=4)).isoformat(),
                "duration": 230, "price": 200.0, "seat_type": "二等座", "available_seats": 10,
            },
        ]
        scored = scorer.score_all(candidates, now)
        assert len(scored) == 2
        # 高铁更近+更快+更舒适 → 分更高
        assert scored[0].ticket_id == 2
        assert scored[0].score.total >= scored[1].score.total

    def test_score_range(self, scorer, now):
        """评分应在 0~1 之间"""
        candidates = [
            {
                "id": i, "ticket_type": "train", "origin": "A", "destination": "B",
                "departure_time": (now + timedelta(hours=i)).isoformat(),
                "arrival_time": (now + timedelta(hours=i + 3)).isoformat(),
                "duration": 180, "price": 100 + i * 50, "seat_type": "硬座", "available_seats": 10,
            }
            for i in range(1, 6)
        ]
        scored = scorer.score_all(candidates, now)
        for s in scored:
            assert 0 <= s.score.total <= 1


class TestScoreBreakdown:
    def test_to_dict(self):
        b = ScoreBreakdown(s_time=0.9, s_price=0.8, s_duration=0.7, s_comfort=1.0, total=0.85)
        d = b.to_dict()
        assert d["s_time"] == 0.9
        assert d["total"] == 0.85
