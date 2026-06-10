// ============================================================
// /api/notifications/:id
// DELETE - 删除通知
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logApiError } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = parseInt(id, 10);

    if (isNaN(notificationId)) {
      return NextResponse.json({ detail: '无效的通知ID' }, { status: 400 });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: auth.userId,
      },
    });

    if (!notification) {
      return NextResponse.json({ detail: '通知不存在' }, { status: 404 });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('/api/notifications/:id', 'DELETE', error as Error);
    return NextResponse.json({ detail: '删除失败' }, { status: 500 });
  }
}
