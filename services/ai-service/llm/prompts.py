"""LLM Prompt Templates - Trip Plan Generation"""
from typing import List, Dict, Any


TRIP_PLAN_SYSTEM_PROMPT = """你是一个专业的旅行行程规划师。请根据用户需求生成详细的行程方案。

你必须以严格的 JSON 格式输出，结构如下：
{
  "summary": "行程概述（一句话描述这次旅行）",
  "total_estimated_cost": 3000.0,
  "outbound_transport": {
    "ticket_type": "高铁",
    "train_no": "G1234",
    "carrier": "中国铁路",
    "departure_time": "08:00",
    "arrival_time": "12:00",
    "duration": "4小时",
    "price": 553.0,
    "seat_type": "二等座",
    "recommendation_reason": "性价比最高的选择"
  },
  "inbound_transport": {
    "ticket_type": "高铁",
    "train_no": "G5678",
    "carrier": "中国铁路",
    "departure_time": "18:00",
    "arrival_time": "22:00",
    "duration": "4小时",
    "price": 553.0,
    "seat_type": "二等座",
    "recommendation_reason": "返程时间合适"
  },
  "hotel_recommendation": {
    "name": "XX酒店",
    "price_per_night": 350.0,
    "nights": 2,
    "location": "市中心",
    "rating": 4.5,
    "recommendation_reason": "位置优越，性价比高"
  },
  "daily_itinerary": [
    {
      "day": 1,
      "title": "第一天：抵达与探索",
      "events": [
        {"time": "12:00", "title": "抵达目的地", "detail": "到达XX站", "icon": "train"},
        {"time": "13:00", "title": "午餐", "detail": "品尝当地特色美食", "icon": "food"},
        {"time": "15:00", "title": "景点游览", "detail": "参观XX景点", "icon": "sightseeing"},
        {"time": "19:00", "title": "晚餐", "detail": "XX餐厅", "icon": "food"}
      ]
    }
  ],
  "tips": [
    "建议提前预订酒店",
    "当地交通以地铁为主",
    "注意天气变化"
  ],
  "budget_analysis": {
    "transport": 1106.0,
    "hotel": 700.0,
    "meals": 500.0,
    "attractions": 400.0,
    "total": 2706.0,
    "remaining": 294.0
  }
}

重要规则：
1. 必须输出合法的 JSON，不要包含任何非 JSON 内容
2. 所有价格为人民币（CNY）
3. 时间格式为 HH:MM
4. 根据用户预算合理分配费用
5. 行程要实际可行，考虑交通时间
6. 推荐理由要具体有说服力"""


TRIP_PLAN_USER_TEMPLATE = """请为我规划一次旅行：

出发地：{origin}
目的地：{destination}
旅行天数：{days} 天
预算：{budget} 元
{preferences_section}

{rag_context_section}

{candidates_section}

请根据以上信息生成详细的行程方案，输出严格的 JSON 格式。"""


def build_trip_plan_messages(
    origin: str,
    destination: str,
    days: int,
    budget: float,
    preferences: str = None,
    rag_context: dict = None,
    candidates: list = None,
) -> List[Dict[str, str]]:
    """构建 LLM 消息列表"""
    # 构建偏好部分
    preferences_section = ""
    if preferences:
        preferences_section = f"个人偏好：{preferences}"

    # 构建 RAG 上下文部分
    rag_context_section = ""
    if rag_context:
        hotels = rag_context.get("hotels", [])
        attractions = rag_context.get("attractions", [])

        if hotels:
            rag_context_section += "推荐酒店：\n"
            for h in hotels[:3]:
                rag_context_section += f"- {h.get('name', '未知')}：{h.get('description', '')}\n"

        if attractions:
            rag_context_section += "推荐景点：\n"
            for a in attractions[:5]:
                rag_context_section += f"- {a.get('name', '未知')}：{a.get('description', '')}\n"

    # 构建候选票务部分
    candidates_section = ""
    if candidates:
        candidates_section = "候选交通方案：\n"
        for c in candidates[:5]:
            candidates_section += (
                f"- {c.get('train_no', '')} {c.get('origin', '')}→{c.get('destination', '')} "
                f"{c.get('departure_time', '')}-{c.get('arrival_time', '')} "
                f"{c.get('seat_type', '')} ¥{c.get('price', 0)}\n"
            )

    user_content = TRIP_PLAN_USER_TEMPLATE.format(
        origin=origin,
        destination=destination,
        days=days,
        budget=budget,
        preferences_section=preferences_section,
        rag_context_section=rag_context_section,
        candidates_section=candidates_section,
    )

    return [
        {"role": "system", "content": TRIP_PLAN_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
