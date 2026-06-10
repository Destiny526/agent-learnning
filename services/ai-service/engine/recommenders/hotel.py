"""Hotel recommender"""
from typing import List
from recommenders.base import BaseRecommender, RecommendationResult, SearchCriteria, RecommenderType
import random
import uuid

class HotelRecommender(BaseRecommender):
    """酒店推荐器"""

    def __init__(self, seed: int = 42):
        super().__init__()
        self.recommender_type = RecommenderType.HOTEL
        self._rng = random.Random(seed)
        self._mock_hotels = self._generate_mock_data()

    def _generate_mock_data(self) -> List[dict]:
        """生成模拟酒店数据"""
        hotel_names = [
            "城市便捷酒店", "如家酒店", "汉庭酒店", "全季酒店",
            "锦江之星", "7天连锁酒店", "格林豪泰", "维也纳酒店",
            "华美达酒店", "喜来登酒店", "希尔顿酒店", "万豪酒店"
        ]
        room_types = ["标准间", "大床房", "双床房", "豪华套房", "商务房"]
        locations = ["市中心", "火车站附近", "机场附近", "景区周边", "商业区"]
        base_price = 200.0
        hotels = []
        rng = self._rng

        for i in range(25):
            hotel = {
                "hotel_name": rng.choice(hotel_names),
                "room_type": rng.choice(room_types),
                "location": rng.choice(locations),
                "price_per_night": base_price + rng.uniform(0, 800),
                "rating": round(3.5 + rng.uniform(0, 1.5), 1),
                "rooms_available": rng.randint(1, 50),
            }
            hotels.append(hotel)

        return hotels

    async def get_recommendations(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """获取酒店推荐"""
        all_results = await self.search(criteria)
        sorted_results = self.sort_by_recommendation_type(all_results, criteria.recommendation_type)
        return sorted_results[:criteria.max_results]

    async def search(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """搜索酒店"""
        prices = [h["price_per_night"] for h in self._mock_hotels]
        min_price, max_price = min(prices), max(prices)
        ratings = [h["rating"] for h in self._mock_hotels]
        max_rating = max(ratings)

        results = []

        for hotel in self._mock_hotels:
            if criteria.budget_min is not None and hotel["price_per_night"] < criteria.budget_min:
                continue
            if criteria.budget_max is not None and hotel["price_per_night"] > criteria.budget_max:
                continue

            result = RecommendationResult(
                item_id=f"hotel_{uuid.uuid4().hex[:8]}",
                item_type=RecommenderType.HOTEL,
                title=hotel["hotel_name"],
                description=f"{hotel['location']} | {hotel['room_type']} | 评分 {hotel['rating']}",
                price=round(hotel["price_per_night"], 2),
                origin=criteria.destination,
                destination=criteria.destination,
                availability=hotel["rooms_available"] > 0,
                metadata={
                    "room_type": hotel["room_type"],
                    "location": hotel["location"],
                    "rating": hotel["rating"],
                    "rooms_available": hotel["rooms_available"],
                }
            )

            price_score = self.calculate_price_score(result.price, min_price, max_price)
            rating_score = result.metadata["rating"] / max_rating if max_rating > 0 else 0
            result.score = self.calculate_comprehensive_score(
                price_score, rating_score,
                weights={"price": 0.4, "time": 0.0, "availability": 0.3, "preference": 0.3}
            )

            results.append(result)

        return results
