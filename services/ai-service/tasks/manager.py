"""Task Manager - Redis-based async task management"""
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import redis

from config import settings

logger = logging.getLogger(__name__)

# Task key patterns
TASK_KEY_PREFIX = "trip_task:"
TASK_STREAM_PREFIX = "trip_task_stream:"


class TaskManager:
    """Redis-based task manager for async trip plan generation"""

    def __init__(self, redis_client: redis.Redis = None):
        self._redis = redis_client

    def _get_redis(self) -> redis.Redis:
        """Get Redis client (lazy initialization)"""
        if self._redis is None:
            try:
                self._redis = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    decode_responses=True,
                    socket_timeout=2,
                    socket_connect_timeout=2,
                    retry_on_timeout=True,
                )
                # Test connection
                self._redis.ping()
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
                self._redis = None
        return self._redis

    def create_task(self, user_input: Dict[str, Any]) -> str:
        """
        创建新任务

        Args:
            user_input: 用户输入参数

        Returns:
            task_id: 任务 ID
        """
        task_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        task_data = {
            "task_id": task_id,
            "status": "pending",
            "progress": 0,
            "current_step": None,
            "result": None,
            "error": None,
            "user_input": user_input,
            "created_at": now,
            "updated_at": now,
        }

        redis_client = self._get_redis()
        if redis_client:
            try:
                key = f"{TASK_KEY_PREFIX}{task_id}"
                redis_client.setex(key, settings.TASK_TTL, json.dumps(task_data))
                logger.info(f"Created task {task_id}")
            except Exception as e:
                logger.error(f"Failed to create task in Redis: {e}")

        return task_id

    def update_task(
        self,
        task_id: str,
        status: str = None,
        progress: int = None,
        current_step: str = None,
        result: dict = None,
        error: str = None,
    ) -> bool:
        """
        更新任务状态

        Args:
            task_id: 任务 ID
            status: 新状态
            progress: 进度 (0-100)
            current_step: 当前步骤
            result: 结果数据
            error: 错误信息

        Returns:
            是否更新成功
        """
        redis_client = self._get_redis()
        if not redis_client:
            return False

        try:
            key = f"{TASK_KEY_PREFIX}{task_id}"
            data = redis_client.get(key)
            if not data:
                logger.warning(f"Task {task_id} not found")
                return False

            task_data = json.loads(data)

            if status is not None:
                task_data["status"] = status
            if progress is not None:
                task_data["progress"] = progress
            if current_step is not None:
                task_data["current_step"] = current_step
            if result is not None:
                task_data["result"] = result
            if error is not None:
                task_data["error"] = error

            task_data["updated_at"] = datetime.now(timezone.utc).isoformat()

            redis_client.setex(key, settings.TASK_TTL, json.dumps(task_data))
            logger.debug(f"Updated task {task_id}: status={status}, progress={progress}")
            return True
        except Exception as e:
            logger.error(f"Failed to update task {task_id}: {e}")
            return False

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        获取任务状态

        Args:
            task_id: 任务 ID

        Returns:
            任务数据，不存在返回 None
        """
        redis_client = self._get_redis()
        if not redis_client:
            return None

        try:
            key = f"{TASK_KEY_PREFIX}{task_id}"
            data = redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to get task {task_id}: {e}")
            return None

    def set_task_stream_data(self, task_id: str, event: str, data: dict) -> bool:
        """
        追加 SSE 流式数据到 Redis list

        Args:
            task_id: 任务 ID
            event: 事件类型
            data: 事件数据

        Returns:
            是否成功
        """
        redis_client = self._get_redis()
        if not redis_client:
            return False

        try:
            key = f"{TASK_STREAM_PREFIX}{task_id}"
            stream_item = {
                "event": event,
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            redis_client.rpush(key, json.dumps(stream_item))
            redis_client.expire(key, settings.TASK_TTL)
            return True
        except Exception as e:
            logger.error(f"Failed to set stream data for task {task_id}: {e}")
            return False

    def get_task_stream_data(self, task_id: str, offset: int = 0) -> List[Dict[str, Any]]:
        """
        获取从 offset 开始的流式数据

        Args:
            task_id: 任务 ID
            offset: 起始位置

        Returns:
            流式数据列表
        """
        redis_client = self._get_redis()
        if not redis_client:
            return []

        try:
            key = f"{TASK_STREAM_PREFIX}{task_id}"
            data = redis_client.lrange(key, offset, -1)
            return [json.loads(item) for item in data]
        except Exception as e:
            logger.error(f"Failed to get stream data for task {task_id}: {e}")
            return []

    def delete_task(self, task_id: str) -> bool:
        """
        删除任务

        Args:
            task_id: 任务 ID

        Returns:
            是否删除成功
        """
        redis_client = self._get_redis()
        if not redis_client:
            return False

        try:
            key = f"{TASK_KEY_PREFIX}{task_id}"
            stream_key = f"{TASK_STREAM_PREFIX}{task_id}"
            redis_client.delete(key, stream_key)
            return True
        except Exception as e:
            logger.error(f"Failed to delete task {task_id}: {e}")
            return False
