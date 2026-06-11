// ============================================================
// GET /api/admin/stats
// 管理后台统计数据
// 改为调用 Gateway
// ============================================================

import { NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

export async function GET() {
  try {
    // 调用 Gateway 获取管理后台统计数据
    const { status: statusCode, data } = await callGateway({
      method: 'GET',
      path: '/api/admin/stats',
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ detail: '获取统计数据失败' }, { status: 500 });
  }
}
