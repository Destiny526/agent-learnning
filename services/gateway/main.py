"""API Gateway - 统一入口，转发请求到各微服务"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from datetime import datetime, timezone
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="AI Travel Assistant - Gateway",
    version="2.0.0",
    description="API Gateway for AI Travel Assistant",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ─────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "test-secret-key-for-dev")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

SERVICE_URLS = {
    "user": os.getenv("USER_SERVICE_URL", "http://localhost:8001"),
    "ticket": os.getenv("TICKET_SERVICE_URL", "http://localhost:8002"),
    "ai": os.getenv("AI_SERVICE_URL", "http://localhost:8003"),
    "order": os.getenv("ORDER_SERVICE_URL", "http://localhost:8004"),
    "notification": os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8005"),
}

# ── 公开接口白名单（不需要 JWT 验证）───────────────────────────────────

PUBLIC_PATHS = {
    "/",
    "/api/health",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/tickets/search",
    "/api/tickets/recommend",
    "/api/ai/config",
    "/docs",
    "/openapi.json",
    "/redoc",
}

# 前缀匹配的公开路径
PUBLIC_PREFIXES = [
    "/api/tickets/detail",
    "/api/ai/recommend",
    "/api/ai/trip-plan",
    "/api/ai/tasks",
    "/api/ai/health",
]


# ── JWT 辅助函数 ──────────────────────────────────────────────────────

def _extract_user_id(payload: dict) -> int | None:
    """从 JWT payload 提取用户 ID，兼容新旧两种格式"""
    # 优先取 sub（标准格式）
    sub = payload.get("sub")
    if sub is not None:
        try:
            return int(sub)
        except (ValueError, TypeError):
            pass
    # 兼容旧前端格式 { userId, phone }
    user_id = payload.get("userId")
    if user_id is not None:
        try:
            return int(user_id)
        except (ValueError, TypeError):
            pass
    return None


def _extract_user_role(payload: dict, user_id: int) -> str:
    """从 JWT payload 提取用户角色，暂时简单判断"""
    # 优先从 payload 中获取角色
    role = payload.get("role")
    if role:
        return role
    # 默认为普通用户（后续可从数据库或缓存查询真实角色）
    return "admin" if user_id == 1 else "user"


# ── 全局鉴权中间件 ────────────────────────────────────────────────────

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """全局鉴权中间件：拦截所有请求，验证 JWT 并注入用户信息"""
    path = request.url.path

    # 1. 公开接口直接放行
    if path in PUBLIC_PATHS:
        return await call_next(request)

    # 前缀匹配检查
    for prefix in PUBLIC_PREFIXES:
        if path.startswith(prefix):
            return await call_next(request)

    # 2. 提取 Authorization header
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"detail": "Not authenticated"}
        )

    token = auth_header[7:]

    # 3. 解析 JWT
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid token"}
        )

    # 4. 提取用户信息
    user_id = _extract_user_id(payload)
    if user_id is None:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid token payload"}
        )

    # 5. 提取角色信息
    user_role = _extract_user_role(payload, user_id)

    # 6. 注入到 request.state 供路由函数使用
    request.state.user_id = user_id
    request.state.user_role = user_role
    request.state.token = token

    response = await call_next(request)
    return response


# ── Helpers ────────────────────────────────────────────────────────

async def _forward(method: str, url: str, request: Request = None, **kwargs) -> JSONResponse:
    """通用请求转发，返回 JSONResponse，自动注入用户信息到请求头"""
    headers = kwargs.pop("headers", {})

    # 从 request.state 注入用户信息到下游请求头
    if request and hasattr(request.state, "user_id"):
        headers["X-User-Id"] = str(request.state.user_id)
        headers["X-User-Role"] = request.state.user_role
        # 保留原始 Authorization header
        if hasattr(request.state, "token"):
            headers["Authorization"] = f"Bearer {request.state.token}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = getattr(client, method)
            response = await resp(url, headers=headers, **kwargs)
            return JSONResponse(
                status_code=response.status_code,
                content=response.json() if response.content else None,
            )
        except httpx.ConnectError:
            return JSONResponse(status_code=503, content={"detail": "Service unavailable"})
        except Exception as e:
            return JSONResponse(status_code=500, content={"detail": str(e)})


# ── Auth (公开接口) ────────────────────────────────────────────────

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "gateway"}


@app.get("/api/health")
async def api_health_check():
    """API 健康检查端点"""
    return {
        "status": "healthy",
        "service": "gateway",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "user": SERVICE_URLS["user"],
            "ticket": SERVICE_URLS["ticket"],
            "ai": SERVICE_URLS["ai"],
            "order": SERVICE_URLS["order"],
            "notification": SERVICE_URLS["notification"],
        }
    }


@app.post("/api/auth/register")
async def register(request: Request):
    return await _forward("post", f"{SERVICE_URLS['user']}/api/auth/register", json=await request.json())


@app.post("/api/auth/login")
async def login(request: Request):
    return await _forward("post", f"{SERVICE_URLS['user']}/api/auth/login", json=await request.json())


@app.post("/api/auth/refresh")
async def refresh(request: Request):
    return await _forward("post", f"{SERVICE_URLS['user']}/api/auth/refresh", json=await request.json())


# ── User (需登录) ─────────────────────────────────────────────────

@app.get("/api/user/profile")
async def get_profile(request: Request):
    return await _forward("get", f"{SERVICE_URLS['user']}/api/user/profile", request=request)


@app.put("/api/user/profile")
async def update_profile(request: Request):
    return await _forward("put", f"{SERVICE_URLS['user']}/api/user/profile",
                          json=await request.json(), request=request)


@app.delete("/api/user/profile")
async def delete_profile(request: Request):
    return await _forward("delete", f"{SERVICE_URLS['user']}/api/user/profile", request=request)


@app.post("/api/user/change-password")
async def change_password(request: Request):
    return await _forward("post", f"{SERVICE_URLS['user']}/api/user/change-password",
                          json=await request.json(), request=request)


# ── Tickets (公开接口，不需要登录) ─────────────────────────────────

@app.get("/api/tickets/search")
async def search_tickets(request: Request):
    return await _forward("get", f"{SERVICE_URLS['ticket']}/api/tickets/search",
                          params=dict(request.query_params))


@app.post("/api/tickets/search/{ticket_type}")
async def search_tickets_by_type(ticket_type: str, request: Request):
    """按类型搜索票务（前端调用）"""
    body = await request.json()
    params = {
        "origin": body.get("origin", ""),
        "destination": body.get("destination", ""),
        "date": body.get("departure_date", body.get("date", "")),
        "ticket_type": ticket_type,
    }
    return await _forward("get", f"{SERVICE_URLS['ticket']}/api/tickets/search", params=params)


@app.get("/api/tickets/recommend")
async def recommend_tickets(request: Request):
    return await _forward("get", f"{SERVICE_URLS['ticket']}/api/tickets/recommend",
                          params=dict(request.query_params))


@app.get("/api/tickets/detail/{ticket_id}")
async def get_ticket_detail(ticket_id: int):
    return await _forward("get", f"{SERVICE_URLS['ticket']}/api/tickets/detail/{ticket_id}")


# ── AI Recommend (公开接口) ───────────────────────────────────────

def _to_frontend_item(item: dict, item_type: str = None) -> dict:
    """将后端票务数据转为前端 RecommendResult 格式"""
    t = item_type or item.get("ticket_type", "unknown")
    TYPE_TITLES = {"train": "火车", "high_speed": "高铁", "flight": "飞机"}
    train_no = item.get("train_no", item.get("ticket_id", ""))
    origin = item.get("origin", "")
    destination = item.get("destination", "")
    title = f"{train_no} {origin} → {destination}" if train_no else f"{origin} → {destination}"
    desc_parts = []
    if item.get("seat_type"):
        desc_parts.append(str(item["seat_type"]))
    if item.get("duration_str"):
        desc_parts.append(item["duration_str"])
    elif item.get("duration"):
        desc_parts.append(f"{int(item['duration'])//60}h{int(item['duration'])%60}m")

    return {
        "item_id": str(item.get("id", item.get("ticket_id", train_no))),
        "item_type": t,
        "title": title,
        "description": " | ".join(desc_parts) if desc_parts else TYPE_TITLES.get(t, t),
        "price": float(item.get("price", 0)),
        "currency": "CNY",
        "score": float(item.get("score", 0)),
        "origin": origin,
        "destination": destination,
        "departure_time": str(item.get("departure_time", "")),
        "arrival_time": str(item.get("arrival_time", "")),
        "duration_minutes": item.get("duration"),
        "seat_type": item.get("seat_type"),
        "availability": item.get("available_seats", 0) > 0,
        "metadata": item.get("score_breakdown", {}),
    }


def _build_backend_params(body: dict) -> dict:
    """前端参数 → 后端参数"""
    # 前端 departure_date (YYYY-MM-DD) → 后端 expected_time (ISO datetime)
    date = body.get("departure_date", "")
    preferred = body.get("preferred_time", "")
    time_map = {"morning": "09:00:00", "afternoon": "14:00:00", "evening": "20:00:00"}
    time_part = time_map.get(preferred, "10:00:00")
    expected_time = f"{date}T{time_part}" if date else "2026-06-08T10:00:00"

    return {
        "origin": body.get("origin", ""),
        "destination": body.get("destination", ""),
        "expected_time": expected_time,
        "budget_max": body.get("budget_max"),
    }


@app.post("/api/ai/recommend")
async def ai_recommend(request: Request):
    body = await request.json()
    params = _build_backend_params(body) if "departure_date" in body else body
    async with httpx.AsyncClient(timeout=20.0) as client:
        # 先从 ticket-service 获取实时 12306 数据
        try:
            t_resp = await client.get(f"{SERVICE_URLS['ticket']}/api/tickets/search", params={
                "origin": params["origin"],
                "destination": params["destination"],
                "date": params["expected_time"][:10],
            })
            tickets = t_resp.json()
        except Exception:
            tickets = []

        # 调用 AI 服务评分
        try:
            resp = await client.post(f"{SERVICE_URLS['ai']}/api/ai/recommend", json=params)
            data = resp.json()
        except Exception:
            data = {"all_options": []}

    # 合并：AI 评分结果 + 12306 实时数据
    if "all_options" in data and data["all_options"]:
        items = [_to_frontend_item(o) for o in data["all_options"]]
    elif tickets:
        # AI 没有数据时，直接用 12306 数据
        items = [_to_frontend_item(t) for t in tickets]
    else:
        items = []
    return JSONResponse(content=items)


@app.post("/api/ai/recommend/all")
async def ai_recommend_all(request: Request):
    """全类型推荐 — 前端主入口（从 12306 实时获取 + AI 评分）"""
    import json as _json
    try:
        body = await request.json()
    except Exception:
        raw = await request.body()
        for enc in ("utf-8", "gbk", "gb2312", "latin-1"):
            try:
                body = _json.loads(raw.decode(enc))
                break
            except Exception:
                continue
        else:
            return JSONResponse(status_code=400, content={"detail": "Cannot decode request body"})
    origin = body.get("origin", "")
    destination = body.get("destination", "")
    date = body.get("departure_date", "")

    async with httpx.AsyncClient(timeout=20.0) as client:
        # 从 12306 获取实时数据
        try:
            t_resp = await client.get(
                f"{SERVICE_URLS['ticket']}/api/tickets/search",
                params={"origin": origin, "destination": destination, "date": date}
            )
            all_tickets = t_resp.json()
        except Exception:
            all_tickets = []

    # 按类型分组
    results = {"train": [], "high_speed": [], "flight": []}
    for t in all_tickets:
        ttype = t.get("ticket_type", "train")
        if ttype in results:
            results[ttype].append(_to_frontend_item(t, ttype))

    return JSONResponse(content=results)


@app.post("/api/ai/recommend/{ticket_type}")
async def ai_recommend_by_type(ticket_type: str, request: Request):
    body = await request.json()
    origin = body.get("origin", "")
    destination = body.get("destination", "")
    date = body.get("departure_date", "")

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            t_resp = await client.get(f"{SERVICE_URLS['ticket']}/api/tickets/search", params={
                "origin": origin,
                "destination": destination,
                "date": date,
                "ticket_type": ticket_type,
            })
            tickets = t_resp.json()
        except Exception:
            tickets = []

    items = [_to_frontend_item(t, ticket_type) for t in tickets]
    return JSONResponse(content=items)


@app.get("/api/ai/config")
async def ai_config():
    return await _forward("get", f"{SERVICE_URLS['ai']}/api/ai/config")


@app.get("/api/ai/health")
async def ai_health():
    return await _forward("get", f"{SERVICE_URLS['ai']}/api/ai/health")


@app.post("/api/ai/trip-plan")
async def ai_trip_plan(request: Request):
    """LLM 行程规划（同步模式）"""
    return await _forward("post", f"{SERVICE_URLS['ai']}/api/ai/trip-plan",
                          json=await request.json())


@app.post("/api/ai/trip-plan/stream")
async def ai_trip_plan_stream(request: Request):
    """SSE 流式行程规划 - 流式透传"""
    from fastapi.responses import StreamingResponse

    body = await request.json()

    async def stream_generator():
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10, read=120, write=10, pool=10)) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{SERVICE_URLS['ai']}/api/ai/trip-plan/stream",
                    json=body,
                    headers={"Accept": "text/event-stream"},
                ) as resp:
                    async for chunk in resp.aiter_bytes():
                        yield chunk
            except Exception as e:
                yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n".encode()

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/ai/tasks/{task_id}")
async def ai_task_status(task_id: str, request: Request):
    """查询任务状态"""
    return await _forward("get", f"{SERVICE_URLS['ai']}/api/ai/tasks/{task_id}")


@app.get("/api/ai/tasks/{task_id}/stream")
async def ai_task_stream(task_id: str, request: Request):
    """SSE 监听任务进度 - 流式透传"""
    from fastapi.responses import StreamingResponse

    async def stream_generator():
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10, read=120, write=10, pool=10)) as client:
            try:
                async with client.stream(
                    "GET",
                    f"{SERVICE_URLS['ai']}/api/ai/tasks/{task_id}/stream",
                    headers={"Accept": "text/event-stream"},
                ) as resp:
                    async for chunk in resp.aiter_bytes():
                        yield chunk
            except Exception as e:
                yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n".encode()

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Orders (需登录) ───────────────────────────────────────────────

@app.post("/api/orders")
async def create_order(request: Request):
    return await _forward("post", f"{SERVICE_URLS['order']}/api/orders",
                          json=await request.json(), request=request)


@app.get("/api/orders")
async def get_orders(request: Request):
    return await _forward("get", f"{SERVICE_URLS['order']}/api/orders", request=request)


@app.get("/api/orders/{order_id}")
async def get_order(order_id: int, request: Request):
    return await _forward("get", f"{SERVICE_URLS['order']}/api/orders/{order_id}", request=request)


@app.delete("/api/orders/{order_id}")
async def cancel_order(order_id: int, request: Request):
    return await _forward("delete", f"{SERVICE_URLS['order']}/api/orders/{order_id}", request=request)


# ── Favorites (需登录) ────────────────────────────────────────────

@app.get("/api/favorites")
async def get_favorites(request: Request):
    return await _forward("get", f"{SERVICE_URLS['order']}/api/favorites", request=request)


@app.post("/api/favorites")
async def add_favorite(request: Request):
    body = await request.json()
    return await _forward("post", f"{SERVICE_URLS['order']}/api/favorites",
                          params={"ticket_id": body.get("ticket_id")}, request=request)


@app.delete("/api/favorites/{favorite_id}")
async def remove_favorite(favorite_id: int, request: Request):
    return await _forward("delete", f"{SERVICE_URLS['order']}/api/favorites/{favorite_id}", request=request)


# ── Notifications (需登录) ────────────────────────────────────────

@app.get("/api/notifications")
async def get_notifications(request: Request):
    user_id = request.state.user_id
    return await _forward("get", f"{SERVICE_URLS['notification']}/api/notifications/{user_id}",
                          params=dict(request.query_params), request=request)


@app.post("/api/notifications")
async def send_notification(request: Request):
    return await _forward("post", f"{SERVICE_URLS['notification']}/api/notifications",
                          json=await request.json(), request=request)


@app.patch("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, request: Request):
    return await _forward("patch",
                          f"{SERVICE_URLS['notification']}/api/notifications/{notification_id}/read",
                          request=request)


@app.patch("/api/notifications/read-all")
async def mark_all_notifications_read(request: Request):
    user_id = request.state.user_id
    return await _forward("patch",
                          f"{SERVICE_URLS['notification']}/api/notifications/{user_id}/read-all",
                          request=request)


@app.delete("/api/notifications/{notification_id}")
async def delete_notification(notification_id: int, request: Request):
    return await _forward("delete",
                          f"{SERVICE_URLS['notification']}/api/notifications/{notification_id}",
                          request=request)


# ── Admin (需登录 + 管理员角色) ────────────────────────────────────

@app.get("/api/admin/stats")
async def admin_stats(request: Request):
    """管理后台统计数据"""
    if request.state.user_role != "admin":
        return JSONResponse(status_code=403, content={"detail": "Admin access required"})
    return await _forward("get", f"{SERVICE_URLS['user']}/api/admin/stats", request=request)


@app.get("/api/admin/users")
async def admin_users(request: Request):
    """管理后台用户列表"""
    if request.state.user_role != "admin":
        return JSONResponse(status_code=403, content={"detail": "Admin access required"})
    return await _forward("get", f"{SERVICE_URLS['user']}/api/admin/users",
                          params=dict(request.query_params), request=request)


@app.get("/api/admin/orders")
async def admin_orders(request: Request):
    """管理后台订单列表"""
    if request.state.user_role != "admin":
        return JSONResponse(status_code=403, content={"detail": "Admin access required"})
    return await _forward("get", f"{SERVICE_URLS['order']}/api/admin/orders",
                          params=dict(request.query_params), request=request)


@app.get("/api/admin/favorites")
async def admin_favorites(request: Request):
    """管理后台收藏列表"""
    if request.state.user_role != "admin":
        return JSONResponse(status_code=403, content={"detail": "Admin access required"})
    return await _forward("get", f"{SERVICE_URLS['order']}/api/admin/favorites",
                          params=dict(request.query_params), request=request)


@app.get("/api/admin/notifications")
async def admin_notifications(request: Request):
    """管理后台通知列表"""
    if request.state.user_role != "admin":
        return JSONResponse(status_code=403, content={"detail": "Admin access required"})
    return await _forward("get", f"{SERVICE_URLS['notification']}/api/admin/notifications",
                          params=dict(request.query_params), request=request)


# ── 启动 ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
