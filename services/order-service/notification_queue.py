"""Notification queue producer + consumer for order-service"""
import json
import uuid
import redis
import httpx
import os
import time
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

QUEUE_KEY = "queue:notifications"
DLQ_KEY = "queue:notifications:dlq"
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds between retries

NOTIFICATION_SERVICE_URL = os.getenv(
    "NOTIFICATION_SERVICE_URL", "http://localhost:8005"
)


def enqueue_notification(redis_client: redis.Redis, user_id: int, order_id: int, ticket_id: int) -> str:
    """
    Enqueue a notification task.
    Returns the message ID.
    """
    message = {
        "id": str(uuid.uuid4()),
        "type": "order_created",
        "user_id": user_id,
        "order_id": order_id,
        "ticket_id": ticket_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "retry_count": 0,
        "max_retries": MAX_RETRIES,
    }
    redis_client.lpush(QUEUE_KEY, json.dumps(message))
    logger.info(f"Enqueued notification {message['id']} for order {order_id}")
    return message["id"]


def process_notification(message: dict) -> bool:
    """
    Send notification to notification-service.
    Returns True on success.
    """
    payload = {
        "user_id": message["user_id"],
        "title": "订单创建成功",
        "content": f"您的订单 #{message['order_id']} 已成功创建。",
        "type": "order",
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                f"{NOTIFICATION_SERVICE_URL}/api/notifications",
                json=payload,
            )
            resp.raise_for_status()
            logger.info(f"Notification {message['id']} delivered successfully")
            return True
    except Exception as e:
        logger.error(f"Notification {message['id']} delivery failed: {e}")
        return False


def run_consumer(redis_client: redis.Redis):
    """
    Blocking consumer loop. Call in a background thread/process.
    Uses BRPOP for reliable single-consumer delivery.
    """
    logger.info("Notification consumer started")
    while True:
        try:
            # BRPOP blocks until a message is available (5-second timeout for graceful shutdown)
            result = redis_client.brpop(QUEUE_KEY, timeout=5)
            if result is None:
                continue

            _, raw = result
            message = json.loads(raw)

            success = process_notification(message)

            if not success:
                message["retry_count"] += 1
                if message["retry_count"] < message["max_retries"]:
                    # Re-enqueue with incremented retry count
                    logger.warning(
                        f"Retrying notification {message['id']} "
                        f"(attempt {message['retry_count']}/{message['max_retries']})"
                    )
                    time.sleep(RETRY_DELAY)
                    redis_client.lpush(QUEUE_KEY, json.dumps(message))
                else:
                    # Move to dead letter queue
                    logger.error(
                        f"Notification {message['id']} exceeded max retries, "
                        f"moving to DLQ"
                    )
                    redis_client.lpush(DLQ_KEY, json.dumps(message))

        except redis.ConnectionError:
            logger.error("Redis connection lost, retrying in 5 seconds...")
            time.sleep(5)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode message: {e}")
        except Exception as e:
            logger.error(f"Consumer error: {e}")
            time.sleep(1)


def get_queue_stats(redis_client: redis.Redis) -> dict:
    """Get queue statistics for monitoring."""
    try:
        queue_len = redis_client.llen(QUEUE_KEY)
        dlq_len = redis_client.llen(DLQ_KEY)
        return {
            "queue_length": queue_len,
            "dlq_length": dlq_len,
            "queue_key": QUEUE_KEY,
            "dlq_key": DLQ_KEY,
        }
    except Exception as e:
        logger.error(f"Failed to get queue stats: {e}")
        return {
            "queue_length": -1,
            "dlq_length": -1,
            "error": str(e),
        }
