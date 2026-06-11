// ============================================================
// GET /api/admin/notifications
// 管理后台通知列表
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '10';
    const type = searchParams.get('type');
    const search = searchParams.get('search') || '';

    // 调用 Gateway 获取通知列表
    const { status: statusCode, data } = await callGateway({
      method: 'GET',
      path: '/api/admin/notifications',
      params: {
        page,
        page_size: pageSize,
        ...(type && type !== 'all' ? { type } : {}),
        ...(search ? { search } : {}),
      },
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    return NextResponse.json({ detail: '获取通知列表失败' }, { status: 500 });
  }
}
