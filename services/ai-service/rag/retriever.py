"""Semantic Retriever - RAG retrieval for hotels and attractions"""
import logging
from typing import Dict, Any, List, Optional

from .embedding import EmbeddingService
from .qdrant_client import QdrantManager
from config import settings

logger = logging.getLogger(__name__)


class SemanticRetriever:
    """语义检索器，用于 RAG 架构"""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        qdrant_manager: QdrantManager,
    ):
        self._embedding = embedding_service
        self._qdrant = qdrant_manager

    async def search(
        self,
        origin: str,
        destination: str,
        preferences: str = None,
    ) -> Dict[str, Any]:
        """
        根据用户需求进行语义检索

        Args:
            origin: 出发地
            destination: 目的地
            preferences: 用户偏好

        Returns:
            结构化上下文，包含 hotels 和 attractions
        """
        # 构造查询文本
        query_text = f"从{origin}到{destination}的旅行"
        if preferences:
            query_text += f"，偏好：{preferences}"

        # 检查服务是否可用
        if not self._embedding.is_available() or not self._qdrant.is_available():
            logger.info("RAG services not available, returning empty context")
            return {"hotels": [], "attractions": []}

        # 向量化查询
        query_vector = await self._embedding.embed_text(query_text)
        if not query_vector:
            logger.warning("Failed to embed query text")
            return {"hotels": [], "attractions": []}

        # 并行检索酒店和景点
        hotels = await self._qdrant.search(
            collection=settings.QDRANT_COLLECTION_HOTELS,
            query_vector=query_vector,
            limit=3,
            score_threshold=0.6,
        )

        attractions = await self._qdrant.search(
            collection=settings.QDRANT_COLLECTION_ATTRACTIONS,
            query_vector=query_vector,
            limit=5,
            score_threshold=0.6,
        )

        # 提取 payload
        hotel_results = [h.get("payload", {}) for h in hotels]
        attraction_results = [a.get("payload", {}) for a in attractions]

        logger.info(
            f"RAG search: found {len(hotel_results)} hotels, "
            f"{len(attraction_results)} attractions"
        )

        return {
            "hotels": hotel_results,
            "attractions": attraction_results,
        }

    async def search_similar(
        self,
        text: str,
        collection: str,
        limit: int = 5,
        score_threshold: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """
        通用语义检索

        Args:
            text: 查询文本
            collection: 集合名称
            limit: 返回数量
            score_threshold: 相似度阈值

        Returns:
            检索结果列表
        """
        if not self._embedding.is_available() or not self._qdrant.is_available():
            return []

        query_vector = await self._embedding.embed_text(text)
        if not query_vector:
            return []

        return await self._qdrant.search(
            collection=collection,
            query_vector=query_vector,
            limit=limit,
            score_threshold=score_threshold,
        )
