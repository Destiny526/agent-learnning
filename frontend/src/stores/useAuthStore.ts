// ============================================================
// 认证状态管理 (Zustand)
// 支持手机号+密码 / 手机号+验证码登录
// ============================================================

import { create } from 'zustand';
import { authApi } from '@/lib/auth';
import type { UserProfile, LoginMethod } from '@/types/user';

interface AuthState {
  // 状态
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // 操作
  login: (phone: string, method: LoginMethod, password?: string, code?: string, remember?: boolean) => Promise<void>;
  register: (phone: string, password: string, nickname?: string) => Promise<void>;
  sendCode: (phone: string, type: 'login' | 'register') => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { nickname?: string; email?: string }) => Promise<void>;
  loadFromStorage: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,

  /** 登录 */
  login: async (phone, method, password, code, remember = false) => {
    set({ loading: true, error: null });
    try {
      const { data } = method === 'password'
        ? await authApi.loginWithPassword(phone, password!)
        : await authApi.loginWithCode(phone, code!);

      // 存储 token
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('token', data.access_token);
      if (remember) {
        localStorage.setItem('remember', 'true');
        localStorage.setItem('phone', phone);
      } else {
        localStorage.removeItem('remember');
      }

      set({
        token: data.access_token,
        isAuthenticated: true,
        loading: false,
        user: data.user as UserProfile,
      });
    } catch (err: any) {
      const message = err.response?.data?.detail || '登录失败，请重试';
      set({ error: message, loading: false });
      throw err;
    }
  },

  /** 注册 */
  register: async (phone, password, nickname) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authApi.register(phone, password, nickname);
      // 注册成功后自动登录
      localStorage.setItem('token', data.access_token);
      set({
        token: data.access_token,
        isAuthenticated: true,
        loading: false,
        user: data.user as UserProfile,
      });
    } catch (err: any) {
      const message = err.response?.data?.detail || '注册失败，请重试';
      set({ error: message, loading: false });
      throw err;
    }
  },

  /** 发送验证码 */
  sendCode: async (phone, type) => {
    try {
      const { data } = await authApi.sendCode({ phone, type });
      return { success: data.success, message: data.message };
    } catch (err: any) {
      const message = err.response?.data?.detail || '发送验证码失败';
      return { success: false, message };
    }
  },

  /** 退出登录 */
  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // 静默处理
    }
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false, error: null });
  },

  /** 获取用户信息 */
  fetchProfile: async () => {
    try {
      const { data } = await authApi.getProfile();
      set({ user: data });
    } catch {
      // token 无效时静默处理
    }
  },

  /** 修改用户信息 */
  updateProfile: async (profileData) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authApi.updateProfile(profileData);
      set({ user: data, loading: false });
    } catch (err: any) {
      const message = err.response?.data?.detail || '修改失败';
      set({ error: message, loading: false });
      throw err;
    }
  },

  /** 从本地存储加载 token */
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      set({ token, isAuthenticated: true });
      get().fetchProfile();
    }
  },

  /** 清除错误信息 */
  clearError: () => set({ error: null }),
}));
