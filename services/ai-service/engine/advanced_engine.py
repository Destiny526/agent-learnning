"""Recommendation engine service"""
import asyncio
from typing import List, Dict, Optional
from recommenders.base import (
    BaseRecommender,
    RecommendationResult,
    SearchCriteria,
    RecommendationType,
    RecommenderType
)
from recommenders.train import TrainTicketRecommender
from recommenders.high_speed import HighSpeedRecommender
from recommenders.flight import FlightRecommender
from recommenders.hotel import HotelRecommender
from recommenders.route import RouteRecommender

class RecommendationEngine:
    """推荐引擎核心服务"""

    def __init__(self):
        self._recommenders: Dict[RecommenderType, BaseRecommender] = {
            RecommenderType.TRAIN: TrainTicketRecommender(),
            RecommenderType.HIGH_SPEED: HighSpeedRecommender(),
            RecommenderType.FLIGHT: FlightRecommender(),
            RecommenderType.HOTEL: HotelRecommender(),
            RecommenderType.ROUTE: RouteRecommender(),
        }

    def get_recommender(self, recommender_type: RecommenderType) -> BaseRecommender:
        """获取指定类型的推荐器"""
        recommender = self._recommenders.get(recommender_type)
        if not recommender:
            raise ValueError(f"Unknown recommender type: {recommender_type}")
        return recommender

    async def recommend(
        self,
        recommender_type: RecommenderType,
        criteria: SearchCriteria
    ) -> List[RecommendationResult]:
        """获取推荐结果"""
        recommender = self.get_recommender(recommender_type)
        return await recommender.get_recommendations(criteria)

    async def search(
        self,
        recommender_type: RecommenderType,
        criteria: SearchCriteria
    ) -> List[RecommendationResult]:
        """搜索符合条件的结果"""
        recommender = self.get_recommender(recommender_type)
        return await recommender.search(criteria)

    async def recommend_all(
        self,
        criteria: SearchCriteria,
        exclude_types: List[RecommenderType] = None
    ) -> Dict[RecommenderType, List[RecommendationResult]]:
        """获取所有类型的推荐结果"""
        exclude_types = exclude_types or []
        targets = [
            (rtype, rec) for rtype, rec in self._recommenders.items()
            if rtype not in exclude_types
        ]

        async def _fetch(rtype, recommender):
            return rtype, await recommender.get_recommendations(criteria)

        gathered = await asyncio.gather(*[_fetch(r, c) for r, c in targets])
        return {rtype: results for rtype, results in gathered}

    async def compare(
        self,
        criteria: SearchCriteria,
        compare_types: List[RecommenderType] = None
    ) -> List[RecommendationResult]:
        """对比多个类型，返回最优推荐"""
        compare_types = compare_types or [
            RecommenderType.TRAIN,
            RecommenderType.HIGH_SPEED,
            RecommenderType.FLIGHT
        ]

        all_results = []
        for rtype in compare_types:
            if rtype in self._recommenders:
                results = await self.recommend(rtype, criteria)
                if results:
                    all_results.append(results[0])

        return sorted(all_results, key=lambda x: x.score, reverse=True)

    def get_available_types(self) -> List[RecommenderType]:
        """获取所有可用的推荐器类型"""
        return list(self._recommenders.keys())

    def is_type_available(self, recommender_type: RecommenderType) -> bool:
        """检查推荐器类型是否可用"""
        return recommender_type in self._recommenders
