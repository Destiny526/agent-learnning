// ============================================================
// /api/orders/:id
// GET   - 获取订单详情
// PATCH - 更新订单状态
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { deleteCache, CACHE_KEYS } from '@/lib/redis';
import { logOrderStatusChange, logApiError, logDatabaseError } from '@/lib/logger';

interface TripData {
  trainNo?: string;
  date?: string;
  origin?: string;
  destination?: string;
  departure?: string;
  arrival?: string;
  passengers?: { name: string; idType: string; idNumber: string; phone: string }[];
  contactPhone?: string;
}

// 解析订单 ID（支持 ORD123 或 123 格式）
function parseOrderId(id: string): number {
  const clean = id.replace(/^ORD/i, '');
  return parseInt(clean, 10);
}

// GET /api/orders/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseOrderId(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ detail: '无效的订单ID' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: auth.userId,
      },
    });

    if (!order) {
      return NextResponse.json({ detail: '订单不存在' }, { status: 404 });
    }

    const trip = order.tripData as TripData;
    return NextResponse.json({
      id: `ORD${order.id}`,
      order_no: order.orderNo,
      status: order.status,
      train_no: trip?.trainNo || '',
      date: trip?.date || '',
      seat: order.seatType,
      price: Number(order.price),
      origin: trip?.origin || '',
      destination: trip?.destination || '',
      departure: trip?.departure || '',
      arrival: trip?.arrival || '',
      passengers: trip?.passengers || [],
      contact_phone: trip?.contactPhone || '',
      created_at: order.createdAt,
    });
  } catch (error) {
    logApiError('/api/orders/:id', 'GET', error as Error);
    return NextResponse.json({ detail: '获取订单失败' }, { status: 500 });
  }
}

// PATCH /api/orders/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseOrderId(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ detail: '无效的订单ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    // 校验状态值
    const validStatuses = ['pending', 'paid', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ detail: '无效的订单状态' }, { status: 400 });
    }

    // 检查订单是否存在且属于当前用户
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: auth.userId,
      },
    });

    if (!order) {
      return NextResponse.json({ detail: '订单不存在' }, { status: 404 });
    }

    // 状态流转校验
    const transitions: Record<string, string[]> = {
      pending: ['paid', 'cancelled'],
      paid: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!transitions[order.status]?.includes(status)) {
      return NextResponse.json(
        { detail: `订单状态不能从 ${order.status} 变更为 ${status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    // 创建状态变更通知
    const trip = updated.tripData as TripData;
    const statusLabels: Record<string, string> = {
      paid: '已支付',
      completed: '已完成',
      cancelled: '已取消',
    };

    await prisma.notification.create({
      data: {
        userId: auth.userId,
        type: 'order',
        title: `订单${statusLabels[status] || status}`,
        content: `您的${trip?.origin || ''}→${trip?.destination || ''}（${trip?.trainNo || ''}）订单状态已更新为${statusLabels[status] || status}。`,
      },
    });

    // 清除订单缓存、通知缓存
    await Promise.all([
      deleteCache(CACHE_KEYS.USER_ORDERS(auth.userId)),
      deleteCache(CACHE_KEYS.NOTIFICATION_UNREAD(auth.userId)),
    ]);

    // 记录订单状态变更日志
    logOrderStatusChange(auth.userId, updated.orderNo, order.status, status, ip);

    return NextResponse.json({
      id: `ORD${updated.id}`,
      order_no: updated.orderNo,
      status: updated.status,
      created_at: updated.createdAt,
    });
  } catch (error) {
    logApiError('/api/orders/:id', 'PATCH', error as Error);
    return NextResponse.json({ detail: '更新订单失败' }, { status: 500 });
  }
}
