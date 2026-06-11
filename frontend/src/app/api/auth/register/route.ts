// ============================================================
// POST /api/auth/register
// 用户注册
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';
import { setAuthCookie } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 调用 Gateway 注册接口
    const { status, data } = await callGateway<{
      access_token?: string;
      detail?: string;
      user?: Record<string, unknown>;
    }>({
      method: 'POST',
      path: '/api/auth/register',
      body,
      includeAuth: false,
    });

    // 注册失败
    if (status !== 200 || !data.access_token) {
      return NextResponse.json(data, { status });
    }

    // 设置 cookie
    await setAuthCookie(data.access_token);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { detail: '注册失败，请重试' },
      { status: 500 }
    );
  }
}
