// ============================================================
// POST /api/auth/login
// 用户登录（手机号 + 密码）
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';
import { setAuthCookie } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 调用 Gateway 登录接口
    const { status, data } = await callGateway<{
      access_token?: string;
      detail?: string;
      user?: Record<string, unknown>;
    }>({
      method: 'POST',
      path: '/api/auth/login',
      body,
      includeAuth: false,
    });

    // 登录失败
    if (status !== 200 || !data.access_token) {
      return NextResponse.json(data, { status });
    }

    // 设置 cookie
    await setAuthCookie(data.access_token);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { detail: '登录失败，请重试' },
      { status: 500 }
    );
  }
}
