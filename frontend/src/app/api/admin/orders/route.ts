// ============================================================
// GET /api/admin/orders
// 管理后台订单列表
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '10';
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';

    // 调用 Gateway 获取订单列表
    const { status: statusCode, data } = await callGateway({
      method: 'GET',
      path: '/api/admin/orders',
      params: {
        page,
        page_size: pageSize,
        ...(status && status !== 'all' ? { status } : {}),
        ...(search ? { search } : {}),
      },
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Get admin orders error:', error);
    return NextResponse.json({ detail: '获取订单列表失败' }, { status: 500 });
  }
}
