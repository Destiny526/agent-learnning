'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Favorite {
  id: number;
  type: string;
  origin: string;
  destination: string;
  train_no: string | null;
  departure_time: string;
  arrival_time: string;
  price: number;
  ai_score: number;
  user: { id: number; phone: string; nickname: string };
  created_at: string;
}

interface FavoritesResponse {
  items: Favorite[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  high_speed: { label: '高铁', icon: '🚄' },
  flight: { label: '航班', icon: '✈️' },
  train: { label: '火车', icon: '🚂' },
};

const FILTER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'high_speed', label: '高铁' },
  { key: 'flight', label: '航班' },
  { key: 'train', label: '火车' },
];

export default function FavoritesPage() {
  const [data, setData] = useState<FavoritesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');

  const fetchFavorites = (p: number, t: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), page_size: '10' });
    if (t && t !== 'all') params.set('type', t);
    if (q) params.set('search', q);
    api.get(`/api/admin/favorites?${params}`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFavorites(page, type, search); }, [page, type]);

  const handleSearch = () => {
    setPage(1);
    fetchFavorites(1, type, search);
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
            placeholder="搜索城市、车次..."
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">路线</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">时间</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">价格</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">AI评分</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">收藏时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.items.map((fav) => {
                    const typeConf = TYPE_CONFIG[fav.type] || { label: fav.type, icon: '🚆' };
                    return (
                      <tr key={fav.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{fav.user.nickname}</div>
                          <div className="text-xs text-gray-400">{fav.user.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{fav.origin} → {fav.destination}</div>
                          {fav.train_no && <div className="text-xs text-gray-400">{fav.train_no}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {typeConf.icon} {typeConf.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{fav.departure_time} - {fav.arrival_time}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">¥{fav.price}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            fav.ai_score >= 90 ? 'bg-emerald-50 text-emerald-700' :
                            fav.ai_score >= 80 ? 'bg-primary-50 text-primary-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>{fav.ai_score}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(fav.created_at).toLocaleDateString('zh-CN')}</td>
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
