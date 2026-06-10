'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface StatsData {
  counts: {
    users: number;
    orders: number;
    favorites: number;
    notifications: number;
  };
  orderStats: { status: string; count: number }[];
  recentUsers: { id: number; phone: string; nickname: string; created_at: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  completed: '已完成',
  cancelled: '已取消',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-20 text-gray-500">加载失败</div>;
  }

  const statCards = [
    { label: '用户总数', value: stats.counts.users, color: 'bg-blue-500', icon: '👥' },
    { label: '订单总数', value: stats.counts.orders, color: 'bg-emerald-500', icon: '🎫' },
    { label: '收藏总数', value: stats.counts.favorites, color: 'bg-amber-500', icon: '⭐' },
    { label: '通知总数', value: stats.counts.notifications, color: 'bg-violet-500', icon: '🔔' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{card.icon}</span>
              <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 tabular-nums">{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">订单状态分布</h3>
          <div className="space-y-3">
            {stats.orderStats.map((stat) => (
              <div key={stat.status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{STATUS_LABELS[stat.status] || stat.status}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        stat.status === 'pending' ? 'bg-amber-400' :
                        stat.status === 'paid' ? 'bg-blue-400' :
                        stat.status === 'completed' ? 'bg-emerald-400' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${Math.min(100, stat.count * 20)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-8 text-right">{stat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">最近注册用户</h3>
          <div className="space-y-3">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-600">{(user.nickname || 'U')[0]}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.nickname}</div>
                    <div className="text-xs text-gray-400">{user.phone}</div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{new Date(user.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
