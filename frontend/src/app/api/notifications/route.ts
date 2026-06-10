// ============================================================
// GET /api/notifications
// 获取当前用户通知列表（带 Redis 缓存）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';
import { logApiError, logDatabaseError, logRedisError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where: { userId: number; type?: string } = { userId: auth.userId };
    if (type && type !== 'all') {
      where.type = type;
    }

    // 先查 Redis 缓存未读数量
    const unreadCacheKey = CACHE_KEYS.NOTIFICATION_UNREAD(auth.userId);
    let unreadCount: number | null = null;
    try {
      unreadCount = await getCache<number>(unreadCacheKey);
    } catch (redisError) {
      logRedisError('getCache', redisError as Error, { key: unreadCacheKey });
    }

    let items;
    try {
      items = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbError) {
      logDatabaseError('findNotifications', dbError as Error, { userId: auth.userId });
      throw dbError;
    }

    // 缓存未命中时查数据库
    if (unreadCount === null) {
      try {
        unreadCount = await prisma.notification.count({
          where: { userId: auth.userId, isRead: false },
        });
        await setCache(unreadCacheKey, unreadCount, CACHE_TTL.NOTIFICATION_UNREAD);
      } catch (dbError) {
        logDatabaseError('countUnreadNotifications', dbError as Error, { userId: auth.userId });
        unreadCount = 0;
      }
    }

    return NextResponse.json({
      items: items.map((n) => ({
        id: String(n.id),
        user_id: n.userId,
        type: n.type,
        title: n.title,
        content: n.content,
        is_read: n.isRead,
        created_at: n.createdAt,
      })),
      total: items.length,
      unread_count: unreadCount,
    });
  } catch (error) {
    logApiError('/api/notifications', 'GET', error as Error, undefined, ip);
    return NextResponse.json({ detail: '获取通知失败' }, { status: 500 });
  }
}
