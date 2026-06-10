'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';

// ---------- 表单校验 ----------

function validatePhone(phone: string): string | undefined {
  if (!phone) return '请输入手机号';
  if (!/^1[3-9]\d{9}$/.test(phone)) return '请输入正确的手机号';
}

function validateCode(code: string): string | undefined {
  if (!code) return '请输入验证码';
  if (!/^\d{6}$/.test(code)) return '验证码为6位数字';
}

function validatePassword(pwd: string): string | undefined {
  if (!pwd) return '请输入密码';
  if (pwd.length < 6) return '密码长度不少于6位';
  if (pwd.length > 20) return '密码长度不超过20位';
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(pwd)) return '密码需包含字母和数字';
}

function validateConfirmPassword(pwd: string, confirm: string): string | undefined {
  if (!confirm) return '请确认密码';
  if (pwd !== confirm) return '两次密码不一致';
}

// ---------- 验证码倒计时 ----------

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

// ---------- 注册页面 ----------

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [codeSending, setCodeSending] = useState(false);
  const [codeMessage, setCodeMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [success, setSuccess] = useState(false);

  const { count, start: startCountdown, active: countdownActive } = useCountdown();

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
      const result = await sendCode(phone, 'register');
      setCodeMessage(result.message);
      if (result.success) startCountdown();
    } catch {
      setCodeMessage('发送失败，请重试');
    } finally {
      setCodeSending(false);
    }
  };

  /** 提交注册 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // 校验
    const errors: Record<string, string | undefined> = {
      phone: validatePhone(phone),
      code: validateCode(code),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    if (!agreed) {
      setFormErrors({ agree: '请阅读并同意用户协议' });
      return;
    }

    try {
      await register(phone, password, nickname || undefined);
      setSuccess(true);
      setTimeout(() => router.push('/'), 1500);
    } catch {
      // error 已在 store 中设置
    }
  };

  /** 更新字段并清除错误 */
  const updateField = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // 密码强度
  const passwordStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  })();

  const strengthLabels = ['', '弱', '一般', '较强', '强'];
  const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-primary-400', 'bg-green-500'];

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* ---------- 左侧装饰区（桌面端） ---------- */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 items-center justify-center p-12">
        <div className="absolute inset-0 hero-grid opacity-30" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-ai-500/15 rounded-full blur-3xl breathe" />
        <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl breathe" style={{ animationDelay: '3s' }} />

        <div className="relative z-10 max-w-md text-white">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 border border-white/20">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4">加入 AI 行程助手</h2>
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            注册账号，享受智能出行推荐服务，让每一次出行都更高效。
          </p>
          <div className="space-y-4">
            {['新用户专享优惠', '个性化出行推荐', '订单管理与出行提醒'].map((text, i) => (
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

      {/* ---------- 右侧注册表单 ---------- */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-gradient-to-br from-gray-50 to-primary-50/30 relative">
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
              <h1 className="text-2xl font-bold text-gray-900">创建账号</h1>
              <p className="text-sm text-gray-500 mt-2">注册 AI 行程助手，开启智能出行</p>
            </div>

            {/* 成功提示 */}
            {success && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600 mb-6 animate-scale-in">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                注册成功！正在跳转到登录页...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">手机号 <span className="text-red-400">*</span></label>
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
                    onChange={(e) => updateField('phone', e.target.value, setPhone)}
                    className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm transition-all outline-none
                      focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                      ${formErrors.phone ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                </div>
                {formErrors.phone && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {formErrors.phone}
                  </p>
                )}
              </div>

              {/* 验证码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">验证码 <span className="text-red-400">*</span></label>
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
                      onChange={(e) => updateField('code', e.target.value.replace(/\D/g, ''), setCode)}
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
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {formErrors.code}
                  </p>
                )}
                {codeMessage && !formErrors.code && (
                  <p className="mt-1.5 text-xs text-primary-600">{codeMessage}</p>
                )}
              </div>

              {/* 昵称（可选） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  昵称 <span className="text-gray-400 font-normal">（选填）</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="给自己取个名字吧"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 hover:border-gray-300 rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">密码 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    placeholder="请输入密码（6-20位，含字母和数字）"
                    value={password}
                    onChange={(e) => updateField('password', e.target.value, setPassword)}
                    className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm transition-all outline-none
                      focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                      ${formErrors.password ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                </div>
                {/* 密码强度指示器 */}
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">{strengthLabels[passwordStrength]}</span>
                  </div>
                )}
                {formErrors.password && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {formErrors.password}
                  </p>
                )}
              </div>

              {/* 确认密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">确认密码 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value, setConfirmPassword)}
                    className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm transition-all outline-none
                      focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                      ${formErrors.confirmPassword ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                </div>
                {formErrors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {formErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* 用户协议 */}
              <div>
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => { setAgreed(e.target.checked); setFormErrors((p) => ({ ...p, agree: undefined })); }}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-md transition-all peer-checked:border-primary-600 peer-checked:bg-primary-600 group-hover:border-primary-400">
                      {agreed && (
                        <svg className="w-4 h-4 text-white absolute top-0.5 left-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 leading-relaxed">
                    我已阅读并同意
                    <Link href="#" className="text-primary-600 hover:text-primary-700 font-medium">《用户协议》</Link>
                    和
                    <Link href="#" className="text-primary-600 hover:text-primary-700 font-medium">《隐私政策》</Link>
                  </span>
                </label>
                {formErrors.agree && (
                  <p className="mt-1.5 text-xs text-red-500">{formErrors.agree}</p>
                )}
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

              {/* 注册按钮 */}
              <button
                type="submit"
                disabled={loading || success}
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
                    注册中...
                  </span>
                ) : '注册'}
              </button>
            </form>

            {/* 登录入口 */}
            <div className="mt-6 text-center">
              <span className="text-sm text-gray-500">已有账号？</span>
              <Link
                href="/login"
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold ml-1 transition-colors"
              >
                去登录
              </Link>
            </div>
          </div>

          {/* 底部协议 */}
          <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
            注册即表示同意
            <Link href="#" className="text-gray-500 hover:text-primary-600 underline underline-offset-2">《服务条款》</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
