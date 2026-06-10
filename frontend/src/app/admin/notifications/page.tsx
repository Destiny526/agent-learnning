'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Notification {
  id: number;
  type: string;
  title: string;
  content: string;
  is_read: boolean;
  user: { id: number; phone: string; nickname: string };
  created_at: string;
}

interface NotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  order: { label: '订单', color: 'text-primary-700', bg: 'bg-primary-50' },
  favorite: { label: '收藏', color: 'text-amber-700', bg: 'bg-amber-50' },
  system: { label: '系统', color: 'text-emerald-700', bg: 'bg-emerald-50' },
};

const FILTER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'order', label: '订单' },
  { key: 'favorite', label: '收藏' },
  { key: 'system', label: '系统' },
];

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');

  const fetchNotifications = (p: number, t: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), page_size: '10' });
    if (t && t !== 'all') params.set('type', t);
    if (q) params.set('search', q);
    api.get(`/api/admin/notifications?${params}`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(page, type, search); }, [page, type]);

  const handleSearch = () => {
    setPage(1);
    fetchNotifications(1, type, search);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setType(tab.key); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                type === tab.key
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
            placeholder="搜索标题、内容..."
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">用户</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">标题</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">内容</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((n) => {
                    const typeConf = TYPE_CONFIG[n.type] || { label: n.type, color: 'text-gray-700', bg: 'bg-gray-50' };
                    return (
                      <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{n.user.nickname}</div>
                          <div className="text-xs text-gray-400">{n.user.phone}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConf.color} ${typeConf.bg}`}>
                            {typeConf.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{n.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{n.content}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            n.is_read ? 'bg-gray-100 text-gray-500' : 'bg-primary-50 text-primary-700'
                          }`}>
                            {n.is_read ? '已读' : '未读'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(n.created_at).toLocaleString('zh-CN')}</td>
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
