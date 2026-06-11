"""LLM Output Parsers - JSON extraction and validation"""
import json
import re
import logging
from typing import Optional
from .models import TripPlan

logger = logging.getLogger(__name__)


def extract_json_from_text(text: str) -> Optional[str]:
    """从文本中提取 JSON 字符串，处理 markdown code block 包裹情况"""
    # 尝试直接解析
    text = text.strip()

    # 处理 ```json ... ``` 包裹
    json_block_pattern = r'```(?:json)?\s*\n?(.*?)\n?\s*```'
    match = re.search(json_block_pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # 处理 { ... } 包裹
    json_pattern = r'\{[\s\S]*\}'
    match = re.search(json_pattern, text)
    if match:
        return match.group(0).strip()

    return None


def fix_common_json_issues(json_str: str) -> str:
    """修复常见的 JSON 格式问题"""
    # 移除尾逗号
    json_str = re.sub(r',\s*([}\]])', r'\1', json_str)

    # 修复单引号为双引号（简单场景）
    # 注意：这个修复可能不完美，但可以处理大部分情况
    json_str = json_str.replace("'", '"')

    # 修复未转义的换行符
    json_str = json_str.replace('\n', '\\n')

    return json_str


def parse_trip_plan(raw_text: str) -> Optional[TripPlan]:
    """
    从 LLM 返回的文本中解析 TripPlan

    Args:
        raw_text: LLM 返回的原始文本

    Returns:
        TripPlan 对象，解析失败返回 None
    """
    # 提取 JSON
    json_str = extract_json_from_text(raw_text)
    if not json_str:
        logger.warning("Failed to extract JSON from LLM output")
        return None

    # 尝试直接解析
    try:
        return TripPlan.model_validate_json(json_str)
    except Exception as e:
        logger.warning(f"Failed to parse JSON directly: {e}")

    # 尝试修复后解析
    try:
        fixed_json = fix_common_json_issues(json_str)
        return TripPlan.model_validate_json(fixed_json)
    except Exception as e:
        logger.warning(f"Failed to parse fixed JSON: {e}")

    # 尝试 json.loads 后验证
    try:
        data = json.loads(json_str)
        return TripPlan.model_validate(data)
    except Exception as e:
        logger.error(f"Failed to validate TripPlan: {e}")

    return None


def parse_trip_plan_with_retry(raw_text: str, max_retries: int = 1) -> Optional[TripPlan]:
    """
    解析 TripPlan，失败时重试

    Args:
        raw_text: LLM 返回的原始文本
        max_retries: 最大重试次数

    Returns:
        TripPlan 对象，解析失败返回 None
    """
    result = parse_trip_plan(raw_text)
    if result:
        return result

    # 如果第一次失败，尝试更激进的修复
    for i in range(max_retries):
        logger.info(f"Retry {i + 1}/{max_retries} for JSON parsing")

        # 尝试提取更宽松的 JSON
        try:
            # 移除所有非 JSON 内容
            lines = raw_text.split('\n')
            json_lines = []
            in_json = False
            for line in lines:
                if '{' in line:
                    in_json = True
                if in_json:
                    json_lines.append(line)
                if '}' in line and in_json:
                    in_json = False

            if json_lines:
                json_str = '\n'.join(json_lines)
                result = parse_trip_plan(json_str)
                if result:
                    return result
        except Exception as e:
            logger.error(f"Retry {i + 1} failed: {e}")

    return None
