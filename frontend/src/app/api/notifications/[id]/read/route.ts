// ============================================================
// PATCH /api/notifications/:id/read
// 标记单条通知为已读（清除缓存）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logApiError } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth-utils';
import { deleteCache, CACHE_KEYS } from '@/lib/redis';

export async function PATCH(
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

    // 只有未读变已读时才需要更新缓存
    if (!notification.isRead) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      await deleteCache(CACHE_KEYS.NOTIFICATION_UNREAD(auth.userId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('/api/notifications/:id/read', 'PATCH', error as Error);
    return NextResponse.json({ detail: '操作失败' }, { status: 500 });
  }
}
