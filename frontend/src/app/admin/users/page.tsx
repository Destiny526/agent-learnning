'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface User {
  id: number;
  phone: string;
  nickname: string;
  email: string | null;
  created_at: string;
  order_count: number;
  favorite_count: number;
  notification_count: number;
}

interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function UsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchUsers = (p: number, s: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), page_size: '10' });
    if (s) params.set('search', s);
    api.get(`/api/admin/users?${params}`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(page, search); }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers(1, search);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="搜索手机号、昵称、邮箱..."
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">昵称</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">手机号</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">邮箱</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">订单</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">收藏</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">注册时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500">{user.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary-600">{(user.nickname || 'U')[0]}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.nickname}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user.email || '-'}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{user.order_count}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{user.favorite_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">共 {data.total} 条</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {data.total_pages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  disabled={page === data.total_pages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
