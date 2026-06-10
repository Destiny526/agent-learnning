// ============================================================
// /api/favorites
// GET  - 获取当前用户收藏列表（带 Redis 缓存）
// POST - 添加收藏（清除缓存）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCache, setCache, deleteCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';
import { logFavoriteAdd, logApiError, logDatabaseError } from '@/lib/logger';

// GET /api/favorites
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // 先查 Redis 缓存
    const cacheKey = CACHE_KEYS.USER_FAVORITES(auth.userId);
    const cached = await getCache<any[]>(cacheKey);

    if (cached) {
      // 如果有类型筛选，在缓存数据上过滤
      if (type && type !== 'all') {
        return NextResponse.json(cached.filter((f) => f.type === type));
      }
      return NextResponse.json(cached);
    }

    // 缓存未命中，查数据库
    const favorites = await prisma.favorite.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
    });

    // 写入缓存
    await setCache(cacheKey, favorites, CACHE_TTL.USER_FAVORITES);

    // 如果有类型筛选
    if (type && type !== 'all') {
      return NextResponse.json(favorites.filter((f) => f.type === type));
    }

    return NextResponse.json(favorites);
  } catch (error) {
    logApiError('/api/favorites', 'GET', error as Error);
    return NextResponse.json({ detail: '获取收藏失败' }, { status: 500 });
  }
}

// POST /api/favorites
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const {
      route_id,
      type,
      origin,
      destination,
      from_station,
      to_station,
      train_no,
      departure_date,
      departure_time,
      arrival_time,
      duration,
      price,
      ai_score,
    } = body;

    // 参数校验
    if (!origin || !destination || !departure_time || !arrival_time || price === undefined) {
      return NextResponse.json({ detail: '缺少必要参数' }, { status: 400 });
    }

    // 检查是否已收藏
    if (route_id) {
      const existing = await prisma.favorite.findFirst({
        where: {
          userId: auth.userId,
          trainNo: train_no || undefined,
          origin,
          destination,
        },
      });

      if (existing) {
        return NextResponse.json({ detail: '已收藏该路线' }, { status: 409 });
      }
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: auth.userId,
        type: type || 'high_speed',
        origin,
        destination,
        fromStation: from_station || null,
        toStation: to_station || null,
        trainNo: train_no || null,
        departureDate: departure_date || null,
        departureTime: departure_time,
        arrivalTime: arrival_time,
        duration: duration || null,
        price,
        aiScore: ai_score || 0,
      },
    });

    // 创建收藏通知
    await prisma.notification.create({
      data: {
        userId: auth.userId,
        type: 'favorite',
        title: '收藏成功',
        content: `您已成功收藏${origin}→${destination}${train_no ? `（${train_no}）` : ''}路线，我们会为您关注价格变动。`,
      },
    });

    // 清除收藏缓存和通知缓存
    await Promise.all([
      deleteCache(CACHE_KEYS.USER_FAVORITES(auth.userId)),
      deleteCache(CACHE_KEYS.NOTIFICATION_UNREAD(auth.userId)),
    ]);

    // 记录添加收藏日志
    logFavoriteAdd(auth.userId, `${origin}→${destination}`, ip);

    return NextResponse.json(favorite);
  } catch (error) {
    logApiError('/api/favorites', 'POST', error as Error, undefined, ip);
    return NextResponse.json({ detail: '收藏失败' }, { status: 500 });
  }
}
