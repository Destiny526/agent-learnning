// ============================================================
// /api/favorites
// GET  - 获取当前用户收藏列表
// POST - 添加收藏
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

// GET /api/favorites
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // 调用 Gateway 获取收藏列表
    const { status: statusCode, data } = await callGateway({
      method: 'GET',
      path: '/api/favorites',
      params: type ? { type } : undefined,
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json({ detail: '获取收藏失败' }, { status: 500 });
  }
}

// POST /api/favorites
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 调用 Gateway 添加收藏
    const { status: statusCode, data } = await callGateway({
      method: 'POST',
      path: '/api/favorites',
      body,
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Add favorite error:', error);
    return NextResponse.json({ detail: '收藏失败' }, { status: 500 });
  }
}
