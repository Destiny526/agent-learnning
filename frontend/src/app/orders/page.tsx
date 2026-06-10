'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { ordersApi, type Order, type OrderStatus } from '@/lib/orders';

// ── Types ──────────────────────────────────────────────────────

type StatusFilter = 'all' | OrderStatus;

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: '待支付', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  paid: { label: '已支付', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  completed: { label: '已完成', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
};

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'paid', label: '已支付' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

// ── Order Card ─────────────────────────────────────────────────

function OrderCard({ order, onCancel, onPay }: { order: Order; onCancel: () => void; onPay: () => void }) {
  const router = useRouter();
  const status = STATUS_CONFIG[order.status];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">{order.order_no}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${status.color} ${status.bg} ${status.border} border`}>
            {status.label}
          </span>
        </div>
        <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString('zh-CN')}</span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 tabular-nums">{order.departure}</div>
          <div className="text-xs text-gray-500 mt-0.5">{order.origin}</div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="text-xs font-medium text-primary-600">{order.train_no}</div>
          <div className="w-full h-px bg-gray-200 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400 border-2 border-white" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500 border-2 border-white" />
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 tabular-nums">{order.arrival}</div>
          <div className="text-xs text-gray-500 mt-0.5">{order.destination}</div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 mb-4">
        <div>
          <div className="text-[11px] text-gray-400">日期</div>
          <div className="text-sm font-medium text-gray-900">{order.date}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400">座位</div>
          <div className="text-sm font-medium text-gray-900">{order.seat} × {order.passengers.length}人</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-400">总价</div>
          <div className="text-lg font-bold text-primary-600 tabular-nums">¥{order.price}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <>
            <button onClick={onCancel} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              取消订单
            </button>
            <button onClick={onPay} className="flex-1 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors font-medium">
              立即支付
            </button>
          </>
        )}
        {order.status === 'paid' && (
          <div className="flex-1 py-2 text-sm text-center text-blue-600 border border-blue-200 rounded-lg bg-blue-50">
            已支付，等待出票
          </div>
        )}
        {order.status === 'completed' && (
          <div className="flex-1 py-2 text-sm text-center text-emerald-600 border border-emerald-200 rounded-lg bg-emerald-50">
            行程已完成
          </div>
        )}
        {order.status === 'cancelled' && (
          <div className="flex-1 py-2 text-sm text-center text-gray-400 border border-gray-200 rounded-lg">
            订单已取消
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter();
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">🎫</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">暂无订单</h3>
      <p className="text-sm text-gray-500 mb-8">去搜索页预订一张票吧</p>
      <button onClick={() => router.push('/search')} className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 inline-flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        去搜索
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, loadFromStorage } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);

  // 鉴权
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  // 加载订单
  const fetchOrders = async (status?: string) => {
    setLoading(true);
    try {
      const { data } = await ordersApi.getOrders(status);
      setOrders(data);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchOrders(filter);
  }, [isAuthenticated, filter]);

  // 统计
  const [counts, setCounts] = useState<Record<StatusFilter, number>>({
    all: 0, pending: 0, paid: 0, completed: 0, cancelled: 0,
  });

  useEffect(() => {
    if (isAuthenticated) {
      ordersApi.getOrders().then(({ data }) => {
        setCounts({
          all: data.length,
          pending: data.filter((o) => o.status === 'pending').length,
          paid: data.filter((o) => o.status === 'paid').length,
          completed: data.filter((o) => o.status === 'completed').length,
          cancelled: data.filter((o) => o.status === 'cancelled').length,
        });
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  // 取消订单
  const handleCancel = async (id: string) => {
    if (!confirm('确定取消该订单？')) return;
    try {
      await ordersApi.updateOrderStatus(id, 'cancelled');
      fetchOrders(filter);
      // 刷新统计
      const { data } = await ordersApi.getOrders();
      setCounts({
        all: data.length,
        pending: data.filter((o) => o.status === 'pending').length,
        paid: data.filter((o) => o.status === 'paid').length,
        completed: data.filter((o) => o.status === 'completed').length,
        cancelled: data.filter((o) => o.status === 'cancelled').length,
      });
    } catch {
      alert('取消失败，请重试');
    }
  };

  // 模拟支付
  const handlePay = async (id: string) => {
    if (!confirm('确认支付？（模拟支付）')) return;
    try {
      await ordersApi.updateOrderStatus(id, 'paid');
      fetchOrders(filter);
      const { data } = await ordersApi.getOrders();
      setCounts({
        all: data.length,
        pending: data.filter((o) => o.status === 'pending').length,
        paid: data.filter((o) => o.status === 'paid').length,
        completed: data.filter((o) => o.status === 'completed').length,
        cancelled: data.filter((o) => o.status === 'cancelled').length,
      });
    } catch {
      alert('支付失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a] pt-20 pb-6 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            返回首页
          </button>
          <h1 className="text-2xl font-bold text-white">我的订单</h1>
          <p className="text-sm text-white/50 mt-1">共 {counts.all} 个订单</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-3 relative z-10 pb-16">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scroll-container pb-1">
          {FILTER_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.key
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
              }`}>
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filter === tab.key ? 'bg-white/20' : 'bg-gray-100'
                }`}>{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Order list */}
        {loading ? (
          <div className="text-center py-20">
            <svg className="w-8 h-8 text-primary-600 animate-spin mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onCancel={() => handleCancel(order.id)}
                onPay={() => handlePay(order.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
