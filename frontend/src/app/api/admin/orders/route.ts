// ============================================================
// GET /api/admin/orders
// 管理后台订单列表（支持分页、筛选）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logApiError } from '@/lib/logger';

interface TripData {
  trainNo?: string;
  date?: string;
  origin?: string;
  destination?: string;
  departure?: string;
  arrival?: string;
}

interface OrderWhere {
  status?: string;
  OR?: { orderNo?: { contains: string }; user?: { phone?: { contains: string }; nickname?: { contains: string } } }[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';

    const where: OrderWhere = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { orderNo: { contains: search } },
        { user: { phone: { contains: search } } },
        { user: { nickname: { contains: search } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
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
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map((o) => {
        const trip = o.tripData as TripData;
        return {
          id: o.id,
          order_no: o.orderNo,
          status: o.status,
          seat_type: o.seatType,
          price: Number(o.price),
          train_no: trip?.trainNo || '',
          date: trip?.date || '',
          origin: trip?.origin || '',
          destination: trip?.destination || '',
          user: { id: o.user.id, phone: o.user.phone, nickname: o.user.nickname },
          created_at: o.createdAt,
        };
      }),
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logApiError('/api/admin/orders', 'GET', error as Error);
    return NextResponse.json({ detail: '获取订单列表失败' }, { status: 500 });
  }
}
