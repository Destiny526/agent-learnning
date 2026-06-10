"""Flight recommender"""
from typing import List
from recommenders.base import BaseRecommender, RecommendationResult, SearchCriteria, RecommenderType
import random
import uuid

class FlightRecommender(BaseRecommender):
    """飞机票推荐器"""

    def __init__(self, seed: int = 42):
        super().__init__()
        self.recommender_type = RecommenderType.FLIGHT
        self._rng = random.Random(seed)
        self._mock_flights = self._generate_mock_data()

    def _generate_mock_data(self) -> List[dict]:
        """生成模拟航班数据"""
        airlines = ["国航", "东航", "南航", "海航", "厦航", "川航"]
        seat_classes = ["经济舱", "超级经济舱", "商务舱", "头等舱"]
        base_price = 500.0
        flights = []
        rng = self._rng

        for i in range(30):
            departure_hour = rng.randint(6, 23)
            departure_minute = rng.choice([0, 10, 20, 30, 40, 50])
            duration_hours = rng.randint(1, 6)

            flight = {
                "flight_no": f"{rng.choice(['CA', 'MU', 'CZ', 'HU', 'MF', 'SC'])}{rng.randint(1000, 9999)}",
                "airline": rng.choice(airlines),
                "seat_class": rng.choice(seat_classes),
                "price": base_price + rng.uniform(0, 1500),
                "duration_minutes": duration_hours * 60 + rng.randint(0, 59),
                "departure_time": f"{departure_hour:02d}:{departure_minute:02d}",
                "arrival_hour": (departure_hour + duration_hours) % 24,
                "seats_available": rng.randint(0, 300),
            }
            flight["arrival_time"] = f"{flight['arrival_hour']:02d}:{rng.choice([0, 10, 20, 30, 40, 50])}"
            flights.append(flight)

        return flights

    async def get_recommendations(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """获取飞机票推荐"""
        all_results = await self.search(criteria)
        sorted_results = self.sort_by_recommendation_type(all_results, criteria.recommendation_type)
        return sorted_results[:criteria.max_results]

    async def search(self, criteria: SearchCriteria) -> List[RecommendationResult]:
        """搜索飞机票"""
        prices = [f["price"] for f in self._mock_flights]
        min_price, max_price = min(prices), max(prices)
        durations = [f["duration_minutes"] for f in self._mock_flights]
        optimal_duration = min(durations)

        results = []

        for flight in self._mock_flights:
            if criteria.budget_min is not None and flight["price"] < criteria.budget_min:
                continue
            if criteria.budget_max is not None and flight["price"] > criteria.budget_max:
                continue

            result = RecommendationResult(
                item_id=f"flight_{flight['flight_no']}_{uuid.uuid4().hex[:8]}",
                item_type=RecommenderType.FLIGHT,
                title=f"{flight['airline']} {flight['flight_no']}",
                description=f"{criteria.origin} → {criteria.destination} | {flight['seat_class']}",
                price=round(flight["price"], 2),
                origin=criteria.origin,
                destination=criteria.destination,
                departure_time=flight["departure_time"],
                arrival_time=flight["arrival_time"],
                duration_minutes=flight["duration_minutes"],
                seat_type=flight["seat_class"],
                availability=flight["seats_available"] > 0,
                metadata={
                    "flight_no": flight["flight_no"],
                    "airline": flight["airline"],
                    "seats_available": flight["seats_available"],
                }
            )

            price_score = self.calculate_price_score(result.price, min_price, max_price)
            time_score = self.calculate_time_score(result.duration_minutes, optimal_duration)
            result.score = self.calculate_comprehensive_score(price_score, time_score)

            results.append(result)

        return results
