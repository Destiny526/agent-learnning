// ============================================================
// Redis 缓存工具
// 提供 getCache / setCache / deleteCache / clearPattern
// ============================================================

import Redis from 'ioredis';

// ---------- Redis 连接 ----------

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) return null; // 停止重试
    return Math.min(times * 200, 2000);
  },
});

// 连接状态
let connected = false;

async function ensureConnect() {
  if (!connected) {
    try {
      await redis.connect();
      connected = true;
    } catch (error) {
      console.warn('Redis 连接失败，降级为无缓存模式:', (error as Error).message);
      connected = false;
    }
  }
  return connected;
}

// ---------- 缓存操作 ----------

/**
 * 获取缓存
 * @param key 缓存键
 * @returns 缓存值，不存在返回 null
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    if (!(await ensureConnect())) return null;
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.warn('Redis getCache 错误:', (error as Error).message);
    return null;
  }
}

/**
 * 设置缓存
 * @param key 缓存键
 * @param value 缓存值
 * @param ttl 过期时间（秒），默认 300 秒（5 分钟）
 */
export async function setCache(key: string, value: unknown, ttl = 300): Promise<void> {
  try {
    if (!(await ensureConnect())) return;
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (error) {
    console.warn('Redis setCache 错误:', (error as Error).message);
  }
}

/**
 * 删除缓存
 * @param key 缓存键
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    if (!(await ensureConnect())) return;
    await redis.del(key);
  } catch (error) {
    console.warn('Redis deleteCache 错误:', (error as Error).message);
  }
}

/**
 * 按模式清除缓存
 * @param pattern 匹配模式，如 "user:*" "notifications:123:*"
 */
export async function clearPattern(pattern: string): Promise<void> {
  try {
    if (!(await ensureConnect())) return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn('Redis clearPattern 错误:', (error as Error).message);
  }
}

// ---------- 缓存键常量 ----------

export const CACHE_KEYS = {
  /** 热门目的地 → 缓存 5 分钟 */
  HOT_DESTINATIONS: 'hot:destinations',

  /** AI 推荐结果 → 缓存 3 分钟 */
  AI_RECOMMEND: (origin: string, dest: string, date: string) =>
    `ai:recommend:${origin}:${dest}:${date}`,

  /** 用户个人信息 → 缓存 10 分钟 */
  USER_PROFILE: (userId: number) => `user:${userId}:profile`,

  /** 通知未读数量 → 缓存 1 分钟 */
  NOTIFICATION_UNREAD: (userId: number) => `user:${userId}:notifications:unread`,

  /** 用户收藏列表 → 缓存 5 分钟 */
  USER_FAVORITES: (userId: number) => `user:${userId}:favorites`,

  /** 用户订单列表 → 缓存 3 分钟 */
  USER_ORDERS: (userId: number) => `user:${userId}:orders`,
} as const;

// ---------- 缓存 TTL 常量（秒）----------

export const CACHE_TTL = {
  HOT_DESTINATIONS: 300,    // 5 分钟
  AI_RECOMMEND: 180,        // 3 分钟
  USER_PROFILE: 600,        // 10 分钟
  NOTIFICATION_UNREAD: 60,  // 1 分钟
  USER_FAVORITES: 300,      // 5 分钟
  USER_ORDERS: 180,         // 3 分钟
} as const;

export default redis;
