"""航班数据模块 — 基于真实航班时刻表的模拟数据"""
from datetime import datetime, timedelta
from typing import Optional
import random

# 真实航班时刻表（常见国内航线）
FLIGHT_SCHEDULES = {
    ("北京", "上海"): [
        {"flight": "CA1501", "airline": "中国国航", "depart": "07:00", "arrive": "09:15", "duration": 135, "aircraft": "A330"},
        {"flight": "MU5101", "airline": "东方航空", "depart": "07:30", "arrive": "09:45", "duration": 135, "aircraft": "A320"},
        {"flight": "CZ6519", "airline": "南方航空", "depart": "08:00", "arrive": "10:20", "duration": 140, "aircraft": "B738"},
        {"flight": "CA1519", "airline": "中国国航", "depart": "08:30", "arrive": "10:45", "duration": 135, "aircraft": "A321"},
        {"flight": "MU5113", "airline": "东方航空", "depart": "09:00", "arrive": "11:15", "duration": 135, "aircraft": "A330"},
        {"flight": "CA1521", "airline": "中国国航", "depart": "10:00", "arrive": "12:15", "duration": 135, "aircraft": "B738"},
        {"flight": "CZ6521", "airline": "南方航空", "depart": "11:00", "arrive": "13:20", "duration": 140, "aircraft": "A320"},
        {"flight": "MU5125", "airline": "东方航空", "depart": "12:00", "arrive": "14:15", "duration": 135, "aircraft": "A321"},
        {"flight": "CA1533", "airline": "中国国航", "depart": "13:30", "arrive": "15:45", "duration": 135, "aircraft": "B738"},
        {"flight": "MU5137", "airline": "东方航空", "depart": "14:30", "arrive": "16:45", "duration": 135, "aircraft": "A330"},
        {"flight": "CZ6533", "airline": "南方航空", "depart": "15:30", "arrive": "17:50", "duration": 140, "aircraft": "A320"},
        {"flight": "CA1551", "airline": "中国国航", "depart": "16:30", "arrive": "18:45", "duration": 135, "aircraft": "A321"},
        {"flight": "MU5151", "airline": "东方航空", "depart": "17:30", "arrive": "19:45", "duration": 135, "aircraft": "B738"},
        {"flight": "CA1563", "airline": "中国国航", "depart": "18:30", "arrive": "20:45", "duration": 135, "aircraft": "A330"},
        {"flight": "CZ6551", "airline": "南方航空", "depart": "19:30", "arrive": "21:50", "duration": 140, "aircraft": "A320"},
        {"flight": "MU5165", "airline": "东方航空", "depart": "20:30", "arrive": "22:45", "duration": 135, "aircraft": "A321"},
    ],
    ("北京", "广州"): [
        {"flight": "CA1301", "airline": "中国国航", "depart": "07:00", "arrive": "10:00", "duration": 180, "aircraft": "A330"},
        {"flight": "CZ3102", "airline": "南方航空", "depart": "08:00", "arrive": "11:00", "duration": 180, "aircraft": "B787"},
        {"flight": "MU3001", "airline": "东方航空", "depart": "09:30", "arrive": "12:30", "duration": 180, "aircraft": "A320"},
        {"flight": "CA1313", "airline": "中国国航", "depart": "11:00", "arrive": "14:00", "duration": 180, "aircraft": "A330"},
        {"flight": "CZ3118", "airline": "南方航空", "depart": "13:00", "arrive": "16:00", "duration": 180, "aircraft": "B738"},
        {"flight": "CA1325", "airline": "中国国航", "depart": "15:00", "arrive": "18:00", "duration": 180, "aircraft": "A321"},
        {"flight": "CZ3132", "airline": "南方航空", "depart": "17:00", "arrive": "20:00", "duration": 180, "aircraft": "B787"},
        {"flight": "MU3013", "airline": "东方航空", "depart": "19:00", "arrive": "22:00", "duration": 180, "aircraft": "A330"},
    ],
    ("北京", "深圳"): [
        {"flight": "CA1303", "airline": "中国国航", "depart": "07:30", "arrive": "10:45", "duration": 195, "aircraft": "A330"},
        {"flight": "ZH9102", "airline": "深圳航空", "depart": "08:30", "arrive": "11:45", "duration": 195, "aircraft": "A320"},
        {"flight": "CZ3156", "airline": "南方航空", "depart": "10:00", "arrive": "13:15", "duration": 195, "aircraft": "B738"},
        {"flight": "CA1315", "airline": "中国国航", "depart": "12:00", "arrive": "15:15", "duration": 195, "aircraft": "A321"},
        {"flight": "ZH9118", "airline": "深圳航空", "depart": "14:00", "arrive": "17:15", "duration": 195, "aircraft": "A330"},
        {"flight": "CZ3172", "airline": "南方航空", "depart": "16:00", "arrive": "19:15", "duration": 195, "aircraft": "B787"},
        {"flight": "CA1333", "airline": "中国国航", "depart": "18:00", "arrive": "21:15", "duration": 195, "aircraft": "A320"},
        {"flight": "ZH9136", "airline": "深圳航空", "depart": "20:00", "arrive": "23:15", "duration": 195, "aircraft": "A321"},
    ],
    ("上海", "广州"): [
        {"flight": "CZ3522", "airline": "南方航空", "depart": "07:00", "arrive": "09:30", "duration": 150, "aircraft": "A330"},
        {"flight": "MU5301", "airline": "东方航空", "depart": "08:30", "arrive": "11:00", "duration": 150, "aircraft": "B738"},
        {"flight": "CA1833", "airline": "中国国航", "depart": "10:00", "arrive": "12:30", "duration": 150, "aircraft": "A320"},
        {"flight": "CZ3538", "airline": "南方航空", "depart": "13:00", "arrive": "15:30", "duration": 150, "aircraft": "B787"},
        {"flight": "MU5315", "airline": "东方航空", "depart": "15:00", "arrive": "17:30", "duration": 150, "aircraft": "A321"},
        {"flight": "CZ3556", "airline": "南方航空", "depart": "17:30", "arrive": "20:00", "duration": 150, "aircraft": "A330"},
        {"flight": "CA1851", "airline": "中国国航", "depart": "19:00", "arrive": "21:30", "duration": 150, "aircraft": "B738"},
        {"flight": "MU5333", "airline": "东方航空", "depart": "21:00", "arrive": "23:30", "duration": 150, "aircraft": "A320"},
    ],
    ("上海", "深圳"): [
        {"flight": "ZH9104", "airline": "深圳航空", "depart": "07:30", "arrive": "10:00", "duration": 150, "aircraft": "A320"},
        {"flight": "MU5305", "airline": "东方航空", "depart": "09:00", "arrive": "11:30", "duration": 150, "aircraft": "B738"},
        {"flight": "CZ3576", "airline": "南方航空", "depart": "11:00", "arrive": "13:30", "duration": 150, "aircraft": "A330"},
        {"flight": "CA1883", "airline": "中国国航", "depart": "13:00", "arrive": "15:30", "duration": 150, "aircraft": "A321"},
        {"flight": "ZH9126", "airline": "深圳航空", "depart": "15:30", "arrive": "18:00", "duration": 150, "aircraft": "B787"},
        {"flight": "MU5321", "airline": "东方航空", "depart": "17:30", "arrive": "20:00", "duration": 150, "aircraft": "A320"},
        {"flight": "CZ3592", "airline": "南方航空", "depart": "19:30", "arrive": "22:00", "duration": 150, "aircraft": "A321"},
    ],
    ("成都", "北京"): [
        {"flight": "CA4101", "airline": "中国国航", "depart": "07:00", "arrive": "09:30", "duration": 150, "aircraft": "A330"},
        {"flight": "3U8001", "airline": "四川航空", "depart": "08:30", "arrive": "11:00", "duration": 150, "aircraft": "A320"},
        {"flight": "CA4113", "airline": "中国国航", "depart": "10:00", "arrive": "12:30", "duration": 150, "aircraft": "B738"},
        {"flight": "CZ6101", "airline": "南方航空", "depart": "12:00", "arrive": "14:30", "duration": 150, "aircraft": "A321"},
        {"flight": "3U8013", "airline": "四川航空", "depart": "14:30", "arrive": "17:00", "duration": 150, "aircraft": "A330"},
        {"flight": "CA4125", "airline": "中国国航", "depart": "16:30", "arrive": "19:00", "duration": 150, "aircraft": "B787"},
        {"flight": "CZ6119", "airline": "南方航空", "depart": "18:30", "arrive": "21:00", "duration": 150, "aircraft": "A320"},
        {"flight": "3U8025", "airline": "四川航空", "depart": "20:30", "arrive": "23:00", "duration": 150, "aircraft": "A321"},
    ],
    ("成都", "上海"): [
        {"flight": "CA4501", "airline": "中国国航", "depart": "07:30", "arrive": "10:15", "duration": 165, "aircraft": "A330"},
        {"flight": "3U8031", "airline": "四川航空", "depart": "09:00", "arrive": "11:45", "duration": 165, "aircraft": "A320"},
        {"flight": "MU5401", "airline": "东方航空", "depart": "11:00", "arrive": "13:45", "duration": 165, "aircraft": "B738"},
        {"flight": "CA4513", "airline": "中国国航", "depart": "13:00", "arrive": "15:45", "duration": 165, "aircraft": "A321"},
        {"flight": "3U8045", "airline": "四川航空", "depart": "15:30", "arrive": "18:15", "duration": 165, "aircraft": "B787"},
        {"flight": "MU5415", "airline": "东方航空", "depart": "17:30", "arrive": "20:15", "duration": 165, "aircraft": "A330"},
        {"flight": "CA4525", "airline": "中国国航", "depart": "19:30", "arrive": "22:15", "duration": 165, "aircraft": "A320"},
    ],
    ("广州", "成都"): [
        {"flight": "CZ3401", "airline": "南方航空", "depart": "07:00", "arrive": "09:30", "duration": 150, "aircraft": "A330"},
        {"flight": "3U8051", "airline": "四川航空", "depart": "09:00", "arrive": "11:30", "duration": 150, "aircraft": "A320"},
        {"flight": "CA4301", "airline": "中国国航", "depart": "11:00", "arrive": "13:30", "duration": 150, "aircraft": "B738"},
        {"flight": "CZ3415", "airline": "南方航空", "depart": "14:00", "arrive": "16:30", "duration": 150, "aircraft": "A321"},
        {"flight": "3U8065", "airline": "四川航空", "depart": "16:00", "arrive": "18:30", "duration": 150, "aircraft": "B787"},
        {"flight": "CA4315", "airline": "中国国航", "depart": "18:30", "arrive": "21:00", "duration": 150, "aircraft": "A330"},
    ],
    ("深圳", "成都"): [
        {"flight": "ZH9101", "airline": "深圳航空", "depart": "07:30", "arrive": "10:15", "duration": 165, "aircraft": "A320"},
        {"flight": "3U8071", "airline": "四川航空", "depart": "09:30", "arrive": "12:15", "duration": 165, "aircraft": "A321"},
        {"flight": "CA4401", "airline": "中国国航", "depart": "12:00", "arrive": "14:45", "duration": 165, "aircraft": "B738"},
        {"flight": "ZH9115", "airline": "深圳航空", "depart": "14:30", "arrive": "17:15", "duration": 165, "aircraft": "A330"},
        {"flight": "3U8085", "airline": "四川航空", "depart": "17:00", "arrive": "19:45", "duration": 165, "aircraft": "B787"},
        {"flight": "CA4415", "airline": "中国国航", "depart": "19:30", "arrive": "22:15", "duration": 165, "aircraft": "A320"},
    ],
    ("杭州", "北京"): [
        {"flight": "CA1502", "airline": "中国国航", "depart": "07:00", "arrive": "09:15", "duration": 135, "aircraft": "A320"},
        {"flight": "MU5501", "airline": "东方航空", "depart": "08:30", "arrive": "10:45", "duration": 135, "aircraft": "B738"},
        {"flight": "CA1514", "airline": "中国国航", "depart": "10:30", "arrive": "12:45", "duration": 135, "aircraft": "A321"},
        {"flight": "MU5515", "airline": "东方航空", "depart": "13:00", "arrive": "15:15", "duration": 135, "aircraft": "A330"},
        {"flight": "CA1528", "airline": "中国国航", "depart": "15:30", "arrive": "17:45", "duration": 135, "aircraft": "B738"},
        {"flight": "MU5531", "airline": "东方航空", "depart": "18:00", "arrive": "20:15", "duration": 135, "aircraft": "A320"},
        {"flight": "CA1544", "airline": "中国国航", "depart": "20:00", "arrive": "22:15", "duration": 135, "aircraft": "A321"},
    ],
}

# 价格区间（经济舱/公务舱/头等舱）
PRICE_RANGES = {
    "economy": (500, 1800),
    "business": (1500, 5000),
    "first": (3000, 12000),
}

# 城市别名映射
CITY_ALIASES = {
    "北京": ["北京", "Beijing", "BJS"],
    "上海": ["上海", "Shanghai", "SHA"],
    "广州": ["广州", "Guangzhou", "CAN"],
    "深圳": ["深圳", "Shenzhen", "SZX"],
    "成都": ["成都", "Chengdu", "CTU"],
    "杭州": ["杭州", "Hangzhou", "HGH"],
    "南京": ["南京", "Nanjing", "NKG"],
    "武汉": ["武汉", "Wuhan", "WUH"],
    "西安": ["西安", "Xian", "XIY"],
    "重庆": ["重庆", "Chongqing", "CKG"],
}


def _resolve_city(name: str) -> Optional[str]:
    """城市名标准化"""
    for standard, aliases in CITY_ALIASES.items():
        if name in aliases or name.upper() in [a.upper() for a in aliases]:
            return standard
    return name


def _generate_price(base_low: int, base_high: int, date: str) -> int:
    """根据日期生成价格（周末/节假日更贵）"""
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
        # 周末加价
        weekend_add = 200 if dt.weekday() >= 5 else 0
        # 随机波动
        random.seed(hash(f"{date}{base_low}"))
        base = random.randint(base_low, base_high)
        return base + weekend_add
    except Exception:
        return (base_low + base_high) // 2


def fetch_flights(origin: str, destination: str, date: str) -> list[dict]:
    """
    获取航班数据

    Args:
        origin: 出发城市
        destination: 到达城市
        date: 日期 YYYY-MM-DD

    Returns:
        航班列表
    """
    origin_std = _resolve_city(origin)
    dest_std = _resolve_city(destination)

    key = (origin_std, dest_std)
    schedules = FLIGHT_SCHEDULES.get(key, [])

    if not schedules:
        # 尝试反向查找
        reverse_key = (dest_std, origin_std)
        if reverse_key in FLIGHT_SCHEDULES:
            # 反向航线，时间调整
            schedules = FLIGHT_SCHEDULES[reverse_key]

    results = []
    for flight in schedules:
        # 生成价格
        eco_price = _generate_price(PRICE_RANGES["economy"][0], PRICE_RANGES["economy"][1], date)
        biz_price = _generate_price(PRICE_RANGES["business"][0], PRICE_RANGES["business"][1], date)
        first_price = _generate_price(PRICE_RANGES["first"][0], PRICE_RANGES["first"][1], date)

        # 模拟座位余量
        random.seed(hash(f"{date}{flight['flight']}"))
        eco_seats = random.randint(0, 180)
        biz_seats = random.randint(0, 30)
        first_seats = random.randint(0, 8)

        # 选择最优舱位
        if eco_seats > 0:
            best_class = "经济舱"
            best_price = eco_price
            best_seats = eco_seats
        elif biz_seats > 0:
            best_class = "公务舱"
            best_price = biz_price
            best_seats = biz_seats
        elif first_seats > 0:
            best_class = "头等舱"
            best_price = first_price
            best_seats = first_seats
        else:
            continue  # 无票

        results.append({
            "flight_no": flight["flight"],
            "airline": flight["airline"],
            "origin": origin_std,
            "destination": dest_std,
            "departure_time": f"{date} {flight['depart']}",
            "arrival_time": f"{date} {flight['arrive']}",
            "duration": flight["duration"],
            "duration_str": f"{flight['duration']//60}h{flight['duration']%60}m",
            "aircraft": flight["aircraft"],
            "price": best_price,
            "seat_class": best_class,
            "available_seats": best_seats,
            "eco_price": eco_price,
            "biz_price": biz_price,
            "first_price": first_price,
        })

    return results


if __name__ == "__main__":
    import sys
    o = sys.argv[1] if len(sys.argv) > 1 else "北京"
    d = sys.argv[2] if len(sys.argv) > 2 else "上海"
    dt = sys.argv[3] if len(sys.argv) > 3 else "2026-06-08"
    flights = fetch_flights(o, d, dt)
    print(f"Found {len(flights)} flights {o}->{d} on {dt}")
    for f in flights:
        print(f"  {f['flight_no']:8s} {f['airline']:8s} {f['departure_time']} -> {f['arrival_time']}  {f['duration_str']}  {f['seat_class']} {f['price']}yuan  ({f['available_seats']} seats)")
