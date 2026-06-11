"""API - Route handlers"""
from .recommend import router as recommend_router
from .trip_plan import router as trip_plan_router
from .task_status import router as task_router

__all__ = [
    "recommend_router",
    "trip_plan_router",
    "task_router",
]
