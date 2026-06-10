# Railway 部署指南

## 项目架构

本项目是一个微服务架构，包含以下 6 个后端服务：

| 服务 | 目录 | 功能 |
|------|------|------|
| gateway | services/gateway | API 网关，统一入口 |
| user-service | services/user-service | 用户管理 |
| ticket-service | services/ticket-service | 票务查询 |
| ai-service | services/ai-service | AI 推荐引擎 |
| order-service | services/order-service | 订单管理 |
| notification-service | services/notification-service | 通知服务 |

## 部署方式

### 方式一：每个服务独立部署（推荐）

Railway 推荐每个微服务作为独立的 Railway 服务部署。

#### 步骤 1：创建 Railway 项目

1. 登录 [Railway](https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库

#### 步骤 2：添加 MySQL 数据库

1. 在项目中点击 "New" → "Database" → "MySQL"
2. Railway 会自动创建数据库并注入以下环境变量：
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
   - `MYSQL_URL`

#### 步骤 3：添加 Redis 数据库

1. 在项目中点击 "New" → "Database" → "Redis"
2. Railway 会自动创建 Redis 并注入以下环境变量：
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`
   - `REDIS_URL`

#### 步骤 4：部署各个服务

对于每个服务（gateway, user-service, ticket-service, ai-service, order-service, notification-service）：

1. 在项目中点击 "New" → "GitHub Repo"
2. 选择同一个仓库
3. 在服务设置中：
   - **Root Directory**: 设置为服务目录（如 `services/gateway`）
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### 步骤 5：配置环境变量

在每个服务的 "Variables" 标签页中，添加以下环境变量：

**所有服务共享的环境变量：**
```
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
```

**Gateway 服务需要的环境变量：**
```
USER_SERVICE_URL=http://user-service.railway.internal:PORT
TICKET_SERVICE_URL=http://ticket-service.railway.internal:PORT
AI_SERVICE_URL=http://ai-service.railway.internal:PORT
ORDER_SERVICE_URL=http://order-service.railway.internal:PORT
NOTIFICATION_SERVICE_URL=http://notification-service.railway.internal:PORT
```

> **注意**：将 `PORT` 替换为每个服务实际的端口号。Railway 内网通信使用 `service-name.railway.internal` 格式。

**数据库相关服务（user-service, ai-service, order-service）需要的环境变量：**
```
MYSQL_HOST=mysql.railway.internal
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=railway

REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

> **提示**：如果使用 Railway 的 MySQL/Redis 插件，可以直接使用 Railway 提供的 `MYSQL_URL` 和 `REDIS_URL` 环境变量，或者手动设置上述变量。

#### 步骤 6：获取服务的内网地址

1. 点击每个服务的 "Settings" 标签
2. 在 "Networking" 部分，找到 "Internal Domain"
3. 格式为 `service-name.railway.internal`
4. 将这些地址配置到 Gateway 服务的环境变量中

### 方式二：合并部署（适合小型项目）

如果不想管理多个服务，可以将所有服务合并部署为一个 Railway 服务。

#### 步骤 1：创建合并启动脚本

在根目录创建 `start_all.py`：

```python
"""合并启动所有服务"""
import subprocess
import sys
import os
import signal
import time

SERVICES = [
    ("gateway", "services/gateway/main.py", 8000),
    ("user-service", "services/user-service/main.py", 8001),
    ("ticket-service", "services/ticket-service/main.py", 8002),
    ("ai-service", "services/ai-service/main.py", 8003),
    ("order-service", "services/order-service/main.py", 8004),
    ("notification-service", "services/notification-service/main.py", 8005),
]

processes = []

def signal_handler(sig, frame):
    print("\n正在停止所有服务...")
    for name, process in processes:
        if process.poll() is None:
            process.terminate()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    print("启动所有服务...")

    for name, script, port in SERVICES:
        env = os.environ.copy()
        env["PORT"] = str(port)

        process = subprocess.Popen(
            [sys.executable, script],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        processes.append((name, process))
        print(f"  ✓ {name} 启动中 (端口 {port})")

    # 等待所有服务启动
    time.sleep(3)

    # 检查服务状态
    all_running = True
    for name, process in processes:
        if process.poll() is not None:
            print(f"  ✗ {name} 启动失败!")
            all_running = False
        else:
            print(f"  ✓ {name} 已启动")

    if all_running:
        print("\n所有服务已启动!")
        print("Gateway 地址: http://localhost:8000")

    # 保持运行
    while True:
        time.sleep(1)
        for name, process in processes:
            if process.poll() is not None:
                print(f"\n[警告] {name} 意外退出!")
```

#### 步骤 2：创建合并部署的 Procfile

在根目录创建 `Procfile`：

```
web: python start_all.py
```

#### 步骤 3：部署到 Railway

1. 在 Railway 中创建新服务
2. Root Directory 设置为 `/`（根目录）
3. Start Command 设置为 `python start_all.py`

## 环境变量参考

### 必需的环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `JWT_SECRET_KEY` | JWT 签名密钥 | `your-secret-key-here` |
| `JWT_ALGORITHM` | JWT 算法 | `HS256` |

### 数据库环境变量（Railway 插件自动提供）

| 变量名 | 说明 |
|--------|------|
| `MYSQL_HOST` | MySQL 主机地址 |
| `MYSQL_PORT` | MySQL 端口 |
| `MYSQL_USER` | MySQL 用户名 |
| `MYSQL_PASSWORD` | MySQL 密码 |
| `MYSQL_DATABASE` | MySQL 数据库名 |
| `MYSQL_URL` | MySQL 连接 URL |
| `REDIS_HOST` | Redis 主机地址 |
| `REDIS_PORT` | Redis 端口 |
| `REDIS_PASSWORD` | Redis 密码 |
| `REDIS_URL` | Redis 连接 URL |

### 服务间通信环境变量（Gateway 需要）

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `USER_SERVICE_URL` | 用户服务地址 | `http://user-service.railway.internal:8001` |
| `TICKET_SERVICE_URL` | 票务服务地址 | `http://ticket-service.railway.internal:8002` |
| `AI_SERVICE_URL` | AI 服务地址 | `http://ai-service.railway.internal:8003` |
| `ORDER_SERVICE_URL` | 订单服务地址 | `http://order-service.railway.internal:8004` |
| `NOTIFICATION_SERVICE_URL` | 通知服务地址 | `http://notification-service.railway.internal:8005` |

## 数据库初始化

首次部署后，需要初始化数据库表结构。

### 方法 1：使用 Alembic（推荐）

```bash
# 在 user-service 或 ai-service 目录下运行
alembic upgrade head
```

### 方法 2：手动执行 SQL

连接到 Railway 的 MySQL 数据库，执行 `infrastructure/mysql/init/init.sql` 中的 SQL 语句。

## 自定义域名

1. 在 Railway 项目中选择 Gateway 服务
2. 点击 "Settings" → "Networking"
3. 点击 "Generate Domain" 获取免费域名
4. 或点击 "Custom Domain" 绑定自己的域名

## 监控和日志

1. 在 Railway 项目中点击某个服务
2. 点击 "Deployments" 标签查看部署历史
3. 点击某个部署查看实时日志
4. 点击 "Metrics" 查看资源使用情况

## 常见问题

### Q: 服务间无法通信？

A: 确保：
1. 所有服务都已部署并运行
2. 环境变量中的服务地址正确（使用 `service-name.railway.internal` 格式）
3. 端口号正确

### Q: 数据库连接失败？

A: 确保：
1. 已添加 MySQL/Redis 插件
2. 环境变量配置正确
3. 数据库已初始化

### Q: 如何查看日志？

A: 在 Railway 控制台中，点击服务 → Deployments → 选择部署 → Logs

### Q: 如何更新部署？

A: 推送代码到 GitHub 后，Railway 会自动重新部署

## 成本估算

Railway 提供：
- **免费额度**：每月 $5 的免费额度
- **Hobby Plan**：$5/月 + 使用量
- **Pro Plan**：$20/月 + 使用量

建议：
- 开发/测试：使用免费额度
- 生产环境：使用 Hobby 或 Pro Plan

## 相关链接

- [Railway 官方文档](https://docs.railway.app/)
- [Railway 内网通信](https://docs.railway.app/guides/private-networking)
- [Railway 环境变量](https://docs.railway.app/guides/variables)
