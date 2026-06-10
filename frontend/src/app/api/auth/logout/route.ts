// ============================================================
// POST /api/auth/logout
// 退出登录
// ============================================================

import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { removeAuthCookie } from '@/lib/auth-utils';

export async function POST() {
  try {
    await removeAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('/api/auth/logout', 'POST', error as Error);
    return NextResponse.json(
      { detail: '退出登录失败' },
      { status: 500 }
    );
  }
}
