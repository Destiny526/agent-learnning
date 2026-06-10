// ============================================================
// GET /api/admin/users
// 管理后台用户列表（支持分页、搜索）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logApiError } from '@/lib/logger';

interface UserWhere {
  OR?: { phone?: { contains: string }; nickname?: { contains: string }; email?: { contains: string } }[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
    const search = searchParams.get('search') || '';

    const where: UserWhere = {};
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { nickname: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          nickname: true,
          email: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: { orders: true, favorites: true, notifications: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map((u) => ({
        id: u.id,
        phone: u.phone,
        nickname: u.nickname,
        email: u.email,
        avatar: u.avatar,
        created_at: u.createdAt,
        order_count: u._count.orders,
        favorite_count: u._count.favorites,
        notification_count: u._count.notifications,
      })),
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logApiError('/api/admin/users', 'GET', error as Error);
    return NextResponse.json({ detail: '获取用户列表失败' }, { status: 500 });
  }
}
