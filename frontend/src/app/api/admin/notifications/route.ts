// ============================================================
// GET /api/admin/notifications
// 管理后台通知列表（支持分页、筛选）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logApiError } from '@/lib/logger';

interface NotificationWhere {
  type?: string;
  OR?: { title?: { contains: string }; content?: { contains: string }; user?: { phone?: { contains: string } } }[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
    const type = searchParams.get('type');
    const search = searchParams.get('search') || '';

    const where: NotificationWhere = {};
    if (type && type !== 'all') {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { user: { phone: { contains: search } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
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
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        is_read: n.isRead,
        user: { id: n.user.id, phone: n.user.phone, nickname: n.user.nickname },
        created_at: n.createdAt,
      })),
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logApiError('/api/admin/notifications', 'GET', error as Error);
    return NextResponse.json({ detail: '获取通知列表失败' }, { status: 500 });
  }
}
