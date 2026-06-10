# Railway 部署快速开始

## 5 分钟快速部署

### 步骤 1：准备环境变量

复制 `.env.railway.example` 中的内容，稍后在 Railway 控制台中使用。

### 步骤 2：登录 Railway

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login
```

### 步骤 3：创建项目并部署

#### 方式 A：独立部署（推荐）

1. 在 [Railway 控制台](https://railway.app) 创建新项目
2. 添加 MySQL 插件：New → Database → MySQL
3. 添加 Redis 插件：New → Database → Redis
4. 部署 Gateway 服务：
   - New → GitHub Repo → 选择你的仓库
   - Root Directory: `services/gateway`
   - 添加环境变量（见下方）
5. 重复步骤 4，部署其他 5 个服务

#### 方式 B：合并部署（简单）

1. 在 Railway 控制台创建新项目
2. 添加 MySQL 和 Redis 插件
3. New → GitHub Repo → 选择你的仓库
4. Root Directory: `/`（留空或填 `/`）
5. Start Command: `python start_all.py`
6. 添加环境变量

### 步骤 4：配置环境变量

在 Railway 控制台的 Variables 标签页中添加：

```bash
# 必需
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256

# MySQL（Railway 插件会自动提供，或手动设置）
MYSQL_HOST=mysql.railway.internal
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=railway

# Redis（Railway 插件会自动提供，或手动设置）
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

**独立部署时，Gateway 还需要：**
```bash
USER_SERVICE_URL=http://user-service.railway.internal:PORT
TICKET_SERVICE_URL=http://ticket-service.railway.internal:PORT
AI_SERVICE_URL=http://ai-service.railway.internal:PORT
ORDER_SERVICE_URL=http://order-service.railway.internal:PORT
NOTIFICATION_SERVICE_URL=http://notification-service.railway.internal:PORT
```

> 将 `PORT` 替换为每个服务的实际端口（Railway 会自动分配）

### 步骤 5：初始化数据库

部署完成后，连接到 MySQL 并执行初始化脚本：

```bash
# 获取数据库连接信息
railway connect mysql

# 执行初始化脚本
source infrastructure/mysql/init/init.sql
```

### 步骤 6：访问应用

- Gateway API: `https://your-app.up.railway.app`
- API 文档: `https://your-app.up.railway.app/docs`

## 文件说明

| 文件 | 用途 |
|------|------|
| `Procfile` | Railway 合并部署启动配置 |
| `railway.toml` | Railway 构建配置 |
| `start_all.py` | 合并启动脚本 |
| `Dockerfile.railway` | Docker 合并部署配置 |
| `.env.railway.example` | 环境变量模板 |
| `RAILWAY_DEPLOY.md` | 详细部署文档 |

## 常见问题

**Q: 服务启动失败？**
A: 检查日志：Railway 控制台 → 服务 → Deployments → Logs

**Q: 数据库连接失败？**
A: 确保 MySQL 插件已添加，环境变量配置正确

**Q: 服务间无法通信？**
A: 使用 `service-name.railway.internal` 格式的内网地址

**Q: 如何查看日志？**
A: Railway 控制台 → 服务 → Deployments → 选择部署 → Logs

## 相关文档

- [详细部署指南](RAILWAY_DEPLOY.md)
- [Railway 官方文档](https://docs.railway.app/)
- [项目 README](README.md)
