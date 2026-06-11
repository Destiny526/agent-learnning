// ============================================================
// PATCH /api/notifications/read-all
// 标记所有通知为已读
// 改为调用 Gateway
// ============================================================

import { NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

export async function PATCH() {
  try {
    // 调用 Gateway 标记所有通知为已读
    const { status: statusCode, data } = await callGateway({
      method: 'PATCH',
      path: '/api/notifications/read-all',
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return NextResponse.json({ detail: '操作失败' }, { status: 500 });
  }
}
