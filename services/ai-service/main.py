"""AI Service - FastAPI application with LLM integration"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from database import Base, engine
from config import settings
from llm.client import LLMClient
from rag.embedding import EmbeddingService
from rag.qdrant_client import QdrantManager
from rag.retriever import SemanticRetriever
from rag.indexer import DataIndexer
from tasks.manager import TaskManager
from api.recommend import router as recommend_router
from api.trip_plan import router as trip_plan_router
from api.task_status import router as task_router

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: 初始化和清理资源"""
    logger.info("Starting AI Service...")

    # 创建数据库表
    Base.metadata.create_all(bind=engine)

    # 初始化 LLM 客户端
    llm_client = LLMClient()
    app.state.llm_client = llm_client
    logger.info(f"LLM client initialized (available: {llm_client.is_available()})")

    # 初始化 RAG 组件
    embedding_service = EmbeddingService()
    qdrant_manager = QdrantManager()
    retriever = SemanticRetriever(embedding_service, qdrant_manager)

    # 确保 Qdrant 集合存在
    await qdrant_manager.ensure_collections()

    # 索引示例数据（如果 Qdrant 可用且集合为空）
    if qdrant_manager.is_available() and embedding_service.is_available():
        indexer = DataIndexer(embedding_service, qdrant_manager)
        try:
            # 尝试索引示例数据
            results = await indexer.index_sample_data()
            logger.info(f"Sample data indexed: {results}")
        except Exception as e:
            logger.warning(f"Failed to index sample data: {e}")

    app.state.embedding_service = embedding_service
    app.state.qdrant_manager = qdrant_manager
    app.state.retriever = retriever
    logger.info("RAG components initialized")

    # 初始化任务管理器
    task_manager = TaskManager()
    app.state.task_manager = task_manager
    logger.info("Task manager initialized")

    logger.info("AI Service started successfully")

    yield

    # 清理资源
    logger.info("Shutting down AI Service...")


app = FastAPI(
    title="AI Travel Assistant - AI Service",
    version="3.0.0",
    description="AI Recommendation Engine with LLM Integration",
    lifespan=lifespan,
)

# 注册路由
app.include_router(recommend_router)
app.include_router(trip_plan_router)
app.include_router(task_router)


@app.get("/")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "3.0.0",
        "features": {
            "llm": hasattr(app.state, "llm_client") and app.state.llm_client.is_available(),
            "rag": hasattr(app.state, "qdrant_manager") and app.state.qdrant_manager.is_available(),
            "tasks": hasattr(app.state, "task_manager"),
        },
    }


@app.get("/api/ai/health")
async def api_health():
    """API 健康检查"""
    llm_available = hasattr(app.state, "llm_client") and app.state.llm_client.is_available()
    rag_available = hasattr(app.state, "qdrant_manager") and app.state.qdrant_manager.is_available()

    return {
        "status": "healthy",
        "llm": {
            "available": llm_available,
            "client": app.state.llm_client.current_client if llm_available else None,
        },
        "rag": {
            "available": rag_available,
            "qdrant": rag_available,
        },
    }


@app.get("/api/ai/index/sample")
async def index_sample_data():
    """手动触发示例数据索引"""
    if not hasattr(app.state, "retriever"):
        return {"error": "RAG not initialized"}

    embedding_service = app.state.embedding_service
    qdrant_manager = app.state.qdrant_manager

    if not embedding_service.is_available() or not qdrant_manager.is_available():
        return {"error": "RAG services not available"}

    indexer = DataIndexer(embedding_service, qdrant_manager)
    results = await indexer.index_sample_data()

    return {"message": "Sample data indexed", "results": results}


if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.getenv("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)
