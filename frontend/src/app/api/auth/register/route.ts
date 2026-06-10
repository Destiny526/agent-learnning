// ============================================================
// POST /api/auth/register
// 用户注册
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth-utils';
import { logUserRegister, logApiError, logDatabaseError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const body = await request.json();
    const { phone, password, nickname } = body;

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

    if (password.length < 6 || password.length > 20) {
      return NextResponse.json(
        { detail: '密码长度应为6-20位' },
        { status: 400 }
      );
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { detail: '密码需包含字母和数字' },
        { status: 400 }
      );
    }

    // 检查手机号是否已注册
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { phone },
      });
    } catch (dbError) {
      logDatabaseError('findUser', dbError as Error, { phone });
      throw dbError;
    }

    if (existingUser) {
      return NextResponse.json(
        { detail: '该手机号已注册' },
        { status: 409 }
      );
    }

    // 创建用户
    const passwordHash = await hashPassword(password);
    let user;
    try {
      user = await prisma.user.create({
        data: {
          phone,
          passwordHash,
          nickname: nickname || `用户${phone.slice(-4)}`,
        },
      });
    } catch (dbError) {
      logDatabaseError('createUser', dbError as Error, { phone });
      throw dbError;
    }

    // 签发 JWT
    const token = await signToken({ userId: user.id, phone: user.phone });
    await setAuthCookie(token);

    // 创建默认通知
    try {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'system',
          title: '欢迎加入 AI 行程助手',
          content: '感谢您注册 AI 行程助手！我们为您提供智能出行推荐服务，祝您旅途愉快。',
        },
      });
    } catch (dbError) {
      // 通知创建失败不影响注册
      logDatabaseError('createWelcomeNotification', dbError as Error, { userId: user.id });
    }

    // 记录注册日志
    logUserRegister(user.id, user.phone, ip);

    return NextResponse.json({
      access_token: token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        email: user.email,
        avatar: user.avatar,
        created_at: user.createdAt,
      },
    });
  } catch (error) {
    logApiError('/api/auth/register', 'POST', error as Error, undefined, ip);
    return NextResponse.json(
      { detail: '注册失败，请重试' },
      { status: 500 }
    );
  }
}
