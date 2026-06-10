// ============================================================
// PATCH /api/notifications/read-all
// 标记所有通知为已读（清除缓存）
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logApiError } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth-utils';
import { deleteCache, CACHE_KEYS } from '@/lib/redis';

export async function PATCH() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: auth.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    // 清除未读数量缓存
    await deleteCache(CACHE_KEYS.NOTIFICATION_UNREAD(auth.userId));

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    logApiError('/api/notifications/read-all', 'PATCH', error as Error);
    return NextResponse.json({ detail: '操作失败' }, { status: 500 });
  }
}
