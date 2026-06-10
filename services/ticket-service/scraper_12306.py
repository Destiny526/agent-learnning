"""12306 实时票务抓取模块"""
import requests
from datetime import datetime
from typing import Optional

# 常用站名 → 站码映射
STATION_CODES = {
    "北京": "BJP", "北京南": "VNP", "北京西": "BXP", "北京北": "VAP",
    "上海": "SHH", "上海虹桥": "AOH", "上海南": "SNH", "上海西": "SXH",
    "广州": "GZQ", "广州南": "IZQ", "广州东": "GGQ", "广州北": "GBQ",
    "深圳": "SZQ", "深圳北": "IOQ", "深圳东": "BJQ", "深圳西": "SBQ",
    "成都": "CDW", "成都东": "ICW", "重庆": "CQW", "重庆北": "CUW",
    "杭州": "HZH", "杭州东": "HGH", "南京": "NJH", "南京南": "NKH",
    "武汉": "WHN", "汉口": "HKN", "武昌": "WCN",
    "西安": "XAY", "西安北": "EAY", "天津": "TJP", "天津西": "TXP",
    "长沙": "CSQ", "长沙南": "CWQ", "郑州": "ZZF", "郑州东": "ZAF",
    "济南": "JNK", "济南西": "JGK", "青岛": "QDK", "青岛北": "QHK",
    "苏州": "SZH", "苏州北": "OHH", "无锡": "WXH", "无锡东": "WGH",
    "合肥": "HFH", "合肥南": "ENH", "福州": "FZS", "福州南": "FYS",
    "厦门": "XMS", "厦门北": "XKS", "南昌": "NCG", "南昌西": "NXG",
    "昆明": "KMM", "昆明南": "KOM", "贵阳": "GIW", "贵阳北": "KQW",
    "哈尔滨": "HBB", "哈尔滨西": "VAB", "长春": "CCT", "长春西": "CRT",
    "沈阳": "SYT", "沈阳北": "SBT", "大连": "DLT", "大连北": "DFT",
    "石家庄": "SJP", "石家庄东": "SXP", "太原": "TYV", "太原南": "TNV",
    "兰州": "LZJ", "兰州西": "LAJ", "乌鲁木齐": "WMR", "南宁": "NNZ",
    "海口": "VUQ", "三亚": "SEQ", "拉萨": "LSO",
}


def _get_session() -> requests.Session:
    """创建带 cookie 的会话"""
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://kyfw.12306.cn/otn/leftTicket/init",
    })
    try:
        s.get("https://kyfw.12306.cn/otn/leftTicket/init", timeout=10)
    except Exception:
        pass
    return s


def _resolve_station(name: str) -> Optional[str]:
    """城市名 → 站码"""
    if name in STATION_CODES:
        return STATION_CODES[name]
    # 模糊匹配：包含关键词
    for city, code in STATION_CODES.items():
        if city in name or name in city:
            return code
    return None


def _calc_minutes(time_str: str) -> int:
    """HH:MM 时间差 → 分钟数"""
    try:
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0


def _parse_train(entry: str, station_map: dict) -> Optional[dict]:
    """解析单条列车数据"""
    parts = entry.split("|")
    if len(parts) < 50:
        return None

    train_no = parts[3]          # G547
    from_code = parts[6]         # 出发站码
    to_code = parts[7]           # 到达站码
    depart = parts[8]            # 06:18
    arrive = parts[9]            # 12:11
    duration = parts[10]         # 05:53
    can_book = parts[11]         # Y/N
    date_str = parts[13]         # 20260608

    if can_book != "Y":
        return None

    # 解析座位信息 — 根据车次类型判断
    def _parse_count(val: str) -> int:
        """解析座位数量：有=100, 无/--=0, 数字=数字"""
        if not val or val in ("无", "--", "", "null"):
            return 0
        if val == "有":
            return 100
        try:
            return int(val)
        except ValueError:
            return 0

    is_g = train_no.startswith(("G", "C", "D"))
    seat_info = {}

    if is_g:
        # 高铁/动车: 30=二等座, 31=一等座, 32=商务座/特等座, 33=动卧
        seat_info = {
            "second_class": _parse_count(parts[30]) if len(parts) > 30 else 0,
            "first_class": _parse_count(parts[31]) if len(parts) > 31 else 0,
            "business": _parse_count(parts[32]) if len(parts) > 32 else 0,
            "sleeper": _parse_count(parts[33]) if len(parts) > 33 else 0,
        }
    else:
        # 普通列车: 29=硬座, 30=软座, 31=硬卧, 32=软卧, 33=高级软卧
        seat_info = {
            "hard_seat": _parse_count(parts[29]) if len(parts) > 29 else 0,
            "soft_seat": _parse_count(parts[30]) if len(parts) > 30 else 0,
            "hard_sleeper": _parse_count(parts[31]) if len(parts) > 31 else 0,
            "soft_sleeper": _parse_count(parts[32]) if len(parts) > 32 else 0,
        }

    # 无座
    no_seat_count = _parse_count(parts[26]) if len(parts) > 26 else 0

    # 判断票务类型
    if train_no.startswith(("G", "C")):
        ticket_type = "high_speed"
    elif train_no.startswith("D"):
        ticket_type = "high_speed"
    else:
        ticket_type = "train"

    # 构建可用座位列表（排除无座，无座作为备选）
    available_seats = []
    for seat_type, count in seat_info.items():
        if count > 0:
            available_seats.append({"type": seat_type, "count": count})

    if no_seat_count > 0:
        available_seats.append({"type": "no_seat", "count": no_seat_count})

    from_name = station_map.get(from_code, from_code)
    to_name = station_map.get(to_code, to_code)

    return {
        "train_no": train_no,
        "ticket_type": ticket_type,
        "origin": from_name,
        "destination": to_name,
        "origin_code": from_code,
        "destination_code": to_code,
        "departure_time": f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]} {depart}",
        "arrival_time": f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]} {arrive}",
        "duration": _calc_minutes(duration),
        "duration_str": duration,
        "can_book": can_book == "Y",
        "seats": available_seats,
        "seat_info": seat_info,
        "no_seat": no_seat_count,
    }


def _get_station_map(session: requests.Session) -> dict:
    """获取站码 → 站名映射"""
    try:
        r = session.get("https://kyfw.12306.cn/otn/resources/js/framework/station_name.js", timeout=10)
        # 格式: @bjb|北京北|VAP|beijingbei|bjb|0
        mapping = {}
        for part in r.text.split("@"):
            fields = part.split("|")
            if len(fields) >= 4:
                mapping[fields[2]] = fields[1]  # code -> name
        return mapping
    except Exception:
        return {}


def fetch_tickets(origin: str, destination: str, date: str) -> list[dict]:
    """
    从 12306 抓取实时票务数据

    Args:
        origin: 出发城市名 (如 "北京")
        destination: 到达城市名 (如 "上海")
        date: 日期 YYYY-MM-DD

    Returns:
        解析后的票务列表
    """
    from_code = _resolve_station(origin)
    to_code = _resolve_station(destination)

    if not from_code or not to_code:
        return []

    session = _get_session()
    station_map = _get_station_map(session)

    try:
        r = session.get(
            "https://kyfw.12306.cn/otn/leftTicket/query",
            params={
                "leftTicketDTO.train_date": date,
                "leftTicketDTO.from_station": from_code,
                "leftTicketDTO.to_station": to_code,
                "purpose_codes": "ADULT",
            },
            timeout=15,
        )
        data = r.json()
    except Exception as e:
        print(f"12306 API error: {e}")
        return []

    if data.get("httpstatus") != 200 or "data" not in data:
        return []

    results = []
    for entry in data["data"].get("result", []):
        train = _parse_train(entry, station_map)
        if train and train["can_book"]:
            results.append(train)

    return results


def fetch_flights(origin: str, destination: str, date: str) -> list[dict]:
    """航班数据（暂用模拟数据，可接入携程/去哪儿 API）"""
    # 航班数据源较难直接抓取，返回空让系统走原有推荐逻辑
    return []


if __name__ == "__main__":
    import sys
    o = sys.argv[1] if len(sys.argv) > 1 else "北京"
    d = sys.argv[2] if len(sys.argv) > 2 else "上海"
    dt = sys.argv[3] if len(sys.argv) > 3 else "2026-06-08"
    tickets = fetch_tickets(o, d, dt)
    for t in tickets:
        seats = ", ".join(f"{s['type']}:{s['count']}" for s in t["seats"]) or "无票"
        print(f"{t['train_no']:8s} {t['origin']}→{t['destination']} {t['departure_time']}→{t['arrival_time']} {t['duration_str']} [{seats}]")
