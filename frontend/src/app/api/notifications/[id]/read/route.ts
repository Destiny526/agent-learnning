// ============================================================
// PATCH /api/notifications/:id/read
// 标记单条通知为已读
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 调用 Gateway 标记通知为已读
    const { status: statusCode, data } = await callGateway({
      method: 'PATCH',
      path: `/api/notifications/${id}/read`,
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json({ detail: '操作失败' }, { status: 500 });
  }
}
