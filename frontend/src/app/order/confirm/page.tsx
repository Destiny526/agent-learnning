'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { ordersApi, type OrderPassenger } from '@/lib/orders';

// ── Types ──────────────────────────────────────────────────────

interface Passenger {
  name: string;
  idType: string;
  idNumber: string;
  phone: string;
}

// ── Content ────────────────────────────────────────────────────

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading, loadFromStorage } = useAuthStore();

  const trainNo = searchParams.get('trainNo') || '';
  const date = searchParams.get('date') || '';
  const seat = searchParams.get('seat') || '';
  const price = Number(searchParams.get('price')) || 0;
  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const departure = searchParams.get('departure') || '';
  const arrival = searchParams.get('arrival') || '';

  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: '', idType: 'sfz', idNumber: '', phone: '' },
  ]);
  const [contactPhone, setContactPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState('');

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const addPassenger = () => {
    if (passengers.length >= 5) return;
    setPassengers([...passengers, { name: '', idType: 'sfz', idNumber: '', phone: '' }]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length <= 1) return;
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const totalPrice = price * passengers.length;
  const isValid = passengers.every((p) => p.name && p.idNumber) && contactPhone && agreeTerms;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await ordersApi.createOrder({
        train_no: trainNo,
        date,
        seat_type: seat,
        price,
        origin,
        destination,
        departure,
        arrival,
        passengers: passengers as OrderPassenger[],
        contact_phone: contactPhone,
      });
      setOrderId(data.order_no);
      setSubmitted(true);
    } catch {
      alert('订单创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">订单提交成功</h2>
          <p className="text-sm text-gray-500 mb-1">订单号：{orderId}</p>
          <p className="text-xs text-gray-400 mb-8">请在 30 分钟内完成支付</p>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8 text-left">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">车次</span><div className="font-semibold">{trainNo}</div></div>
              <div><span className="text-gray-400">日期</span><div className="font-semibold">{date}</div></div>
              <div><span className="text-gray-400">行程</span><div className="font-semibold">{origin} → {destination}</div></div>
              <div><span className="text-gray-400">座位</span><div className="font-semibold">{seat} × {passengers.length}</div></div>
              <div className="col-span-2 pt-2 border-t border-gray-100">
                <span className="text-gray-400">应付</span>
                <div className="text-xl font-extrabold text-primary-600">¥{totalPrice}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.push('/')} className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
              返回首页
            </button>
            <button onClick={() => router.push('/orders')} className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors">
              查看订单
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a] pt-20 pb-6 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="relative z-10 max-w-2xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            返回
          </button>
          <h1 className="text-2xl font-bold text-white">确认订单</h1>
          <p className="text-sm text-white/50 mt-1">{origin} → {destination} · {date}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-3 relative z-10 pb-32">
        {/* Trip Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">行程信息</h2>
          </div>
          <div className="flex items-center gap-5 mb-5">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{departure}</div>
              <div className="text-sm text-gray-500 mt-1">{origin}</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="text-sm font-medium text-primary-600">{trainNo}</div>
              <div className="w-full h-px bg-gray-200 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white shadow-sm" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary-500 border-2 border-white shadow-sm" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{arrival}</div>
              <div className="text-sm text-gray-500 mt-1">{destination}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-400 mb-0.5">出发日期</div>
              <div className="text-sm font-semibold text-gray-900">{date}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">座位类型</div>
              <div className="text-sm font-semibold text-gray-900">{seat}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">单价</div>
              <div className="text-sm font-semibold text-primary-600">¥{price}</div>
            </div>
          </div>
        </div>

        {/* Passengers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">乘客信息</h2>
            </div>
            {passengers.length < 5 && (
              <button onClick={addPassenger} className="flex items-center gap-1 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                添加乘客
              </button>
            )}
          </div>
          <div className="space-y-5">
            {passengers.map((p, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">乘客 {i + 1}</span>
                  {passengers.length > 1 && (
                    <button onClick={() => removePassenger(i)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">删除</button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">姓名 *</label>
                    <input type="text" placeholder="乘客姓名" value={p.name} onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">证件类型</label>
                    <select value={p.idType} onChange={(e) => updatePassenger(i, 'idType', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none transition-all">
                      <option value="sfz">身份证</option>
                      <option value="passport">护照</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">证件号码 *</label>
                    <input type="text" placeholder="证件号码" value={p.idNumber} onChange={(e) => updatePassenger(i, 'idNumber', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">手机号</label>
                    <input type="tel" placeholder="手机号码" value={p.phone} onChange={(e) => updatePassenger(i, 'phone', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">联系方式</h2>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">联系手机号 *</label>
            <input type="tel" placeholder="用于接收订单通知" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none transition-all" />
          </div>
        </div>

        {/* Price */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">价格明细</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{seat}票价</span>
              <span className="text-gray-900">¥{price} × {passengers.length}人</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-900">应付金额</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-sm text-gray-400">¥</span>
                <span className="text-3xl font-extrabold text-primary-600 tabular-nums">{totalPrice}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
          <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          <span className="text-xs text-gray-500 leading-relaxed">
            我已阅读并同意《用户服务协议》《隐私政策》及《购票须知》，确认乘客信息真实有效
          </span>
        </label>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 glass border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-gray-400">应付金额</div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-sm text-gray-400">¥</span>
                <span className="text-3xl font-extrabold text-primary-600 tabular-nums">{totalPrice}</span>
              </div>
              <div className="text-xs text-gray-400">{passengers.length} 位乘客</div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className={`px-12 py-3.5 font-bold rounded-xl text-base transition-all ${
                isValid && !submitting
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600 hover:shadow-lg hover:shadow-primary-600/25 active:scale-[0.97]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  提交中...
                </span>
              ) : '提交订单'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
