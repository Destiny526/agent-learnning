// ============================================================
// 认证 API 层
// 支持真实数据库和 Mock 模式
// ============================================================

import api from './api';
import type {
  AuthResponse,
  SendCodeParams,
  SendCodeResponse,
  UserProfile,
  UpdateProfileParams,
  ChangePasswordParams,
} from '@/types/user';
import {
  MOCK_AUTH_RESPONSE,
  MOCK_PROFILE,
  MOCK_VERIFY_CODE,
  MOCK_REGISTERED_PHONES,
  mockDelay,
} from './mock-user';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || !process.env.NEXT_PUBLIC_API_URL;

// ---------- 真实 API 调用 ----------

const realApi = {
  /** 手机号+密码登录 */
  loginWithPassword: (phone: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { phone, password }),

  /** 手机号+验证码登录 */
  loginWithCode: async (phone: string, code: string) => {
    // 验证码登录暂用 Mock 实现，后续接入短信服务
    await mockDelay();
    if (code !== MOCK_VERIFY_CODE) {
      throw { response: { data: { detail: '验证码错误' } } };
    }
    return { data: { ...MOCK_AUTH_RESPONSE, user: { ...MOCK_AUTH_RESPONSE.user, phone } } };
  },

  /** 注册 */
  register: (phone: string, password: string, nickname?: string) =>
    api.post<AuthResponse>('/api/auth/register', { phone, password, nickname }),

  /** 发送验证码 */
  sendCode: async (_params: SendCodeParams) => {
    // 验证码发送暂用 Mock 实现，后续接入短信服务
    await mockDelay(500);
    return {
      data: {
        success: true,
        message: '验证码已发送（Mock: 123456）',
        expire_seconds: 300,
      },
    };
  },

  /** 获取用户信息 */
  getProfile: () =>
    api.get<UserProfile>('/api/auth/me'),

  /** 修改用户信息 */
  updateProfile: (data: UpdateProfileParams) =>
    api.put<UserProfile>('/api/user/profile', data),

  /** 修改密码 */
  changePassword: (data: ChangePasswordParams) =>
    api.post('/api/user/change-password', data),

  /** 退出登录 */
  logout: () =>
    api.post('/api/auth/logout'),

  /** 刷新 token */
  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/api/auth/refresh', { refresh_token: refreshToken }),
};

// ---------- Mock API 实现 ----------

const mockApi = {
  loginWithPassword: async (phone: string, _password: string) => {
    await mockDelay();
    if (!MOCK_REGISTERED_PHONES.includes(phone)) {
      throw { response: { data: { detail: '该手机号未注册' } } };
    }
    return { data: { ...MOCK_AUTH_RESPONSE, user: { ...MOCK_AUTH_RESPONSE.user, phone } } };
  },

  loginWithCode: async (phone: string, code: string) => {
    await mockDelay();
    if (code !== MOCK_VERIFY_CODE) {
      throw { response: { data: { detail: '验证码错误' } } };
    }
    return { data: { ...MOCK_AUTH_RESPONSE, user: { ...MOCK_AUTH_RESPONSE.user, phone } } };
  },

  register: async (phone: string, _password: string, nickname?: string) => {
    await mockDelay();
    if (MOCK_REGISTERED_PHONES.includes(phone)) {
      throw { response: { data: { detail: '该手机号已注册' } } };
    }
    return { data: { ...MOCK_AUTH_RESPONSE, user: { ...MOCK_AUTH_RESPONSE.user, phone, nickname: nickname || '新用户' } } };
  },

  sendCode: async (_params: SendCodeParams) => {
    await mockDelay(500);
    return {
      data: {
        success: true,
        message: '验证码已发送（Mock: 123456）',
        expire_seconds: 300,
      },
    };
  },

  getProfile: async () => {
    await mockDelay(300);
    return { data: MOCK_PROFILE };
  },

  updateProfile: async (data: UpdateProfileParams) => {
    await mockDelay();
    return { data: { ...MOCK_PROFILE, ...data } };
  },

  changePassword: async () => {
    await mockDelay();
    return { data: { success: true } };
  },

  logout: async () => {
    await mockDelay(200);
    return { data: { success: true } };
  },

  refresh: async (_refreshToken: string) => {
    await mockDelay();
    return { data: MOCK_AUTH_RESPONSE };
  },
};

// ---------- 统一导出 ----------

export const authApi = USE_MOCK ? mockApi : realApi;
