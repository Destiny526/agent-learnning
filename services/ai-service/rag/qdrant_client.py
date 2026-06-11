"""Qdrant Client - Vector database connection and collection management"""
import logging
from typing import List, Dict, Any, Optional
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

from config import settings

logger = logging.getLogger(__name__)


class QdrantManager:
    """Qdrant 向量数据库管理器"""

    def __init__(self):
        self._client = None

    async def _get_client(self) -> Optional[AsyncQdrantClient]:
        """获取 Qdrant 客户端（懒加载）"""
        if self._client is None:
            try:
                self._client = AsyncQdrantClient(
                    host=settings.QDRANT_HOST,
                    port=settings.QDRANT_PORT,
                )
                # 测试连接
                await self._client.get_collections()
            except Exception as e:
                logger.warning(f"Qdrant connection failed: {e}")
                self._client = None
        return self._client

    async def ensure_collections(self):
        """确保集合存在，不存在则创建"""
        client = await self._get_client()
        if not client:
            logger.warning("Qdrant not available, skipping collection creation")
            return

        try:
            # 获取现有集合
            collections = await client.get_collections()
            existing_names = [c.name for c in collections.collections]

            # 创建 hotels 集合
            if settings.QDRANT_COLLECTION_HOTELS not in existing_names:
                await client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION_HOTELS,
                    vectors_config=VectorParams(
                        size=settings.EMBEDDING_DIM,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"Created collection: {settings.QDRANT_COLLECTION_HOTELS}")

            # 创建 attractions 集合
            if settings.QDRANT_COLLECTION_ATTRACTIONS not in existing_names:
                await client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION_ATTRACTIONS,
                    vectors_config=VectorParams(
                        size=settings.EMBEDDING_DIM,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"Created collection: {settings.QDRANT_COLLECTION_ATTRACTIONS}")

        except Exception as e:
            logger.error(f"Failed to ensure collections: {e}")

    async def upsert_points(
        self,
        collection: str,
        points: List[Dict[str, Any]],
    ) -> bool:
        """
        批量写入向量数据

        Args:
            collection: 集合名称
            points: 点列表，每个点包含 id, vector, payload

        Returns:
            是否成功
        """
        client = await self._get_client()
        if not client:
            return False

        try:
            qdrant_points = [
                PointStruct(
                    id=point["id"],
                    vector=point["vector"],
                    payload=point.get("payload", {}),
                )
                for point in points
            ]

            await client.upsert(
                collection_name=collection,
                points=qdrant_points,
            )
            logger.info(f"Upserted {len(points)} points to {collection}")
            return True
        except Exception as e:
            logger.error(f"Failed to upsert points to {collection}: {e}")
            return False

    async def search(
        self,
        collection: str,
        query_vector: List[float],
        limit: int = 5,
        score_threshold: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """
        语义检索

        Args:
            collection: 集合名称
            query_vector: 查询向量
            limit: 返回结果数量
            score_threshold: 相似度阈值

        Returns:
            检索结果列表
        """
        client = await self._get_client()
        if not client:
            return []

        try:
            results = await client.search(
                collection_name=collection,
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold,
            )

            return [
                {
                    "id": result.id,
                    "score": result.score,
                    "payload": result.payload,
                }
                for result in results
            ]
        except Exception as e:
            logger.error(f"Search failed in {collection}: {e}")
            return []

    async def delete_collection(self, collection: str) -> bool:
        """删除集合"""
        client = await self._get_client()
        if not client:
            return False

        try:
            await client.delete_collection(collection_name=collection)
            logger.info(f"Deleted collection: {collection}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete collection {collection}: {e}")
            return False

    def is_available(self) -> bool:
        """检查 Qdrant 是否可用"""
        return self._client is not None
