// ============================================================
// /api/orders
// GET  - 获取当前用户订单列表
// POST - 创建订单
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

// GET /api/orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // 调用 Gateway 获取订单列表
    const { status: statusCode, data } = await callGateway({
      method: 'GET',
      path: '/api/orders',
      params: status ? { status } : undefined,
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ detail: '获取订单失败' }, { status: 500 });
  }
}

// POST /api/orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 调用 Gateway 创建订单
    const { status: statusCode, data } = await callGateway({
      method: 'POST',
      path: '/api/orders',
      body,
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ detail: '创建订单失败' }, { status: 500 });
  }
}
