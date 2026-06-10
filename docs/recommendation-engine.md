# 票务推荐引擎设计文档

## 1. 系统概述

### 1.1 职责

票务推荐引擎接收用户出行需求，从候选票务池中筛选并排序，输出综合评分最高的推荐结果。

### 1.2 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| origin | string | ✅ | 出发城市 |
| destination | string | ✅ | 目的城市 |
| expected_time | datetime | ✅ | 期望出发时间 |
| budget_max | float | ❌ | 最高预算上限 |
| preference | enum | ❌ | 用户偏好：cheapest / fastest / closest |

### 1.3 输出

```json
{
  "best_option": { ... },        // 综合评分最高
  "cheapest_option": { ... },    // 价格最低
  "fastest_option": { ... },     // 耗时最短
  "closest_time_option": { ... },// 离期望时间最近
  "all_options": [ ... ]         // 全部候选（已排序）
}
```

每条推荐结果包含：

| 字段 | 说明 |
|------|------|
| ticket_id | 票务 ID |
| ticket_type | 火车 / 高铁 / 飞机 |
| origin / destination | 出发地 / 目的地 |
| departure_time | 出发时间 |
| arrival_time | 到达时间 |
| duration | 耗时（分钟） |
| price | 价格 |
| seat_type | 座位类型 |
| score | 综合评分 (0~1) |
| score_breakdown | 各维度评分明细 |

---

## 2. 评分算法

### 2.1 总公式

```
score = w_time × S_time + w_price × S_price + w_duration × S_duration + w_comfort × S_comfort
```

| 权重 | 维度 | 默认值 |
|------|------|--------|
| w_time | 时间匹配 | 0.40 |
| w_price | 价格 | 0.30 |
| w_duration | 耗时 | 0.20 |
| w_comfort | 舒适度 | 0.10 |

### 2.2 时间匹配评分 S_time（权重 40%）

衡量候选票出发时间与用户期望时间的接近程度。

```
diff_minutes = |candidate.departure_time - expected_time|
S_time = max(0, 1 - diff_minutes / T)
```

| 参数 | 值 | 说明 |
|------|-----|------|
| T | 360（6小时） | 衰减窗口。超出 6 小时则评分为 0 |

**示例：**

| 时间差 | S_time |
|--------|--------|
| 0 分钟 | 1.00 |
| 30 分钟 | 0.92 |
| 1 小时 | 0.83 |
| 3 小时 | 0.50 |
| 6 小时 | 0.00 |
| >6 小时 | 0.00 |

### 2.3 价格评分 S_price（权重 30%）

在候选池内做相对排名，价格越低分越高。

```
S_price = 1 - (price - min_price) / (max_price - min_price)
```

特殊处理：当 `max_price == min_price` 时，所有候选 S_price = 1.0。

**归一化方式：** Min-Max 归一化，基于当次查询的候选池动态计算。

### 2.4 耗时评分 S_duration（权重 20%）

耗时越短分越高，同样基于候选池归一化。

```
S_duration = 1 - (duration - min_duration) / (max_duration - min_duration)
```

### 2.5 舒适度评分 S_comfort（权重 10%）

按交通类型给固定分值：

| ticket_type | S_comfort | 说明 |
|-------------|-----------|------|
| flight | 1.00 | 飞机 |
| high_speed | 0.70 | 高铁 |
| train | 0.30 | 普通火车 |

**设计理由：** 舒适度是主观维度，用固定的类型映射比动态计算更稳定。后续可扩展为用户个性化权重。

### 2.6 评分汇总示例

假设候选池有 3 张票：

| 票 | 类型 | 价格 | 耗时 | 时间差 | S_time | S_price | S_dur | S_comf | 总分 |
|----|------|------|------|--------|--------|---------|-------|--------|------|
| A | 高铁 | ¥300 | 4h | 30min | 0.92 | 0.67 | 1.00 | 0.70 | **0.82** |
| B | 飞机 | ¥800 | 2h | 2h | 0.67 | 0.00 | 0.00 | 1.00 | **0.47** |
| C | 火车 | ¥150 | 8h | 10min | 0.97 | 1.00 | 0.00 | 0.30 | **0.72** |

推荐结果：best = A, cheapest = C, fastest = B, closest_time = C。

---

## 3. 处理流程

```
用户请求
    │
    ▼
┌─────────────┐
│  参数校验    │  检查 origin/destination/时间格式
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  候选检索    │  从 DB/缓存查询匹配票务
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  预过滤      │  去除不可用（无余票）、超预算、超出时间窗口（±12h）的候选
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  评分计算    │  对每个候选计算四维评分 + 加权总分
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  排序 & 输出 │  按总分排序，提取各维度最优
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  日志记录    │  写入 recommend_logs 表
└─────────────┘
```

### 3.1 候选检索策略

**时间窗口：** 查询期望时间 ±12 小时内的票务记录。

```sql
SELECT * FROM tickets
WHERE origin = :origin
  AND destination = :destination
  AND departure_time BETWEEN :expected_time - 12h AND :expected_time + 12h
ORDER BY departure_time
```

**为何是 ±12h：**
- 太小（±2h）可能漏掉合理选项
- 太大（±24h）会引入大量无关候选，影响评分区分度
- 12 小时覆盖早/晚各半个天，是合理的折中

### 3.2 预过滤规则

| 规则 | 说明 |
|------|------|
| 余票 > 0 | 无票不推荐 |
| price ≤ budget_max | 超预算过滤（如用户指定了预算） |
| 时间窗口 ±12h | 过于偏离期望时间的不纳入 |

---

## 4. 数据库存储方案

### 4.1 tickets 表（票务主表）

```sql
CREATE TABLE tickets (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    ticket_type     VARCHAR(20) NOT NULL,        -- train / high_speed / flight
    origin          VARCHAR(50) NOT NULL,
    destination     VARCHAR(50) NOT NULL,
    departure_time  DATETIME NOT NULL,
    arrival_time    DATETIME NOT NULL,
    duration        FLOAT NOT NULL,               -- 耗时（分钟）
    price           FLOAT NOT NULL,
    seat_type       VARCHAR(20),                  -- 二等座 / 经济舱 / ...
    total_seats     INT DEFAULT 0,
    available_seats INT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_route (origin, destination),
    INDEX idx_departure (departure_time),
    INDEX idx_route_time (origin, destination, departure_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**关键索引说明：**

| 索引 | 用途 |
|------|------|
| `idx_route` | 按出发地+目的地查询 |
| `idx_departure` | 按时间排序 |
| `idx_route_time` | 联合索引，覆盖推荐引擎的核心查询 |

### 4.2 recommend_logs 表（推荐日志）

```sql
CREATE TABLE recommend_logs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT,                             -- 可为空（未登录用户）
    query_data   TEXT,                            -- 请求参数 JSON
    result_data  TEXT,                            -- 推荐结果 JSON（含 top 5）
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**存储内容示例：**

```json
// query_data
{
  "origin": "北京",
  "destination": "上海",
  "expected_time": "2024-06-15T09:00:00",
  "budget_max": 500
}

// result_data
{
  "total_candidates": 23,
  "filtered_candidates": 15,
  "top_5": [
    {"ticket_id": 101, "score": 0.82, "type": "high_speed"},
    {"ticket_id": 205, "score": 0.79, "type": "train"},
    ...
  ]
}
```

**设计决策：** 只存 top 5 而非全部结果，控制 TEXT 字段体积。

### 4.3 数据更新策略

| 数据源 | 更新方式 | 频率 |
|--------|----------|------|
| 票务数据 | 定时同步 / API 拉取 | 每 30 分钟 |
| 余票数据 | 实时更新 | 每次查询时 |
| 推荐日志 | 实时写入 | 每次推荐请求 |

---

## 5. 缓存策略

### 5.1 缓存架构

```
用户请求 → Redis 缓存查询 → 命中 → 直接返回
                │
                未命中
                │
                ▼
         MySQL 查询 → 计算评分 → 写入缓存 → 返回
```

### 5.2 缓存 Key 设计

| Key 模式 | 存储内容 | TTL | 说明 |
|----------|----------|-----|------|
| `tickets:{origin}:{destination}:{date}` | 该线路当日全部票务 JSON | 30 分钟 | 票务池缓存 |
| `recommend:{origin}:{destination}:{date}:{hash}` | 推荐结果 JSON | 10 分钟 | 推荐结果缓存 |
| `ticket:{id}` | 单条票务详情 | 1 小时 | 票务详情缓存 |

**hash 计算：** 对 `expected_time + budget_max + preference` 做 MD5，取前 8 位。

### 5.3 缓存更新策略

| 策略 | 触发时机 | 说明 |
|------|----------|------|
| TTL 过期 | 自动 | 30 分钟后自动失效 |
| 主动失效 | 票务数据更新时 | 删除相关 `tickets:{origin}:{destination}:*` |
| 余票变更 | 下单/退票时 | 删除对应 `ticket:{id}` + 线路缓存 |

### 5.4 缓存穿透防护

| 问题 | 方案 |
|------|------|
| 查询不存在的线路 | 缓存空结果 `{"empty": true}`，TTL 5 分钟 |
| 热门线路高并发 | Redis 分布式锁，防止缓存击穿 |
| 大量随机线路查询 | 布隆过滤器（可选，二期） |

### 5.5 缓存预热

系统启动时或每日凌晨，预热热门线路：

```
热门 Top 100 线路 → 查询 DB → 评分计算 → 写入 Redis
```

热门线路来源：`recommend_logs` 表按查询频次统计。

---

## 6. 扩展性设计

### 6.1 权重可配置化

将评分权重存入配置表或配置文件，支持运行时调整：

```json
{
  "weights": {
    "time": 0.40,
    "price": 0.30,
    "duration": 0.20,
    "comfort": 0.10
  },
  "time_decay_window_minutes": 360,
  "comfort_scores": {
    "flight": 1.0,
    "high_speed": 0.7,
    "train": 0.3
  }
}
```

### 6.2 用户个性化（二期）

根据用户历史行为调整权重：

| 信号 | 权重调整 |
|------|----------|
| 用户经常选最便宜的 | 提高 w_price |
| 用户经常选高铁 | 提高 w_comfort 中 high_speed 的分值 |
| 用户偏好上午出发 | 提高时间匹配在上午段的敏感度 |

实现方式：`recommend_logs` 分析 → 用户画像表 → 动态权重。

### 6.3 新交通类型接入

只需：
1. `tickets` 表插入对应 `ticket_type` 记录
2. `comfort_scores` 配置新增类型分值
3. 无需修改算法核心逻辑

---

## 7. 性能指标

| 指标 | 目标值 |
|------|--------|
| 单次推荐响应时间 | < 200ms（缓存命中） / < 500ms（缓存未命中） |
| 候选池容量 | 单次查询 ≤ 500 条 |
| 缓存命中率 | > 70%（热门线路） |
| 推荐日志写入 | 异步写入，不阻塞响应 |
