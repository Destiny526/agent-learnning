"""LLM Client - DeepSeek / OpenAI unified async client with retry and fallback"""
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional
from openai import AsyncOpenAI
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """统一的 LLM 客户端，支持 DeepSeek 和 OpenAI，带重试和 fallback"""

    def __init__(self):
        # DeepSeek 客户端（主要）
        self._deepseek = AsyncOpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
            http_client=httpx.AsyncClient(
                timeout=httpx.Timeout(
                    connect=10,
                    read=settings.LLM_TIMEOUT,
                    write=10,
                    pool=10,
                )
            ),
        )

        # OpenAI 客户端（后备）
        self._openai = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            http_client=httpx.AsyncClient(
                timeout=httpx.Timeout(
                    connect=10,
                    read=settings.LLM_TIMEOUT,
                    write=10,
                    pool=10,
                )
            ),
        )

        # 当前使用的客户端
        self._current_client = "deepseek"

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_format: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        调用 LLM 生成 completion

        Args:
            messages: 消息列表
            model: 模型名称，默认使用配置中的模型
            temperature: 温度参数
            max_tokens: 最大 token 数
            response_format: 响应格式

        Returns:
            LLM 生成的文本

        Raises:
            Exception: 所有重试都失败后抛出异常
        """
        model = model or settings.DEEPSEEK_MODEL

        # 尝试 DeepSeek
        try:
            result = await self._call_with_retry(
                client=self._deepseek,
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format,
                max_retries=settings.LLM_MAX_RETRIES,
            )
            self._current_client = "deepseek"
            return result
        except Exception as e:
            logger.warning(f"DeepSeek failed after {settings.LLM_MAX_RETRIES} retries: {e}")

            # Fallback 到 OpenAI
            if settings.LLM_FALLBACK_ENABLED and settings.OPENAI_API_KEY:
                logger.info("Falling back to OpenAI...")
                try:
                    result = await self._call_with_retry(
                        client=self._openai,
                        messages=messages,
                        model=settings.OPENAI_MODEL,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        response_format=response_format,
                        max_retries=2,
                    )
                    self._current_client = "openai"
                    return result
                except Exception as fallback_error:
                    logger.error(f"OpenAI fallback also failed: {fallback_error}")
                    raise fallback_error

            raise e

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """
        流式调用 LLM

        Args:
            messages: 消息列表
            model: 模型名称
            temperature: 温度参数
            max_tokens: 最大 token 数

        Yields:
            LLM 生成的文本片段
        """
        model = model or settings.DEEPSEEK_MODEL

        # 尝试 DeepSeek
        try:
            async for chunk in self._stream_with_retry(
                client=self._deepseek,
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            ):
                yield chunk
            self._current_client = "deepseek"
            return
        except Exception as e:
            logger.warning(f"DeepSeek stream failed: {e}")

            # Fallback 到 OpenAI
            if settings.LLM_FALLBACK_ENABLED and settings.OPENAI_API_KEY:
                logger.info("Falling back to OpenAI for streaming...")
                try:
                    async for chunk in self._stream_with_retry(
                        client=self._openai,
                        messages=messages,
                        model=settings.OPENAI_MODEL,
                        temperature=temperature,
                        max_tokens=max_tokens,
                    ):
                        yield chunk
                    self._current_client = "openai"
                    return
                except Exception as fallback_error:
                    logger.error(f"OpenAI stream fallback also failed: {fallback_error}")
                    raise fallback_error

            raise e

    async def _call_with_retry(
        self,
        client: AsyncOpenAI,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
        response_format: Optional[Dict[str, str]],
        max_retries: int,
    ) -> str:
        """带重试的 LLM 调用"""

        @retry(
            stop=stop_after_attempt(max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            retry=retry_if_exception_type(
                (httpx.TimeoutException, Exception)
            ),
            reraise=True,
        )
        async def _call():
            kwargs = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if response_format:
                kwargs["response_format"] = response_format

            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content

        return await _call()

    async def _stream_with_retry(
        self,
        client: AsyncOpenAI,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        """带重试的流式 LLM 调用"""

        @retry(
            stop=stop_after_attempt(2),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            retry=retry_if_exception_type(
                (httpx.TimeoutException, Exception)
            ),
            reraise=True,
        )
        async def _stream():
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        async for chunk in _stream():
            yield chunk

    @property
    def current_client(self) -> str:
        """当前使用的客户端"""
        return self._current_client

    def is_available(self) -> bool:
        """检查 LLM 是否可用"""
        return bool(settings.DEEPSEEK_API_KEY or settings.OPENAI_API_KEY)
