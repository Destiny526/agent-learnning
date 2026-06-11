// ============================================================
// GET /api/auth/me
// 获取当前登录用户信息
// 改为调用 Gateway
// ============================================================

import { NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

export async function GET() {
  try {
    // 调用 Gateway 获取用户信息
    const { status, data } = await callGateway({
      method: 'GET',
      path: '/api/user/profile',
    });

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json(
      { detail: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
