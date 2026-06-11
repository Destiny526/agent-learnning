"""Task Status API - Task status polling and SSE monitoring"""
import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from tasks.schemas import TaskStatusResponse, TaskStatus
from tasks.manager import TaskManager
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/tasks", tags=["tasks"])


def get_task_manager(request: Request) -> TaskManager:
    """获取任务管理器实例"""
    return request.app.state.task_manager


@router.get("/{task_id}")
async def get_task_status(
    request: Request,
    task_id: str,
):
    """
    查询任务状态（轮询模式）

    前端可以定时轮询此接口获取任务进度。
    """
    task_manager = get_task_manager(request)
    task = task_manager.get_task(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


@router.get("/{task_id}/stream")
async def stream_task_status(
    request: Request,
    task_id: str,
):
    """
    SSE 方式监听任务进度

    前端可以通过 EventSource 监听此端点获取实时进度更新。
    """
    task_manager = get_task_manager(request)

    # 检查任务是否存在
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    async def event_generator():
        """SSE 事件生成器"""
        offset = 0

        while True:
            # 获取新的流式数据
            stream_data = task_manager.get_task_stream_data(task_id, offset)

            for item in stream_data:
                yield {
                    "event": item.get("event", "update"),
                    "data": json.dumps(item.get("data", {})),
                }
                offset += 1

            # 检查任务是否完成
            task = task_manager.get_task(task_id)
            if task:
                if task["status"] in ("completed", "failed"):
                    # 发送最终状态
                    yield {
                        "event": "task_end",
                        "data": json.dumps({
                            "status": task["status"],
                            "progress": task.get("progress", 0),
                            "result": task.get("result"),
                            "error": task.get("error"),
                        }),
                    }
                    break

            # 等待一段时间后再检查
            await asyncio.sleep(settings.TASK_POLL_INTERVAL)

    return EventSourceResponse(event_generator())
