"""Indexer - Data vectorization and indexing tool for RAG"""
import logging
import uuid
from typing import List, Dict, Any

from .embedding import EmbeddingService
from .qdrant_client import QdrantManager
from config import settings

logger = logging.getLogger(__name__)

# 示例酒店数据
SAMPLE_HOTELS = [
    {
        "name": "北京希尔顿酒店",
        "description": "位于北京市朝阳区的五星级酒店，毗邻国贸商圈，交通便利，设施齐全。",
        "price_range": "800-1500",
        "rating": 4.7,
        "location": "朝阳区",
        "type": "五星级",
    },
    {
        "name": "上海外滩华尔道夫酒店",
        "description": "坐落于上海外滩的历史建筑酒店，可俯瞰黄浦江景色，融合古典与现代风格。",
        "price_range": "1200-2500",
        "rating": 4.8,
        "location": "黄浦区",
        "type": "五星级",
    },
    {
        "name": "广州花园酒店",
        "description": "广州市中心的商务酒店，靠近广州塔和珠江新城，适合商务和休闲旅客。",
        "price_range": "500-1000",
        "rating": 4.5,
        "location": "天河区",
        "type": "四星级",
    },
    {
        "name": "成都宽窄巷子民宿",
        "description": "位于成都宽窄巷子附近的特色民宿，体验老成都风情，周边美食众多。",
        "price_range": "200-400",
        "rating": 4.6,
        "location": "青羊区",
        "type": "民宿",
    },
    {
        "name": "杭州西湖边精品酒店",
        "description": "紧邻西湖的精品酒店，步行可达断桥残雪，环境优雅，适合度假。",
        "price_range": "600-1200",
        "rating": 4.7,
        "location": "西湖区",
        "type": "精品酒店",
    },
]

# 示例景点数据
SAMPLE_ATTRACTIONS = [
    {
        "name": "故宫博物院",
        "description": "中国明清两代的皇家宫殿，世界上现存规模最大、保存最完整的木质结构古建筑群。",
        "type": "历史古迹",
        "location": "北京",
        "recommended_duration": "3-4小时",
        "ticket_price": 60,
    },
    {
        "name": "长城（八达岭）",
        "description": "中国古代伟大的防御工程，世界文化遗产，八达岭段是最具代表性的游览段。",
        "type": "历史古迹",
        "location": "北京",
        "recommended_duration": "半天",
        "ticket_price": 40,
    },
    {
        "name": "外滩",
        "description": "上海的标志性景点，沿黄浦江延伸，可欣赏两岸的现代与古典建筑群。",
        "type": "城市景观",
        "location": "上海",
        "recommended_duration": "1-2小时",
        "ticket_price": 0,
    },
    {
        "name": "西湖",
        "description": "杭州的灵魂景点，以秀丽的湖光山色和众多的名胜古迹闻名中外。",
        "type": "自然风光",
        "location": "杭州",
        "recommended_duration": "半天-一天",
        "ticket_price": 0,
    },
    {
        "name": "九寨沟",
        "description": "以翠海、叠瀑、彩林、雪峰、藏情、蓝冰六绝著称的人间仙境。",
        "type": "自然风光",
        "location": "四川",
        "recommended_duration": "1-2天",
        "ticket_price": 250,
    },
    {
        "name": "张家界国家森林公园",
        "description": "以奇峰、怪石、幽谷、秀水、溶洞五绝闻名于世，电影《阿凡达》取景地。",
        "type": "自然风光",
        "location": "湖南",
        "recommended_duration": "2-3天",
        "ticket_price": 225,
    },
    {
        "name": "兵马俑",
        "description": "秦始皇陵的陪葬坑，世界第八大奇迹，展示了秦朝强大的军事力量。",
        "type": "历史古迹",
        "location": "西安",
        "recommended_duration": "3-4小时",
        "ticket_price": 120,
    },
]


class DataIndexer:
    """数据索引工具"""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        qdrant_manager: QdrantManager,
    ):
        self._embedding = embedding_service
        self._qdrant = qdrant_manager

    async def index_sample_data(self) -> Dict[str, int]:
        """
        索引示例数据

        Returns:
            索引结果统计
        """
        results = {"hotels": 0, "attractions": 0}

        # 索引酒店
        hotel_count = await self._index_hotels(SAMPLE_HOTELS)
        results["hotels"] = hotel_count

        # 索引景点
        attraction_count = await self._index_attractions(SAMPLE_ATTRACTIONS)
        results["attractions"] = attraction_count

        logger.info(f"Indexing completed: {results}")
        return results

    async def _index_hotels(self, hotels: List[Dict[str, Any]]) -> int:
        """索引酒店数据"""
        if not self._embedding.is_available():
            logger.warning("Embedding service not available, skipping hotel indexing")
            return 0

        # 构建文本列表
        texts = [
            f"{h['name']}：{h['description']}，价格范围：{h['price_range']}元，评分：{h['rating']}"
            for h in hotels
        ]

        # 批量向量化
        embeddings = await self._embedding.embed_batch(texts)
        if not embeddings:
            return 0

        # 构建点列表
        points = []
        for i, (hotel, embedding) in enumerate(zip(hotels, embeddings)):
            if embedding:
                points.append({
                    "id": str(uuid.uuid4()),
                    "vector": embedding,
                    "payload": {
                        "name": hotel["name"],
                        "description": hotel["description"],
                        "price_range": hotel["price_range"],
                        "rating": hotel["rating"],
                        "location": hotel["location"],
                        "type": hotel["type"],
                    },
                })

        # 写入 Qdrant
        if points:
            success = await self._qdrant.upsert_points(
                settings.QDRANT_COLLECTION_HOTELS,
                points,
            )
            return len(points) if success else 0

        return 0

    async def _index_attractions(self, attractions: List[Dict[str, Any]]) -> int:
        """索引景点数据"""
        if not self._embedding.is_available():
            logger.warning("Embedding service not available, skipping attraction indexing")
            return 0

        # 构建文本列表
        texts = [
            f"{a['name']}：{a['description']}，类型：{a['type']}，位置：{a['location']}"
            for a in attractions
        ]

        # 批量向量化
        embeddings = await self._embedding.embed_batch(texts)
        if not embeddings:
            return 0

        # 构建点列表
        points = []
        for i, (attraction, embedding) in enumerate(zip(attractions, embeddings)):
            if embedding:
                points.append({
                    "id": str(uuid.uuid4()),
                    "vector": embedding,
                    "payload": {
                        "name": attraction["name"],
                        "description": attraction["description"],
                        "type": attraction["type"],
                        "location": attraction["location"],
                        "recommended_duration": attraction["recommended_duration"],
                        "ticket_price": attraction["ticket_price"],
                    },
                })

        # 写入 Qdrant
        if points:
            success = await self._qdrant.upsert_points(
                settings.QDRANT_COLLECTION_ATTRACTIONS,
                points,
            )
            return len(points) if success else 0

        return 0
