"""Train ticket recommender"""
from typing import List
from recommenders.base import BaseRecommender, RecommendationResult, SearchCriteria, RecommenderType, RecommendationType
import random
import uuid

class TrainTicketRecommender(BaseRecommender):
    """火车票推荐器"""

    def __init__(self, seed: int = 42):
        super().__init__()
        self.recommender_type = RecommenderType.TRAIN
        self._rng = random.Random(seed)
        self._mock_trains = self._generate_mock_data()

    def _generate_mock_data(self) -> List[dict]:
        """生成模拟火车数据"""
        seat_types = ["硬座", "软座", "硬卧", "软卧"]
        base_price = 150.0
        trains = []
        rng = self._rng

        for i in range(20):
            departure_hour = rng.randint(6, 22)
            departure_minute = rng.choice([0, 10, 20, 30, 40, 50])
            duration_hours = rng.randint(4, 12)

            train = {
                "train_no": f"K{rng.randint(100, 999)}",
                "seat_type": rng.choice(seat_types),
                "price": base_price + rng.uniform(0, 100),
                "duration_minutes": duration_hours * 60 + rng.randint(0, 59),
                "departure_time": f"{departure_hour:02d}:{departure_minute:02d}",
                "arrival_hour": (departure_hour + duration_hours) % 24,
                "seats_available": rng.randint(0, 200),
            }
            train["arrival_time"] = f"{train['arrival_hour']:02d}:{rng.choice([0, 10, 20, 30, 40, 50])}"
            trains.append(train)

        return trains

    async def get_recommendations(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """获取火车票推荐"""
        all_results = await self.search(criteria)
        sorted_results = self.sort_by_recommendation_type(all_results, criteria.recommendation_type)
        return sorted_results[:criteria.max_results]

    async def search(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """搜索火车票"""
        prices = [t["price"] for t in self._mock_trains]
        min_price, max_price = min(prices), max(prices)
        durations = [t["duration_minutes"] for t in self._mock_trains]
        optimal_duration = min(durations)

        results = []

        for train in self._mock_trains:
            if criteria.budget_min is not None and train["price"] < criteria.budget_min:
                continue
            if criteria.budget_max is not None and train["price"] > criteria.budget_max:
                continue

            result = RecommendationResult(
                item_id=f"train_{train['train_no']}_{uuid.uuid4().hex[:8]}",
                item_type=RecommenderType.TRAIN,
                title=f"{train['train_no']} 火车票",
                description=f"{criteria.origin} → {criteria.destination} | {train['seat_type']}",
                price=round(train["price"], 2),
                origin=criteria.origin,
                destination=criteria.destination,
                departure_time=train["departure_time"],
                arrival_time=train["arrival_time"],
                duration_minutes=train["duration_minutes"],
                seat_type=train["seat_type"],
                availability=train["seats_available"] > 0,
                metadata={
                    "train_no": train["train_no"],
                    "seats_available": train["seats_available"],
                }
            )

            price_score = self.calculate_price_score(result.price, min_price, max_price)
            time_score = self.calculate_time_score(result.duration_minutes, optimal_duration)
            result.score = self.calculate_comprehensive_score(price_score, time_score)

            results.append(result)

        return results
