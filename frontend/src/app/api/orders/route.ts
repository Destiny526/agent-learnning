// ============================================================
// /api/orders
// GET  - 获取当前用户订单列表（带 Redis 缓存）
// POST - 创建订单（清除缓存）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCache, setCache, deleteCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';
import { logOrderCreate, logApiError, logDatabaseError, logRedisError } from '@/lib/logger';

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

interface MappedOrder {
  id: string;
  order_no: string;
  status: string;
  train_no: string;
  date: string;
  seat: string;
  price: number;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  passengers: { name: string; idType: string; idNumber: string; phone: string }[];
  contact_phone: string;
  created_at: Date;
}

// GET /api/orders
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // 先查 Redis 缓存
    const cacheKey = CACHE_KEYS.USER_ORDERS(auth.userId);
    let cached: MappedOrder[] | null = null;
    try {
      cached = await getCache<MappedOrder[]>(cacheKey);
    } catch (redisError) {
      logRedisError('getCache', redisError as Error, { key: cacheKey });
    }

    if (cached) {
      if (status && status !== 'all') {
        return NextResponse.json(cached.filter((o) => o.status === status));
      }
      return NextResponse.json(cached);
    }

    // 缓存未命中，查数据库
    const where: { userId: number; status?: string } = { userId: auth.userId };

    let orders;
    try {
      orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbError) {
      logDatabaseError('findOrders', dbError as Error, { userId: auth.userId });
      throw dbError;
    }

    // 映射为前端格式
    const mapped = orders.map((order) => {
      const trip = order.tripData as TripData;
      return {
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
      };
    });

    // 写入缓存
    try {
      await setCache(cacheKey, mapped, CACHE_TTL.USER_ORDERS);
    } catch (redisError) {
      logRedisError('setCache', redisError as Error, { key: cacheKey });
    }

    if (status && status !== 'all') {
      return NextResponse.json(mapped.filter((o) => o.status === status));
    }

    return NextResponse.json(mapped);
  } catch (error) {
    logApiError('/api/orders', 'GET', error as Error, undefined, ip);
    return NextResponse.json({ detail: '获取订单失败' }, { status: 500 });
  }
}

// POST /api/orders
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const {
      train_no,
      date,
      seat_type,
      price,
      origin,
      destination,
      departure,
      arrival,
      passengers,
      contact_phone,
    } = body;

    // 参数校验
    if (!train_no || !date || !seat_type || price === undefined) {
      return NextResponse.json({ detail: '缺少必要参数' }, { status: 400 });
    }

    if (!passengers || passengers.length === 0) {
      return NextResponse.json({ detail: '请至少添加一名乘客' }, { status: 400 });
    }

    // 生成订单号
    const orderNo = `TR${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    let order;
    try {
      order = await prisma.order.create({
        data: {
          orderNo,
          status: 'pending',
          userId: auth.userId,
          seatType: seat_type,
          price,
          tripData: {
            trainNo: train_no,
            date,
            origin,
            destination,
            departure,
            arrival,
            passengers,
            contactPhone: contact_phone,
          },
        },
      });
    } catch (dbError) {
      logDatabaseError('createOrder', dbError as Error, { userId: auth.userId, orderNo });
      throw dbError;
    }

    // 创建订单通知
    try {
      await prisma.notification.create({
        data: {
          userId: auth.userId,
          type: 'order',
          title: '订单创建成功',
          content: `您的${origin}→${destination}（${train_no}）行程已创建成功，请在30分钟内完成支付。`,
        },
      });
    } catch (dbError) {
      logDatabaseError('createOrderNotification', dbError as Error, { orderNo });
    }

    // 清除缓存
    try {
      await Promise.all([
        deleteCache(CACHE_KEYS.USER_ORDERS(auth.userId)),
        deleteCache(CACHE_KEYS.USER_PROFILE(auth.userId)),
        deleteCache(CACHE_KEYS.NOTIFICATION_UNREAD(auth.userId)),
      ]);
    } catch (redisError) {
      logRedisError('deleteCache', redisError as Error, { userId: auth.userId });
    }

    // 记录创建订单日志
    logOrderCreate(auth.userId, orderNo, `${origin}→${destination}`, ip);

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
    logApiError('/api/orders', 'POST', error as Error, undefined, ip);
    return NextResponse.json({ detail: '创建订单失败' }, { status: 500 });
  }
}
