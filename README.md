# AI智能行程助手

基于 AI 推荐引擎的智能出行平台，支持火车票、机票、酒店的智能搜索与推荐。

## 功能特性

- 🔍 **智能搜索** - 支持火车票、机票、酒店多维度搜索
- 🤖 **AI 推荐** - 基于用户偏好和历史行为的智能推荐算法
- 📊 **对比分析** - 多方案对比，价格走势分析
- 📋 **行程规划** - 自动生成最优出行方案
- 🔔 **实时通知** - 订单状态、价格变动实时推送
- ❤️ **收藏管理** - 收藏关注的线路和产品

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15 + TypeScript + TailwindCSS + Zustand |
| 网关 | FastAPI |
| 后端 | FastAPI (Python 3.12) |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis 7 |
| 部署 | Docker + Docker Compose + Nginx |

## 项目结构

```
agent-learnning/
├── frontend/              # Next.js 前端应用
├── services/
│   ├── gateway/           # API 网关服务
│   ├── user-service/      # 用户服务
│   ├── ticket-service/    # 票务服务
│   ├── ai-service/        # AI 推荐服务
│   ├── order-service/     # 订单服务
│   └── notification-service/  # 通知服务
├── infrastructure/        # 基础设施配置
│   ├── mysql/
│   ├── redis/
│   └── nginx/
├── scripts/               # 运维脚本
├── docs/                  # 项目文档
├── docker-compose.yml     # Docker 编排配置
└── pyproject.toml         # Python 项目配置
```

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

## 快速开始

### 前提条件

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (本地开发前端)
- Python 3.12+ (本地开发后端)

### 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置以下变量：
# - MYSQL_PASSWORD: MySQL root 密码
# - JWT_SECRET: JWT 签名密钥
# - OPENAI_API_KEY: OpenAI API 密钥 (AI 推荐功能需要)
```

### Docker 一键启动

```bash
# 启动所有服务
bash scripts/start.sh

# 或手动启动
docker-compose up -d --build
```

### 本地开发

```bash
# 前端开发
cd frontend
npm install
npm run dev

# 后端开发 (以 user-service 为例)
cd services/user-service
pip install -r requirements.txt
python main.py
```

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端界面 | http://localhost:3000 |
| API 网关 | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| Nginx 入口 | http://localhost:80 |

## 运维命令

```bash
# 查看日志
bash scripts/logs.sh

# 停止服务
bash scripts/stop.sh

# 重新构建
bash scripts/build.sh
```

## 文档

- [系统架构](docs/architecture.md)
- [推荐引擎设计](docs/recommendation-engine.md)
- [UI 设计规范](docs/ui-design.md)
- [落地页设计](docs/landing-page.md)

## 许可证

MIT License
