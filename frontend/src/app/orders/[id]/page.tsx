'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { ordersApi, type Order, type OrderStatus } from '@/lib/orders';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: '待支付', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  paid: { label: '已支付', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  completed: { label: '已完成', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, loadFromStorage } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (id && isAuthenticated) {
      setLoading(true);
      ordersApi.getOrderById(id as string)
        .then(({ data }) => setOrder(data))
        .catch(() => setOrder(null))
        .finally(() => setLoading(false));
    }
  }, [id, isAuthenticated]);

  const handleCancel = async () => {
    if (!confirm('确定取消该订单？')) return;
    try {
      await ordersApi.updateOrderStatus(id as string, 'cancelled');
      setOrder((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    } catch {
      alert('取消失败');
    }
  };

  const handlePay = async () => {
    if (!confirm('确认支付？（模拟支付）')) return;
    try {
      await ordersApi.updateOrderStatus(id as string, 'paid');
      setOrder((prev) => prev ? { ...prev, status: 'paid' } : null);
    } catch {
      alert('支付失败');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-500 mb-4">订单不存在</p>
        <button onClick={() => router.push('/orders')} className="text-primary-600 hover:underline">返回订单列表</button>
      </div>
    );
  }

  const status = STATUS_CONFIG[order.status];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a] pt-20 pb-6 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.push('/orders')} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            返回订单列表
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">订单详情</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${status.color} ${status.bg} ${status.border} border`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-white/50 mt-1">{order.order_no}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 -mt-3 relative z-10 pb-16">
        {/* 路线信息 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-center flex-1">
              <div className="text-3xl font-bold text-gray-900 tabular-nums">{order.departure}</div>
              <div className="text-sm text-gray-500 mt-1">{order.origin}</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="text-sm font-medium text-primary-600">{order.train_no}</div>
              <div className="w-full h-px bg-gray-200 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white shadow-sm" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary-500 border-2 border-white shadow-sm" />
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-3xl font-bold text-gray-900 tabular-nums">{order.arrival}</div>
              <div className="text-sm text-gray-500 mt-1">{order.destination}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-400">出发日期</div>
              <div className="text-sm font-medium text-gray-900">{order.date}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">座位类型</div>
              <div className="text-sm font-medium text-gray-900">{order.seat}</div>
            </div>
          </div>
        </div>

        {/* 乘客信息 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">乘客信息</h3>
          {order.passengers.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-medium text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-400">{p.idNumber}</div>
              </div>
              <div className="text-xs text-gray-400">{p.phone}</div>
            </div>
          ))}
        </div>

        {/* 价格 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">订单总价</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-gray-400">¥</span>
              <span className="text-3xl font-bold text-primary-600 tabular-nums">{order.price}</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        {order.status === 'pending' && (
          <div className="flex gap-3">
            <button onClick={handleCancel} className="flex-1 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              取消订单
            </button>
            <button onClick={handlePay} className="flex-1 py-3 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg shadow-primary-600/25 hover:from-primary-700 hover:to-primary-800 transition-all">
              立即支付
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
