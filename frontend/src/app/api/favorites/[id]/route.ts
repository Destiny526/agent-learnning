// ============================================================
// DELETE /api/favorites/:id
// 删除收藏（清除缓存）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { deleteCache, CACHE_KEYS } from '@/lib/redis';
import { logFavoriteRemove, logApiError } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ detail: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const favoriteId = parseInt(id, 10);

    if (isNaN(favoriteId)) {
      return NextResponse.json({ detail: '无效的收藏ID' }, { status: 400 });
    }

    // 检查收藏是否存在且属于当前用户
    const favorite = await prisma.favorite.findFirst({
      where: {
        id: favoriteId,
        userId: auth.userId,
      },
    });

    if (!favorite) {
      return NextResponse.json({ detail: '收藏不存在' }, { status: 404 });
    }

    await prisma.favorite.delete({
      where: { id: favoriteId },
    });

    // 清除收藏缓存
    await deleteCache(CACHE_KEYS.USER_FAVORITES(auth.userId));

    // 记录删除收藏日志
    logFavoriteRemove(auth.userId, `${favorite.origin}→${favorite.destination}`, ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('/api/favorites/:id', 'DELETE', error as Error, undefined, ip);
    return NextResponse.json({ detail: '删除收藏失败' }, { status: 500 });
  }
}
