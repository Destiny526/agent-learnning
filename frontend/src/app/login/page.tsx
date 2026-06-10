'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';
import type { LoginMethod } from '@/types/user';

// ---------- 表单校验 ----------

function validatePhone(phone: string): string | undefined {
  if (!phone) return '请输入手机号';
  if (!/^1[3-9]\d{9}$/.test(phone)) return '请输入正确的手机号';
}

function validatePassword(pwd: string): string | undefined {
  if (!pwd) return '请输入密码';
  if (pwd.length < 6) return '密码长度不少于6位';
}

function validateCode(code: string): string | undefined {
  if (!code) return '请输入验证码';
  if (!/^\d{6}$/.test(code)) return '验证码为6位数字';
}

// ---------- 验证码倒计时 Hook ----------

function useCountdown(initial = 60) {
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const start = useCallback(() => {
    setCount(initial);
    timer.current = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initial]);

  useEffect(() => () => clearInterval(timer.current), []);

  return { count, start, active: count > 0 };
}

// ---------- 登录页面 ----------

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, clearError, isAuthenticated, loadFromStorage, user } = useAuthStore();

  const [method, setMethod] = useState<LoginMethod>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [codeSending, setCodeSending] = useState(false);
  const [codeMessage, setCodeMessage] = useState('');

  const { count, start: startCountdown, active: countdownActive } = useCountdown();

  // 已登录则跳转
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/profile');
    }
  }, [isAuthenticated, user, router]);

  // 读取记住的手机号
  useEffect(() => {
    const savedPhone = localStorage.getItem('phone');
    const remembered = localStorage.getItem('remember');
    if (savedPhone && remembered) {
      setPhone(savedPhone);
      setRemember(true);
    }
  }, []);

  /** 发送验证码 */
  const handleSendCode = async () => {
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setFormErrors({ phone: phoneErr });
      return;
    }
    setFormErrors({});
    setCodeSending(true);
    setCodeMessage('');
    try {
      const { sendCode } = useAuthStore.getState();
      const result = await sendCode(phone, 'login');
      setCodeMessage(result.message);
      if (result.success) startCountdown();
    } catch {
      setCodeMessage('发送失败，请重试');
    } finally {
      setCodeSending(false);
    }
  };

  /** 提交登录 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setCodeMessage('');

    // 校验
    const errors: Record<string, string | undefined> = { phone: validatePhone(phone) };
    if (method === 'password') {
      errors.password = validatePassword(password);
    } else {
      errors.code = validateCode(code);
    }
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    try {
      await login(
        phone,
        method,
        method === 'password' ? password : undefined,
        method === 'code' ? code : undefined,
        remember,
      );
      router.push('/');
    } catch {
      // error 已在 store 中设置
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* ---------- 左侧装饰区（桌面端） ---------- */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 items-center justify-center p-12">
        {/* 网格背景 */}
        <div className="absolute inset-0 hero-grid opacity-30" />

        {/* 光晕 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl breathe" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-ai-500/15 rounded-full blur-3xl breathe" style={{ animationDelay: '4s' }} />

        {/* 内容 */}
        <div className="relative z-10 max-w-md text-white">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 border border-white/20">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4">AI 智能出行助手</h2>
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            基于人工智能的多维度出行方案推荐，为您规划最优路线，节省时间与成本。
          </p>
          <div className="space-y-4">
            {['智能推荐 · 多维度评分', '高铁 · 飞机 · 火车全覆盖', '实时票价 · 余票查询'].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/90 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- 右侧登录表单 ---------- */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-gradient-to-br from-gray-50 to-primary-50/30 relative">
        {/* 移动端背景装饰 */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 opacity-5" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo (移动端) */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">
              AI<span className="text-primary-600">行程助手</span>
            </span>
          </div>

          {/* 表单卡片 */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">欢迎回来</h1>
              <p className="text-sm text-gray-500 mt-2">登录您的账号，开启智能出行</p>
            </div>

            {/* 登录方式切换 */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              {([
                { key: 'password' as const, label: '密码登录' },
                { key: 'code' as const, label: '验证码登录' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setMethod(tab.key); setFormErrors({}); clearError(); }}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    method === tab.key
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">手机号</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="tel"
                    maxLength={11}
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setFormErrors((p) => ({ ...p, phone: undefined })); }}
                    className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm transition-all outline-none
                      focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                      ${formErrors.phone ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                </div>
                {formErrors.phone && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {formErrors.phone}
                  </p>
                )}
              </div>

              {/* 密码登录 */}
              {method === 'password' && (
                <div className="animate-fade-in-up">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      placeholder="请输入密码（不少于6位）"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFormErrors((p) => ({ ...p, password: undefined })); }}
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm transition-all outline-none
                        focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                        ${formErrors.password ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}`}
                    />
                  </div>
                  {formErrors.password && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {formErrors.password}
                    </p>
                  )}
                </div>
              )}

              {/* 验证码登录 */}
              {method === 'code' && (
                <div className="animate-fade-in-up">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">验证码</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="请输入6位验证码"
                        value={code}
                        onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setFormErrors((p) => ({ ...p, code: undefined })); }}
                        className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm transition-all outline-none tracking-widest
                          focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                          ${formErrors.code ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={countdownActive || codeSending}
                      className={`shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                        ${countdownActive || codeSending
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-primary-50 text-primary-600 hover:bg-primary-100 active:bg-primary-200'
                        }`}
                    >
                      {codeSending ? '发送中...' : countdownActive ? `${count}s` : '获取验证码'}
                    </button>
                  </div>
                  {formErrors.code && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {formErrors.code}
                    </p>
                  )}
                  {codeMessage && !formErrors.code && (
                    <p className="mt-1.5 text-xs text-primary-600">{codeMessage}</p>
                  )}
                </div>
              )}

              {/* 记住登录 & 忘记密码 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-md transition-all peer-checked:border-primary-600 peer-checked:bg-primary-600 group-hover:border-primary-400">
                      {remember && (
                        <svg className="w-4 h-4 text-white absolute top-0.5 left-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">记住登录</span>
                </label>
                <Link href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  忘记密码？
                </Link>
              </div>

              {/* 全局错误 */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 animate-scale-in">
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-xl
                  shadow-lg shadow-primary-600/25 transition-all duration-200
                  hover:from-primary-700 hover:to-primary-800 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5
                  active:translate-y-0 active:shadow-md
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    登录中...
                  </span>
                ) : '登录'}
              </button>
            </form>

            {/* 注册入口 */}
            <div className="mt-6 text-center">
              <span className="text-sm text-gray-500">还没有账号？</span>
              <Link
                href="/register"
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold ml-1 transition-colors"
              >
                立即注册
              </Link>
            </div>
          </div>

          {/* 底部协议 */}
          <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
            登录即表示同意
            <Link href="#" className="text-gray-500 hover:text-primary-600 underline underline-offset-2">《用户协议》</Link>
            和
            <Link href="#" className="text-gray-500 hover:text-primary-600 underline underline-offset-2">《隐私政策》</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
