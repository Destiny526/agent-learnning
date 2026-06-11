"""Stock manager with Lua-based atomic decrement for ticket-service"""
import redis
import json
import uuid
from datetime import datetime, timezone


class StockManager:
    """Redis-backed inventory manager with atomic stock decrement using Lua scripts."""

    STOCK_KEY_PREFIX = "ticket:stock:"
    RESERVATION_KEY_PREFIX = "ticket:reservation:"
    STOCK_TTL = 86400  # 24 hours
    RESERVATION_TTL = 300  # 5 minutes

    # Lua script: atomic check-and-decrement
    # KEYS[1] = ticket:stock:{ticket_id}
    # ARGV[1] = quantity to decrement
    # Returns: 1 if successful, 0 if insufficient stock, -1 if not initialized
    DECREMENT_SCRIPT = """
    local current = tonumber(redis.call('GET', KEYS[1]))
    if current == nil then
        return -1
    end
    if current < tonumber(ARGV[1]) then
        return 0
    end
    redis.call('DECRBY', KEYS[1], ARGV[1])
    return 1
    """

    # Lua script: atomic rollback (increment stock)
    ROLLBACK_SCRIPT = """
    local exists = redis.call('EXISTS', KEYS[1])
    if exists == 1 then
        redis.call('INCRBY', KEYS[1], ARGV[1])
    end
    return exists
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._decrement_script = self.redis.register_script(self.DECREMENT_SCRIPT)
        self._rollback_script = self.redis.register_script(self.ROLLBACK_SCRIPT)

    def init_stock(self, ticket_id: str, quantity: int) -> bool:
        """
        Initialize stock for a ticket (SETNX to prevent overwriting).
        Returns True if stock was initialized, False if already exists.
        """
        key = f"{self.STOCK_KEY_PREFIX}{ticket_id}"
        return bool(self.redis.set(key, quantity, ex=self.STOCK_TTL, nx=True))

    def get_stock(self, ticket_id: str) -> int:
        """Get current stock count. Returns 0 if not initialized."""
        key = f"{self.STOCK_KEY_PREFIX}{ticket_id}"
        val = self.redis.get(key)
        return int(val) if val is not None else 0

    def try_decrement(self, ticket_id: str, quantity: int = 1) -> tuple[int, str | None]:
        """
        Atomically decrement stock using Lua script.

        Returns:
            tuple: (result_code, reservation_id)
            - result_code: 1=success, 0=insufficient stock, -1=not initialized
            - reservation_id: UUID string if successful, None otherwise
        """
        key = f"{self.STOCK_KEY_PREFIX}{ticket_id}"
        result = self._decrement_script(keys=[key], args=[quantity])

        reservation_id = None
        if result == 1:
            # Create reservation record with TTL
            reservation_id = str(uuid.uuid4())
            res_key = f"{self.RESERVATION_KEY_PREFIX}{reservation_id}"
            self.redis.set(
                res_key,
                json.dumps({
                    "ticket_id": ticket_id,
                    "quantity": quantity,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }),
                ex=self.RESERVATION_TTL,
            )

        return result, reservation_id

    def rollback(self, ticket_id: str, quantity: int = 1) -> bool:
        """
        Rollback stock (e.g., on order failure).
        Returns True if stock key exists and was incremented.
        """
        key = f"{self.STOCK_KEY_PREFIX}{ticket_id}"
        return bool(self._rollback_script(keys=[key], args=[quantity]))

    def confirm_reservation(self, reservation_id: str) -> dict | None:
        """
        Confirm a reservation (remove reservation record).
        Returns reservation data if found, None otherwise.
        """
        res_key = f"{self.RESERVATION_KEY_PREFIX}{reservation_id}"
        data = self.redis.get(res_key)
        if data:
            self.redis.delete(res_key)
            return json.loads(data)
        return None

    def get_reservation(self, reservation_id: str) -> dict | None:
        """Get reservation data without removing it."""
        res_key = f"{self.RESERVATION_KEY_PREFIX}{reservation_id}"
        data = self.redis.get(res_key)
        return json.loads(data) if data else None
