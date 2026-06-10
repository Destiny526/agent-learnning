"""Recommendation engine - main entry point"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from config import settings
from cache import CacheManager
from models.recommend_log import RecommendLog
from .provider import DataProvider
from .filter import CandidateFilter
from .scorer import Scorer, ScoredCandidate


class RecommendResult:
    """推荐结果容器"""

    def __init__(
        self,
        best: Optional[ScoredCandidate],
        cheapest: Optional[ScoredCandidate],
        fastest: Optional[ScoredCandidate],
        closest_time: Optional[ScoredCandidate],
        all_options: list[ScoredCandidate],
        total_candidates: int,
        filtered_candidates: int,
    ):
        self.best = best
        self.cheapest = cheapest
        self.fastest = fastest
        self.closest_time = closest_time
        self.all_options = all_options
        self.total_candidates = total_candidates
        self.filtered_candidates = filtered_candidates

    def to_dict(self) -> dict:
        return {
            "best_option": self.best.to_dict() if self.best else None,
            "cheapest_option": self.cheapest.to_dict() if self.cheapest else None,
            "fastest_option": self.fastest.to_dict() if self.fastest else None,
            "closest_time_option": self.closest_time.to_dict() if self.closest_time else None,
            "all_options": [o.to_dict() for o in self.all_options],
            "total_candidates": self.total_candidates,
            "filtered_candidates": self.filtered_candidates,
        }


class Recommender:
    """
    推荐器主类
    组合 DataProvider + CandidateFilter + Scorer
    """

    def __init__(
        self,
        db: Session,
        cache: CacheManager = None,
        scorer: Scorer = None,
        candidate_filter: CandidateFilter = None,
    ):
        self.db = db
        self.cache = cache or CacheManager()
        self.scorer = scorer or Scorer()
        self.candidate_filter = candidate_filter or CandidateFilter()
        self.provider = DataProvider(db, self.cache)

    def recommend(
        self,
        origin: str,
        destination: str,
        expected_time: datetime,
        budget_max: Optional[float] = None,
        user_id: Optional[int] = None,
    ) -> RecommendResult:
        """
        执行推荐：
        1. 查缓存 → 2. 查 DB → 3. 过滤 → 4. 评分 → 5. 提取各维度最优 → 6. 写日志
        """
        # 尝试缓存
        params = {
            "expected_time": str(expected_time),
            "budget_max": budget_max,
        }
        cached = self.cache.get_recommend(origin, destination, expected_time.strftime("%Y-%m-%d"), params)
        if cached:
            return self._from_cache(cached)

        # 获取候选
        raw_candidates = self.provider.get_candidates(origin, destination, expected_time)
        total_count = len(raw_candidates)

        # 预过滤
        filtered = self.candidate_filter.filter(raw_candidates, expected_time, budget_max)
        filtered_count = len(filtered)

        if not filtered:
            result = RecommendResult(
                best=None, cheapest=None, fastest=None, closest_time=None,
                all_options=[], total_candidates=total_count, filtered_candidates=0,
            )
            self._save_log(origin, destination, expected_time, budget_max, user_id, result)
            return result

        # 评分
        scored = self.scorer.score_all(filtered, expected_time)

        # 提取各维度最优
        cheapest = min(scored, key=lambda x: x.price)
        fastest = min(scored, key=lambda x: x.duration)
        closest_time = min(scored, key=lambda x: abs((x.departure_time - expected_time).total_seconds()))
        best = scored[0]  # 已按总分降序

        result = RecommendResult(
            best=best, cheapest=cheapest, fastest=fastest, closest_time=closest_time,
            all_options=scored, total_candidates=total_count, filtered_candidates=filtered_count,
        )

        # 写缓存
        self.cache.set_recommend(
            origin, destination, expected_time.strftime("%Y-%m-%d"),
            params, result.to_dict(),
        )

        # 写日志
        self._save_log(origin, destination, expected_time, budget_max, user_id, result)

        return result

    def _save_log(self, origin, destination, expected_time, budget_max, user_id, result):
        """异步写推荐日志"""
        try:
            log = RecommendLog(
                user_id=user_id,
                query_data=json.dumps({
                    "origin": origin,
                    "destination": destination,
                    "expected_time": str(expected_time),
                    "budget_max": budget_max,
                }),
                result_data=json.dumps({
                    "total_candidates": result.total_candidates,
                    "filtered_candidates": result.filtered_candidates,
                    "top_5": [
                        {"ticket_id": o.ticket_id, "score": round(o.score.total, 4), "type": o.ticket_type}
                        for o in result.all_options[:5]
                    ],
                }),
            )
            self.db.add(log)
            self.db.commit()
        except Exception:
            self.db.rollback()

    @staticmethod
    def _from_cache(data: dict) -> RecommendResult:
        """从缓存恢复 RecommendResult（简化版，不恢复完整 ScoredCandidate）"""
        return RecommendResult(
            best=None, cheapest=None, fastest=None, closest_time=None,
            all_options=[], total_candidates=data.get("total_candidates", 0),
            filtered_candidates=data.get("filtered_candidates", 0),
        )
