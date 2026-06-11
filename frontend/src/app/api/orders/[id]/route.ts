// ============================================================
// /api/orders/:id
// GET    - 获取订单详情
// DELETE - 取消订单
// 改为调用 Gateway
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callGateway } from '@/lib/gateway';

// GET /api/orders/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 调用 Gateway 获取订单详情
    const { status: statusCode, data } = await callGateway({
      method: 'GET',
      path: `/api/orders/${id}`,
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ detail: '获取订单失败' }, { status: 500 });
  }
}

// DELETE /api/orders/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 调用 Gateway 取消订单
    const { status: statusCode, data } = await callGateway({
      method: 'DELETE',
      path: `/api/orders/${id}`,
    });

    return NextResponse.json(data, { status: statusCode });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ detail: '取消订单失败' }, { status: 500 });
  }
}
