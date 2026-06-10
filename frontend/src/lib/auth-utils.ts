// ============================================================
// 认证工具函数
// JWT 签发/验证、密码哈希
// ============================================================

import { SignJWT, jwtVerify } from 'jose';
import { hash, compare } from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ai-travel-assistant-secret-key-2026'
);

const COOKIE_NAME = 'auth_token';
const TOKEN_EXPIRE = '7d';

// ---------- 密码 ----------

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

// ---------- JWT ----------

export async function signToken(payload: { userId: number; phone: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRE)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ userId: number; phone: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as { userId: number; phone: string };
  } catch {
    return null;
  }
}

// ---------- Cookie ----------

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

// ---------- 从请求中获取当前用户 ----------

export async function getCurrentUser(): Promise<{ userId: number; phone: string } | null> {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}
