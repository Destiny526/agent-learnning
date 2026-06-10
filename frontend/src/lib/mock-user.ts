// ============================================================
// Mock 用户数据 —— 前端开发阶段使用
// 接入后端后可删除此文件
// ============================================================

import type { UserProfile, AuthResponse } from '@/types/user';

/** Mock 个人中心数据 */
export const MOCK_PROFILE: UserProfile = {
  id: 1,
  nickname: '旅行达人',
  phone: '13800138000',
  email: 'travel@example.com',
  avatar: '',
  created_at: '2025-01-15T08:00:00Z',
  updated_at: '2026-05-20T10:30:00Z',
  order_count: 12,
  favorite_count: 8,
  unread_notifications: 3,
};

/** Mock 登录响应 */
export const MOCK_AUTH_RESPONSE: AuthResponse = {
  access_token: 'mock_access_token_' + Date.now(),
  refresh_token: 'mock_refresh_token_' + Date.now(),
  token_type: 'bearer',
  expires_in: 7200,
  user: MOCK_PROFILE,
};

/** 模拟延迟 */
export function mockDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 模拟验证码（固定 123456） */
export const MOCK_VERIFY_CODE = '123456';

/** 模拟已注册手机号 */
export const MOCK_REGISTERED_PHONES = ['13800138000', '13900139000'];
