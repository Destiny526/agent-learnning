# AI智能行程助手

基于 AI 推荐引擎的智能出行平台。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15 + TypeScript + TailwindCSS + Zustand |
| 网关 | FastAPI |
| 后端 | FastAPI (Python 3.12) |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis 7 |
| 部署 | Docker + Docker Compose + Nginx |

## 服务列表

| 服务 | 端口 | 职责 |
|------|------|------|
| frontend | 3000 | 用户界面 |
| gateway | 8000 | API 统一入口、JWT 验证 |
| user-service | 8001 | 用户注册、登录、信息管理 |
| ticket-service | 8002 | 票务查询、数据缓存 |
| ai-service | 8003 | 智能推荐算法 |
| order-service | 8004 | 订单管理、收藏 |
| notification-service | 8005 | 通知服务 |

## 快速启动

```bash
# Docker 一键启动
bash scripts/start.sh

# 或手动
cp .env.example .env
docker-compose up -d --build
```

## 本地开发

```bash
# 前端
cd frontend && npm install && npm run dev

# 后端 (以 gateway 为例)
cd gateway && pip install -r requirements.txt && python main.py
```

## 访问地址

- 前端: http://localhost:3000
- API 文档: http://localhost:8000/docs
- Nginx: http://localhost:80
