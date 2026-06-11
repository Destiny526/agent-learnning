"""AI Service - Configuration"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # MySQL
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "root")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "travel_assistant")

    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

    # Scoring weights
    WEIGHT_TIME: float = 0.40
    WEIGHT_PRICE: float = 0.30
    WEIGHT_DURATION: float = 0.20
    WEIGHT_COMFORT: float = 0.10

    # Time decay window (minutes)
    TIME_DECAY_WINDOW: int = 360  # 6 hours

    # Search window (hours)
    SEARCH_WINDOW_HOURS: int = 12

    # Comfort scores by ticket type
    COMFORT_SCORES: dict = None

    # Cache TTL (seconds)
    CACHE_TICKETS_TTL: int = 1800    # 30 min
    CACHE_RECOMMEND_TTL: int = 600   # 10 min
    CACHE_TICKET_TTL: int = 3600     # 1 hour
    CACHE_EMPTY_TTL: int = 300       # 5 min

    # LLM Configuration
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "60"))
    LLM_MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "3"))
    LLM_FALLBACK_ENABLED: bool = os.getenv("LLM_FALLBACK_ENABLED", "true").lower() == "true"

    # Qdrant Configuration
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", "6333"))
    QDRANT_COLLECTION_HOTELS: str = "hotels"
    QDRANT_COLLECTION_ATTRACTIONS: str = "attractions"
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    EMBEDDING_DIM: int = int(os.getenv("EMBEDDING_DIM", "1536"))

    # Task Configuration
    TASK_TTL: int = int(os.getenv("TASK_TTL", "3600"))  # 1 hour
    TASK_POLL_INTERVAL: int = int(os.getenv("TASK_POLL_INTERVAL", "2"))

    def __post_init__(self):
        if self.COMFORT_SCORES is None:
            self.COMFORT_SCORES = {
                "flight": 1.0,
                "high_speed": 0.7,
                "train": 0.3,
                "hotel": 0.5,
                "route": 0.6,
            }

    @property
    def database_url(self) -> str:
        return (
            f"mysql+mysqlconnector://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        )


settings = Settings()
settings.__post_init__()
