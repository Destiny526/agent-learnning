"""Trip Plan API - SSE streaming trip plan generation"""
import json
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from tasks.schemas import TaskCreateRequest, TaskStatusResponse
from tasks.manager import TaskManager
from llm.client import LLMClient
from llm.prompts import build_trip_plan_messages
from llm.parsers import parse_trip_plan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["trip-plan"])


def get_task_manager(request: Request) -> TaskManager:
    """获取任务管理器实例"""
    return request.app.state.task_manager


def get_llm_client(request: Request) -> LLMClient:
    """获取 LLM 客户端实例"""
    return request.app.state.llm_client


@router.post("/trip-plan")
async def create_trip_plan(
    request: Request,
    body: TaskCreateRequest,
):
    """
    同步模式：直接返回完整结果

    适合快速响应场景，等待 LLM 生成完成后返回完整结果。
    """
    task_manager = get_task_manager(request)
    llm_client = get_llm_client(request)

    # 创建任务
    task_id = task_manager.create_task(body.model_dump())
    task_manager.update_task(task_id, status="running", progress=10, current_step="preparing")

    try:
        # 构建消息
        task_manager.update_task(task_id, progress=20, current_step="building_prompt")
        messages = build_trip_plan_messages(
            origin=body.origin,
            destination=body.destination,
            days=body.days,
            budget=body.budget,
            preferences=body.preferences,
        )

        # 调用 LLM
        task_manager.update_task(task_id, progress=30, current_step="llm_generating")
        response_text = await llm_client.chat_completion(messages)

        # 解析结果
        task_manager.update_task(task_id, progress=90, current_step="parsing")
        trip_plan = parse_trip_plan(response_text)

        if not trip_plan:
            task_manager.update_task(
                task_id,
                status="failed",
                error="Failed to parse LLM output",
            )
            raise HTTPException(status_code=500, detail="Failed to generate trip plan")

        # 更新任务状态
        task_manager.update_task(
            task_id,
            status="completed",
            progress=100,
            current_step="done",
            result=trip_plan.model_dump(),
        )

        return {
            "task_id": task_id,
            "status": "completed",
            "result": trip_plan.model_dump(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trip plan generation failed: {e}")
        task_manager.update_task(
            task_id,
            status="failed",
            error=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trip-plan/stream")
async def stream_trip_plan(
    request: Request,
    body: TaskCreateRequest,
):
    """
    SSE 流式模式

    1. 创建任务
    2. 启动后台生成
    3. 返回 SSE EventSourceResponse
    4. 前端实时接收进度和结果
    """
    task_manager = get_task_manager(request)
    llm_client = get_llm_client(request)

    # 创建任务
    task_id = task_manager.create_task(body.model_dump())

    async def event_generator():
        """SSE 事件生成器"""
        try:
            # 1. 发送任务创建事件
            yield {
                "event": "task_created",
                "data": json.dumps({"task_id": task_id}),
            }

            # 2. 构建 prompt
            yield {
                "event": "step",
                "data": json.dumps({
                    "step": "building_prompt",
                    "progress": 20,
                    "message": "正在构建提示词...",
                }),
            }
            task_manager.update_task(task_id, status="running", progress=20, current_step="building_prompt")

            messages = build_trip_plan_messages(
                origin=body.origin,
                destination=body.destination,
                days=body.days,
                budget=body.budget,
                preferences=body.preferences,
            )

            # 3. LLM 流式调用
            yield {
                "event": "step",
                "data": json.dumps({
                    "step": "llm_generating",
                    "progress": 30,
                    "message": "AI 正在生成行程方案...",
                }),
            }
            task_manager.update_task(task_id, progress=30, current_step="llm_generating")

            full_response = ""
            chunk_count = 0
            async for chunk in llm_client.chat_stream(messages):
                full_response += chunk
                chunk_count += 1

                # 每 10 个 chunk 发送一次进度更新
                if chunk_count % 10 == 0:
                    progress = min(30 + chunk_count // 2, 85)
                    yield {
                        "event": "chunk",
                        "data": json.dumps({"content": chunk, "progress": progress}),
                    }
                else:
                    yield {
                        "event": "chunk",
                        "data": json.dumps({"content": chunk}),
                    }

            # 4. 解析结果
            yield {
                "event": "step",
                "data": json.dumps({
                    "step": "parsing",
                    "progress": 90,
                    "message": "正在解析结果...",
                }),
            }
            task_manager.update_task(task_id, progress=90, current_step="parsing")

            trip_plan = parse_trip_plan(full_response)

            if not trip_plan:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": "Failed to parse LLM output"}),
                }
                task_manager.update_task(task_id, status="failed", error="Failed to parse LLM output")
                return

            # 5. 完成
            task_manager.update_task(
                task_id,
                status="completed",
                progress=100,
                current_step="done",
                result=trip_plan.model_dump(),
            )

            yield {
                "event": "complete",
                "data": json.dumps({
                    "task_id": task_id,
                    "result": trip_plan.model_dump(),
                }),
            }

        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }
            task_manager.update_task(task_id, status="failed", error=str(e))

    return EventSourceResponse(event_generator())
