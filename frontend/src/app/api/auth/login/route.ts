// ============================================================
// POST /api/auth/login
// 用户登录（手机号 + 密码）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth-utils';
import { logUserLogin, logApiError, logDatabaseError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const body = await request.json();
    const { phone, password } = body;

    // 参数校验
    if (!phone || !password) {
      return NextResponse.json(
        { detail: '手机号和密码不能为空' },
        { status: 400 }
      );
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { detail: '请输入正确的手机号' },
        { status: 400 }
      );
    }

    // 查询用户
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { phone },
      });
    } catch (dbError) {
      logDatabaseError('findUser', dbError as Error, { phone });
      throw dbError;
    }

    if (!user) {
      return NextResponse.json(
        { detail: '该手机号未注册' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { detail: '密码错误' },
        { status: 401 }
      );
    }

    // 签发 JWT
    const token = await signToken({ userId: user.id, phone: user.phone });
    await setAuthCookie(token);

    // 查询用户统计数据
    const [orderCount, favoriteCount, unreadCount] = await Promise.all([
      prisma.order.count({ where: { userId: user.id } }),
      prisma.favorite.count({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    // 记录登录日志
    logUserLogin(user.id, user.phone, ip);

    return NextResponse.json({
      access_token: token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        email: user.email,
        avatar: user.avatar,
        created_at: user.createdAt,
        order_count: orderCount,
        favorite_count: favoriteCount,
        unread_notifications: unreadCount,
      },
    });
  } catch (error) {
    logApiError('/api/auth/login', 'POST', error as Error, undefined, ip);
    return NextResponse.json(
      { detail: '登录失败，请重试' },
      { status: 500 }
    );
  }
}
