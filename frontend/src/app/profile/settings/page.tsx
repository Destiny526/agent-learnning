'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

// ---------- 开关组件 ----------

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

// ---------- 设置页面 ----------

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, loadFromStorage, logout } = useAuthStore();

  const [orderNotify, setOrderNotify] = useState(true);
  const [priceAlert, setPriceAlert] = useState(true);
  const [promoNotify, setPromoNotify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  // 加载设置
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = localStorage.getItem('user_settings');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        setOrderNotify(parsed.orderNotify ?? true);
        setPriceAlert(parsed.priceAlert ?? true);
        setPromoNotify(parsed.promoNotify ?? false);
      } catch {}
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('user_settings', JSON.stringify({ orderNotify, priceAlert, promoNotify }));
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 300);
  };

  const handleClearData = () => {
    localStorage.removeItem('searchHistory');
    localStorage.removeItem('travel_orders');
    localStorage.removeItem('user_settings');
    setShowDeleteConfirm(false);
    alert('缓存数据已清除');
  };

  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    await logout();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/20">
      {/* 顶部 */}
      <div className="relative bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-20" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
          <button onClick={() => router.push('/profile')} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            返回个人中心
          </button>
          <h1 className="text-2xl font-bold text-white">账号设置</h1>
          <p className="text-sm text-white/50 mt-1">管理通知偏好和隐私设置</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 -mt-5 relative z-10 pb-16">
        {/* 通知设置 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">通知设置</h3>
          </div>
          <div className="px-5 divide-y divide-gray-50">
            <Toggle enabled={orderNotify} onChange={setOrderNotify} label="订单通知" description="订单状态变更时通知" />
            <Toggle enabled={priceAlert} onChange={setPriceAlert} label="价格提醒" description="收藏路线价格变动时提醒" />
            <Toggle enabled={promoNotify} onChange={setPromoNotify} label="促销通知" description="接收优惠活动和促销信息" />
          </div>
        </div>

        {/* 隐私设置 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">隐私设置</h3>
          </div>
          <div className="px-5">
            <button
              onClick={() => { localStorage.removeItem('searchHistory'); alert('搜索历史已清除'); }}
              className="w-full flex items-center justify-between py-4 border-b border-gray-50 hover:bg-gray-50 -mx-5 px-5 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">清除搜索历史</p>
                <p className="text-xs text-gray-400 mt-0.5">删除所有本地保存的搜索记录</p>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-between py-4 -mx-5 px-5 hover:bg-red-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-red-600">清除所有缓存数据</p>
                <p className="text-xs text-gray-400 mt-0.5">清除搜索历史、订单记录等本地数据</p>
              </div>
              <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* 关于 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">关于</h3>
          </div>
          <div className="px-5 divide-y divide-gray-50">
            <div className="flex items-center justify-between py-4">
              <span className="text-sm text-gray-700">版本号</span>
              <span className="text-sm text-gray-400">v1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-4">
              <span className="text-sm text-gray-700">技术栈</span>
              <span className="text-sm text-gray-400">Next.js + FastAPI</span>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg shadow-primary-600/25 hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-60"
        >
          {saving ? '保存中...' : saved ? '✓ 已保存' : '保存设置'}
        </button>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认清除所有数据</h3>
              <p className="text-sm text-gray-500 mb-6">此操作将清除所有本地缓存数据（搜索历史、订单记录等），不可恢复。</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  取消
                </button>
                <button onClick={handleClearData} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">
                  确认清除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
