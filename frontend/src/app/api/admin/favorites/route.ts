// ============================================================
// GET /api/admin/favorites
// 管理后台收藏列表（支持分页、筛选）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logApiError } from '@/lib/logger';

interface FavoriteWhere {
  type?: string;
  OR?: { origin?: { contains: string }; destination?: { contains: string }; trainNo?: { contains: string }; user?: { phone?: { contains: string } } }[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
    const type = searchParams.get('type');
    const search = searchParams.get('search') || '';

    const where: FavoriteWhere = {};
    if (type && type !== 'all') {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { origin: { contains: search } },
        { destination: { contains: search } },
        { trainNo: { contains: search } },
        { user: { phone: { contains: search } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, phone: true, nickname: true },
          },
        },
      }),
      prisma.favorite.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map((f) => ({
        id: f.id,
        type: f.type,
        origin: f.origin,
        destination: f.destination,
        train_no: f.trainNo,
        departure_time: f.departureTime,
        arrival_time: f.arrivalTime,
        price: Number(f.price),
        ai_score: f.aiScore,
        user: { id: f.user.id, phone: f.user.phone, nickname: f.user.nickname },
        created_at: f.createdAt,
      })),
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logApiError('/api/admin/favorites', 'GET', error as Error);
    return NextResponse.json({ detail: '获取收藏列表失败' }, { status: 500 });
  }
}
