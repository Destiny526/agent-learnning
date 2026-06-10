// ============================================================
// GET /api/admin/stats
// 管理后台统计数据
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logApiError } from '@/lib/logger';

export async function GET() {
  try {
    const [userCount, orderCount, favoriteCount, notificationCount] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.favorite.count(),
      prisma.notification.count(),
    ]);

    // 最近7天订单趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrders = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // 最近注册用户
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, phone: true, nickname: true, createdAt: true },
    });

    return NextResponse.json({
      counts: {
        users: userCount,
        orders: orderCount,
        favorites: favoriteCount,
        notifications: notificationCount,
      },
      orderStats: recentOrders.map((o) => ({
        status: o.status,
        count: o._count.id,
      })),
      recentUsers,
    });
  } catch (error) {
    logApiError('/api/admin/stats', 'GET', error as Error);
    return NextResponse.json({ detail: '获取统计数据失败' }, { status: 500 });
  }
}
