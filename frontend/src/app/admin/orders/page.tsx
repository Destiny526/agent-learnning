'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Order {
  id: number;
  order_no: string;
  status: string;
  seat_type: string;
  price: number;
  train_no: string;
  date: string;
  origin: string;
  destination: string;
  user: { id: number; phone: string; nickname: string };
  created_at: string;
}

interface OrdersResponse {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待支付', color: 'text-amber-700', bg: 'bg-amber-50' },
  paid: { label: '已支付', color: 'text-blue-700', bg: 'bg-blue-50' },
  completed: { label: '已完成', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50' },
};

const FILTER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'paid', label: '已支付' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

export default function OrdersPage() {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  const fetchOrders = (p: number, s: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), page_size: '10' });
    if (s && s !== 'all') params.set('status', s);
    if (q) params.set('search', q);
    api.get(`/api/admin/orders?${params}`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(page, status, search); }, [page, status]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders(1, status, search);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatus(tab.key); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                status === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="搜索订单号、用户手机号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
          <button onClick={handleSearch} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
            搜索
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-20 text-gray-500">暂无数据</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">订单号</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">用户</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">行程</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">座位</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">价格</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((order) => {
                    const statusConf = STATUS_CONFIG[order.status] || { label: order.status, color: 'text-gray-500', bg: 'bg-gray-50' };
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">{order.order_no}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{order.user.nickname}</div>
                          <div className="text-xs text-gray-400">{order.user.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{order.origin} → {order.destination}</div>
                          <div className="text-xs text-gray-400">{order.train_no} · {order.date}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{order.seat_type}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">¥{order.price}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConf.color} ${statusConf.bg}`}>
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleString('zh-CN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">共 {data.total} 条</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
                <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {data.total_pages}</span>
                <button onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
