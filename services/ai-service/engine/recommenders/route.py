"""Route recommender"""
from typing import List
from recommenders.base import BaseRecommender, RecommendationResult, SearchCriteria, RecommenderType
import random
import uuid

class RouteRecommender(BaseRecommender):
    """旅游路线推荐器"""

    def __init__(self, seed: int = 42):
        super().__init__()
        self.recommender_type = RecommenderType.ROUTE
        self._rng = random.Random(seed)
        self._mock_routes = self._generate_mock_data()

    def _generate_mock_data(self) -> List[dict]:
        """生成模拟旅游路线数据"""
        route_templates = [
            ("经典一日游", "热门景点全覆盖", 1, 300.0),
            ("精华两日游", "深度体验当地文化", 2, 600.0),
            ("周末三日游", "休闲度假首选", 3, 900.0),
            ("深度五日游", "全景探索之旅", 5, 1500.0),
            ("私人定制游", "专属行程规划", 0, 2000.0),
        ]
        highlights = [
            "包含景点门票", "当地特色美食", "专业导游服务",
            "全程专车接送", "高性价比", "小团体出行"
        ]
        routes = []
        rng = self._rng

        for i in range(20):
            template = rng.choice(route_templates)
            route = {
                "route_name": f"{template[0]} - {rng.choice(['经典', '品质', '豪华', '尊享', '定制'])}版",
                "description": template[1],
                "duration_days": template[2],
                "base_price": template[3] + rng.uniform(-50, 200),
                "highlights": rng.sample(highlights, rng.randint(2, 4)),
                "rating": round(4.0 + rng.uniform(0, 1), 1),
                "booking_count": rng.randint(10, 1000),
            }
            routes.append(route)

        return routes

    async def get_recommendations(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """获取旅游路线推荐"""
        all_results = await self.search(criteria)
        sorted_results = self.sort_by_recommendation_type(all_results, criteria.recommendation_type)
        return sorted_results[:criteria.max_results]

    async def search(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """搜索旅游路线"""
        prices = [r["base_price"] for r in self._mock_routes]
        min_price, max_price = min(prices), max(prices)
        ratings = [r["rating"] for r in self._mock_routes]
        max_rating = max(ratings)

        results = []

        for route in self._mock_routes:
            total_price = route["base_price"]
            if criteria.budget_min is not None and total_price < criteria.budget_min:
                continue
            if criteria.budget_max is not None and total_price > criteria.budget_max:
                continue

            result = RecommendationResult(
                item_id=f"route_{uuid.uuid4().hex[:8]}",
                item_type=RecommenderType.ROUTE,
                title=route["route_name"],
                description=f"{route['description']} | {route['duration_days']}天行程",
                price=round(total_price, 2),
                origin=criteria.destination,
                destination=criteria.destination,
                availability=True,
                metadata={
                    "duration_days": route["duration_days"],
                    "highlights": route["highlights"],
                    "rating": route["rating"],
                    "booking_count": route["booking_count"],
                }
            )

            price_score = self.calculate_price_score(result.price, min_price, max_price)
            rating_score = result.metadata["rating"] / max_rating if max_rating > 0 else 0
            result.score = self.calculate_comprehensive_score(
                price_score, rating_score,
                weights={"price": 0.3, "time": 0.0, "availability": 0.3, "preference": 0.4}
            )

            results.append(result)

        return results
