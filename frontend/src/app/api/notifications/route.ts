// ============================================================
// GET /api/notifications
// 获取当前用户通知列表
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // 调用 Gateway 获取通知列表
    const { status: statusCode, data } = await callGateway({
      method: 'GET',
      path: '/api/notifications',
      params: type ? { type } : undefined,
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ detail: '获取通知失败' }, { status: 500 });
  }
}
