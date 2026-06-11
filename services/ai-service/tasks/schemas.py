"""Task Schemas - Pydantic models for task management"""
from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime


class TaskStatus(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskCreateRequest(BaseModel):
    """任务创建请求"""
    origin: str
    destination: str
    days: int = 2
    budget: float = 3000
    preferences: Optional[str] = None
    user_id: Optional[int] = None


class TaskStatusResponse(BaseModel):
    """任务状态响应"""
    task_id: str
    status: TaskStatus
    progress: int  # 0-100
    current_step: Optional[str] = None
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


class StreamEvent(BaseModel):
    """SSE 流式事件"""
    event: str
    data: dict
    timestamp: str = None

    def __init__(self, **data):
        if 'timestamp' not in data:
            data['timestamp'] = datetime.now().isoformat()
        super().__init__(**data)
