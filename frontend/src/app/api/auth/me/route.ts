// ============================================================
// GET /api/auth/me
// 获取当前登录用户信息（带 Redis 缓存）
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logApiError } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';

interface UserProfileData {
  id: number;
  phone: string;
  nickname: string;
  email: string | null;
  avatar: string | null;
  created_at: Date;
  order_count: number;
  favorite_count: number;
  unread_notifications: number;
}

export async function GET() {
  try {
    const auth = await getCurrentUser();

    if (!auth) {
      return NextResponse.json(
        { detail: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    // 先查 Redis 缓存
    const cacheKey = CACHE_KEYS.USER_PROFILE(auth.userId);
    const cached = await getCache<UserProfileData>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    // 缓存未命中，查数据库
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { detail: '用户不存在' },
        { status: 404 }
      );
    }

    // 查询统计数据
    const [orderCount, favoriteCount, unreadCount] = await Promise.all([
      prisma.order.count({ where: { userId: user.id } }),
      prisma.favorite.count({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    const profileData: UserProfileData = {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      email: user.email,
      avatar: user.avatar,
      created_at: user.createdAt,
      order_count: orderCount,
      favorite_count: favoriteCount,
      unread_notifications: unreadCount,
    };

    // 写入缓存
    await setCache(cacheKey, profileData, CACHE_TTL.USER_PROFILE);

    return NextResponse.json(profileData);
  } catch (error) {
    logApiError('/api/auth/me', 'GET', error as Error);
    return NextResponse.json(
      { detail: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
