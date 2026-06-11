# 🚄 AI 智能出行助手

> 基于微服务架构的智能出行平台，集成 LLM 行程规划 + RAG 语义推荐 + 12306 实时票务查询

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🔍 **实时票务查询** | 对接 12306，支持火车票、高铁票、机票实时搜索 |
| 🤖 **AI 行程规划** | 接入 DeepSeek / OpenAI，自然语言对话生成出行方案 |
| 📊 **智能推荐** | 基于 RAG 语义检索 + 多维评分的个性化推荐 |
| 🔐 **用户体系** | JWT 双 Token 认证，注册/登录/个人中心 |
| 📋 **订单管理** | 下单、取消、收藏、历史订单 |
| 🔔 **消息通知** | 订单状态变更实时推送 |
| 🛡️ **网关鉴权** | 统一 API 网关，JWT 校验 + 角色权限控制 |

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js :3000)                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      API Gateway (:8000)                        │
│              JWT 验证 · 路由转发 · 角色鉴权                      │
└───┬──────────┬──────────┬──────────┬──────────┬─────────────────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌───────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐
│ User  │ │ Ticket │ │  AI    │ │ Order  │ │ Notification │
│ :8001 │ │ :8002  │ │ :8003  │ │ :8004  │ │    :8005     │
└───┬───┘ └───┬────┘ └───┬────┘ └───┬────┘ └──────┬───────┘
    │         │          │          │              │
    ▼         ▼          ▼          ▼              ▼
┌───────┐ ┌──────┐ ┌──────────┐ ┌──────┐    ┌──────┐
│ MySQL │ │Redis │ │ DeepSeek │ │MySQL │    │Redis │
│       │ │      │ │ Qdrant   │ │      │    │      │
└───────┘ └──────┘ └──────────┘ └──────┘    └──────┘
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 15 + TypeScript + Tailwind CSS + Zustand |
| **网关** | FastAPI + httpx + JWT |
| **后端** | FastAPI + SQLAlchemy + Pydantic |
| **AI 引擎** | DeepSeek / OpenAI API + Qdrant 向量数据库 |
| **数据库** | MySQL 8.0 + Redis 7 |
| **部署** | Docker Compose + Nginx |

---

## 📁 项目结构

```
.
├── frontend/                    # Next.js 前端
├── services/
│   ├── gateway/                 # API 网关 — 统一入口
│   ├── user-service/            # 用户服务 — 注册/登录/JWT
│   ├── ticket-service/          # 票务服务 — 12306 数据爬取
│   ├── ai-service/              # AI 服务 — LLM + RAG 推荐
│   ├── order-service/           # 订单服务 — 订单/收藏
│   └── notification-service/    # 通知服务 — 消息推送
├── infrastructure/              # 基础设施配置
│   └── mysql/init/              # MySQL 初始化脚本
├── scripts/                     # 运维脚本
├── docs/                        # 项目文档
├── docker-compose.yml           # Docker 编排
├── start_all.py                 # 本地合并启动脚本
└── .env.example                 # 环境变量模板
```

---

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/Destiny526/agent-learnning.git
cd agent-learnning

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，至少修改以下必须项：
#   MYSQL_ROOT_PASSWORD
#   MYSQL_PASSWORD
#   JWT_SECRET_KEY

# 3. 一键启动
docker compose up -d --build

# 4. 访问
# 前端: http://localhost:3000
# API:  http://localhost:8000/docs
```

### 方式二：本地开发

```bash
# 1. 安装 Python 依赖（在各 service 目录下）
cd services/user-service && pip install -r requirements.txt
cd ../ticket-service && pip install -r requirements.txt
cd ../ai-service && pip install -r requirements.txt
cd ../order-service && pip install -r requirements.txt
cd ../notification-service && pip install -r requirements.txt
cd ../gateway && pip install -r requirements.txt

# 2. 合并启动所有后端服务
python start_all.py

# 3. 启动前端（另开终端）
cd frontend
npm install
npm run dev
```

---

## 🔧 服务说明

| 服务 | 端口 | 职责 | 依赖 |
|------|------|------|------|
| **gateway** | 8000 | API 统一入口，JWT 鉴权，请求转发 | — |
| **user-service** | 8001 | 用户注册、登录、个人信息管理 | MySQL, Redis |
| **ticket-service** | 8002 | 12306 票务数据爬取与缓存 | Redis |
| **ai-service** | 8003 | LLM 行程规划 + RAG 语义推荐 | Redis, Qdrant |
| **order-service** | 8004 | 订单 CRUD、收藏管理 | MySQL, Redis |
| **notification-service** | 8005 | 用户通知、消息推送 | MySQL, Redis |
| **frontend** | 3000 | Next.js 用户界面 | Gateway |

---

## ⚙️ 环境变量

核心配置项（完整说明见 `.env.example`）：

| 变量 | 必须 | 说明 |
|------|------|------|
| `MYSQL_ROOT_PASSWORD` | ✅ | MySQL root 密码 |
| `MYSQL_PASSWORD` | ✅ | MySQL 用户密码 |
| `JWT_SECRET_KEY` | ✅ | JWT 签名密钥（≥32 位） |
| `DEEPSEEK_API_KEY` | 可选 | DeepSeek API Key（AI 行程规划） |
| `OPENAI_API_KEY` | 可选 | OpenAI API Key（后备模型） |
| `REDIS_PASSWORD` | 可选 | Redis 密码 |

---

## 📡 API 概览

所有请求通过 Gateway（`:8000`）统一转发：

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | ❌ |
| POST | `/api/auth/login` | 用户登录 | ❌ |
| GET | `/api/user/profile` | 获取个人信息 | ✅ |
| GET | `/api/tickets/search` | 搜索票务 | ❌ |
| POST | `/api/ai/recommend` | AI 智能推荐 | ❌ |
| POST | `/api/ai/trip-plan` | LLM 行程规划 | ❌ |
| POST | `/api/ai/trip-plan/stream` | 流式行程规划 (SSE) | ❌ |
| POST | `/api/orders` | 创建订单 | ✅ |
| GET | `/api/orders` | 查询订单列表 | ✅ |
| GET | `/api/notifications` | 获取通知 | ✅ |

完整 API 文档：启动服务后访问 `http://localhost:8000/docs`

---

## 📄 文档

- [系统架构设计](docs/architecture.md)
- [推荐引擎设计](docs/recommendation-engine.md)
- [UI 设计规范](docs/ui-design.md)
- [Railway 部署指南](RAILWAY_DEPLOY.md)

---

## 📜 License

MIT License
