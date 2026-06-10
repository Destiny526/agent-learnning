# AI智能行程助手（AI Travel Assistant）系统架构文档

## 项目简介

AI智能行程助手是一款基于AI推荐引擎的智能出行平台。

用户输入：
- 出发地
- 目的地
- 出发时间

系统自动：
- 搜索火车票
- 搜索高铁票
- 搜索飞机票
- 推荐最优方案
- 推荐最近出发时间方案
- 推荐最低价格方案
- 推荐最快到达方案

未来扩展：
- 酒店推荐
- 景点推荐
- AI旅游攻略生成
- AI行程规划
- 行程日历管理
- 旅游社区

---

# 技术栈

## 前端
- Next.js 15
- TypeScript
- TailwindCSS
- Shadcn UI
- Zustand
- React Query

## 后端
- FastAPI
- Python 3.12

## 数据库
- MySQL 8.0

## 缓存
- Redis 7

## 认证
- JWT
- Refresh Token

## 部署
- Docker
- Docker Compose
- Nginx

---

# 系统架构

## Frontend
职责：用户界面、搜索页面、推荐结果页面、订单页面、收藏夹、个人中心

## Gateway Service
职责：API统一入口、JWT验证、请求转发、日志记录、限流

## User Service
职责：用户注册、用户登录、用户信息管理、用户偏好管理

## Ticket Service
职责：火车票查询、高铁票查询、飞机票查询、数据缓存、数据标准化

## AI Service
职责：智能推荐算法、时间匹配计算、价格评分计算、行程评分计算、用户偏好学习

## Order Service
职责：创建订单、查询订单、取消订单、收藏方案

## Notification Service
职责：系统通知、邮件通知、短信通知、行程提醒

---

# 数据库设计

## users
- id
- username
- email
- phone
- password_hash
- created_at

## tickets
- id
- ticket_type
- origin
- destination
- departure_time
- arrival_time
- duration
- price
- seat_type
- created_at

## orders
- id
- user_id
- ticket_id
- status
- created_at

## favorites
- id
- user_id
- ticket_id
- created_at

## recommend_logs
- id
- user_id
- query_data
- result_data
- created_at

---

# API设计

## 用户模块
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/user/profile
- PUT /api/user/profile

## 票务模块
- GET /api/tickets/search
- GET /api/tickets/recommend
- GET /api/tickets/detail/{id}

## 订单模块
- POST /api/orders
- GET /api/orders
- GET /api/orders/{id}
- DELETE /api/orders/{id}

## 收藏模块
- POST /api/favorites
- GET /api/favorites
- DELETE /api/favorites/{id}

## AI模块
- POST /api/ai/recommend
- POST /api/ai/travel-plan
- POST /api/ai/hotel-recommend

---

# 项目目录结构

```text
AI-Travel-Assistant/
├── frontend/
├── gateway/
├── user-service/
├── ticket-service/
├── ai-service/
├── order-service/
├── notification-service/
├── deployment/
├── docs/
├── mysql/
├── redis/
└── scripts/
```

---

# 开发规范

- Python 3.12 + FastAPI
- TypeScript 严格模式
- ESLint + Prettier
- RESTful API 设计
- OpenAPI 文档

---

# Docker服务

- frontend
- gateway
- user-service
- ticket-service
- ai-service
- order-service
- notification-service
- mysql
- redis
- nginx

统一通过 docker-compose 管理。

---

# 第一阶段开发目标（MVP）

完成：
- 用户注册登录
- 票务搜索
- AI推荐
- 收藏功能
- 订单功能
- Docker部署