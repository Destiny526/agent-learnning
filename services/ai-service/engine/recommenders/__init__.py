"""Recommenders package"""
from recommenders.base import BaseRecommender, RecommendationResult
from recommenders.train import TrainTicketRecommender
from recommenders.high_speed import HighSpeedRecommender
from recommenders.flight import FlightRecommender
from recommenders.hotel import HotelRecommender
from recommenders.route import RouteRecommender

__all__ = [
    "BaseRecommender",
    "RecommendationResult",
    "TrainTicketRecommender",
    "HighSpeedRecommender",
    "FlightRecommender",
    "HotelRecommender",
    "RouteRecommender",
]
