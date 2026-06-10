// ============================================================
// 用户体系 TypeScript 类型定义
// AI 智能出行助手
// ============================================================

/** 用户基本信息 */
export interface User {
  id: number;
  nickname: string;
  phone: string;
  email?: string;
  avatar?: string;
  created_at: string;
  updated_at?: string;
}

/** 登录请求参数 */
export interface LoginParams {
  phone: string;
  password?: string;
  code?: string;
  loginType: 'password' | 'code';
  remember?: boolean;
}

/** 注册请求参数 */
export interface RegisterParams {
  phone: string;
  code: string;
  password: string;
  confirmPassword: string;
  nickname?: string;
}

/** 认证响应 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/** 验证码请求 */
export interface SendCodeParams {
  phone: string;
  type: 'login' | 'register' | 'reset';
}

/** 验证码响应 */
export interface SendCodeResponse {
  success: boolean;
  message: string;
  expire_seconds: number;
}

/** 用户个人中心数据 */
export interface UserProfile extends User {
  order_count: number;
  favorite_count: number;
  unread_notifications: number;
}

/** 修改密码参数 */
export interface ChangePasswordParams {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

/** 修改用户信息参数 */
export interface UpdateProfileParams {
  nickname?: string;
  email?: string;
  avatar?: string;
}

/** 表单校验错误 */
export interface FormErrors {
  [key: string]: string | undefined;
}

/** 登录方式枚举 */
export type LoginMethod = 'password' | 'code';

/** API 错误响应 */
export interface ApiError {
  detail: string;
  code?: string;
  status?: number;
}
