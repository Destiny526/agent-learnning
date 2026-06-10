"""AI Service - Redis cache layer (graceful degradation when Redis unavailable)"""
import json
import hashlib
import socket
import redis
from typing import Optional

from config import settings


def _is_redis_available() -> bool:
    """Quick check if Redis port is open (1s timeout)."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((settings.REDIS_HOST, settings.REDIS_PORT))
        sock.close()
        return result == 0
    except Exception:
        return False


def _create_client() -> Optional[redis.Redis]:
    """Create Redis client only if server is reachable."""
    if not _is_redis_available():
        return None
    try:
        return redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True,
            socket_timeout=2,
        )
    except Exception:
        return None


_client = _create_client()


def _make_hash(data: dict) -> str:
    """MD5 hash of dict (first 8 chars) for cache keys."""
    raw = json.dumps(data, sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()[:8]


class CacheManager:
    """Recommendation engine cache (degrades to no-cache when Redis is down)."""

    def __init__(self, client: redis.Redis = None):
        self._c = client or _client

    # ── Ticket pool ─────────────────────────────────────────────────

    def get_ticket_pool(self, origin: str, destination: str, date: str) -> Optional[list]:
        if not self._c:
            return None
        try:
            raw = self._c.get(f"tickets:{origin}:{destination}:{date}")
            if raw is None:
                return None
            return [] if raw == '{"empty": true}' else json.loads(raw)
        except Exception:
            return None

    def set_ticket_pool(self, origin: str, destination: str, date: str, tickets: list):
        if not self._c:
            return
        try:
            key = f"tickets:{origin}:{destination}:{date}"
            if not tickets:
                self._c.setex(key, settings.CACHE_EMPTY_TTL, '{"empty": true}')
            else:
                self._c.setex(key, settings.CACHE_TICKETS_TTL, json.dumps(tickets, default=str))
        except Exception:
            pass

    # ── Recommend result ────────────────────────────────────────────

    def get_recommend(self, origin: str, destination: str, date: str, params: dict) -> Optional[dict]:
        if not self._c:
            return None
        try:
            h = _make_hash(params)
            raw = self._c.get(f"recommend:{origin}:{destination}:{date}:{h}")
            return json.loads(raw) if raw else None
        except Exception:
            return None

    def set_recommend(self, origin: str, destination: str, date: str, params: dict, result: dict):
        if not self._c:
            return
        try:
            h = _make_hash(params)
            self._c.setex(
                f"recommend:{origin}:{destination}:{date}:{h}",
                settings.CACHE_RECOMMEND_TTL,
                json.dumps(result, default=str),
            )
        except Exception:
            pass

    # ── Single ticket ───────────────────────────────────────────────

    def get_ticket(self, ticket_id: int) -> Optional[dict]:
        if not self._c:
            return None
        try:
            raw = self._c.get(f"ticket:{ticket_id}")
            return json.loads(raw) if raw else None
        except Exception:
            return None

    def set_ticket(self, ticket_id: int, data: dict):
        if not self._c:
            return
        try:
            self._c.setex(f"ticket:{ticket_id}", settings.CACHE_TICKET_TTL, json.dumps(data, default=str))
        except Exception:
            pass

    # ── Invalidation ────────────────────────────────────────────────

    def invalidate_route(self, origin: str, destination: str):
        if not self._c:
            return
        try:
            for pattern in [f"tickets:{origin}:{destination}:*", f"recommend:{origin}:{destination}:*"]:
                for key in self._c.scan_iter(match=pattern):
                    self._c.delete(key)
        except Exception:
            pass

    def invalidate_ticket(self, ticket_id: int):
        if not self._c:
            return
        try:
            self._c.delete(f"ticket:{ticket_id}")
        except Exception:
            pass
