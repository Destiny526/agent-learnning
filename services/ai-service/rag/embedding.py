"""Embedding Service - Text vectorization using OpenAI or local models"""
import logging
from typing import List, Optional
from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """文本向量化服务"""

    def __init__(self):
        self._client = None
        self._model = settings.EMBEDDING_MODEL
        self._dim = settings.EMBEDDING_DIM

    def _get_client(self) -> Optional[AsyncOpenAI]:
        """获取 OpenAI 客户端（懒加载）"""
        if self._client is None and settings.OPENAI_API_KEY:
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def embed_text(self, text: str) -> Optional[List[float]]:
        """
        将文本向量化

        Args:
            text: 输入文本

        Returns:
            向量列表，失败返回 None
        """
        client = self._get_client()
        if not client:
            logger.warning("OpenAI client not available for embedding")
            return None

        try:
            response = await client.embeddings.create(
                input=text,
                model=self._model,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            return None

    async def embed_batch(
        self,
        texts: List[str],
        batch_size: int = 100,
    ) -> List[Optional[List[float]]]:
        """
        批量文本向量化

        Args:
            texts: 文本列表
            batch_size: 每批处理数量

        Returns:
            向量列表，失败的位置为 None
        """
        client = self._get_client()
        if not client:
            logger.warning("OpenAI client not available for embedding")
            return [None] * len(texts)

        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                response = await client.embeddings.create(
                    input=batch,
                    model=self._model,
                )
                batch_embeddings = [data.embedding for data in response.data]
                all_embeddings.extend(batch_embeddings)
            except Exception as e:
                logger.error(f"Batch embedding failed for batch {i // batch_size}: {e}")
                all_embeddings.extend([None] * len(batch))

        return all_embeddings

    def is_available(self) -> bool:
        """检查 embedding 服务是否可用"""
        return bool(settings.OPENAI_API_KEY)
