"""Redis client singleton for ticket-service"""
import redis
import os


def create_redis_client() -> redis.Redis | None:
    """Create Redis client with connection pooling. Returns None if Redis is not configured."""
    host = os.getenv("REDIS_HOST")
    if not host:
        return None
    return redis.Redis(
        host=host,
        port=int(os.getenv("REDIS_PORT", "6379")),
        password=os.getenv("REDIS_PASSWORD", None) or None,
        decode_responses=True,
        socket_timeout=2,
        socket_connect_timeout=2,
        retry_on_timeout=True,
    )


# Lazy-initialized Redis client to avoid fork safety issues with Gunicorn
_redis_client = None


def get_redis() -> redis.Redis | None:
    """Get Redis client (lazy initialization)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = create_redis_client()
    return _redis_client
