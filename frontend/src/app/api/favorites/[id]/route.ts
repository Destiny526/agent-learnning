// ============================================================
// DELETE /api/favorites/:id
// 删除收藏
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 调用 Gateway 删除收藏
    const { status: statusCode, data } = await callGateway({
      method: 'DELETE',
      path: `/api/favorites/${id}`,
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Delete favorite error:', error);
    return NextResponse.json({ detail: '删除收藏失败' }, { status: 500 });
  }
}
