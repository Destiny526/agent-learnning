'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Favorite, FavoriteType } from '@/lib/favorites';

// ── 类型筛选标签 ──────────────────────────────────────────────

const FILTER_TABS: { key: FavoriteType | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'high_speed', label: '高铁/动车', icon: '🚄' },
  { key: 'flight', label: '航班', icon: '✈️' },
  { key: 'train', label: '火车', icon: '🚂' },
];

// ── Skeleton 加载卡片 ─────────────────────────────────────────

function FavoriteCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-gray-200 rounded-xl" />
        <div className="space-y-2">
          <div className="w-24 h-4 bg-gray-200 rounded" />
          <div className="w-16 h-3 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-8 bg-gray-200 rounded" />
        <div className="flex-1 h-px bg-gray-100" />
        <div className="w-16 h-8 bg-gray-200 rounded" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="w-20 h-5 bg-gray-100 rounded" />
        <div className="flex gap-2">
          <div className="w-20 h-9 bg-gray-100 rounded-lg" />
          <div className="w-20 h-9 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <FavoriteCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── 空状态 ────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无收藏</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        去搜索你的行程吧，找到心仪的路线后点击收藏
      </p>
      <button
        onClick={() => router.push('/search')}
        className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium rounded-xl
          shadow-lg shadow-primary-600/25 transition-all duration-200
          hover:from-primary-700 hover:to-primary-600 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5
          active:translate-y-0 active:shadow-md text-sm"
      >
        去搜索行程
      </button>
    </div>
  );
}

// ── 删除确认弹窗 ─────────────────────────────────────────────

function DeleteConfirm({
  open,
  favorite,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  favorite: Favorite | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || !favorite) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      {/* 弹窗 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">确认取消收藏</h3>
          <p className="text-sm text-gray-500 mb-6">
            确定要取消收藏 <span className="font-medium text-gray-700">{favorite.from_city} → {favorite.to_city}</span>（{favorite.train_no}）吗？
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              再想想
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
            >
              确认取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI 评分徽章 ───────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? 'from-emerald-500 to-emerald-400 text-emerald-700 bg-emerald-50' :
    score >= 80 ? 'from-primary-500 to-primary-400 text-primary-700 bg-primary-50' :
    score >= 70 ? 'from-amber-500 to-amber-400 text-amber-700 bg-amber-50' :
    'from-gray-400 to-gray-300 text-gray-600 bg-gray-50';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${color.split(' ').slice(2).join(' ')}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <span className="text-xs font-bold tabular-nums">{score}</span>
      <span className="text-[10px] opacity-70">AI</span>
    </div>
  );
}

// ── 收藏卡片 ──────────────────────────────────────────────────

function FavoriteCard({
  favorite,
  index,
  onDelete,
  onView,
}: {
  favorite: Favorite;
  index: number;
  onDelete: (fav: Favorite) => void;
  onView: (fav: Favorite) => void;
}) {
  // 日期格式化
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `${month}月${day}日 周${weekday}`;
  };

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/60 hover:border-gray-200 hover:-translate-y-1 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
    >
      <div className="p-5 sm:p-6">
        {/* ─── 顶部：类型 + 车次 + 评分 ─── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">{favorite.type_icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-gray-900">{favorite.train_no}</span>
                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-600">
                  {favorite.type_label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(favorite.departure_date)}</p>
            </div>
          </div>
          <ScoreBadge score={favorite.ai_score} />
        </div>

        {/* ─── 时间线：出发 → 到达 ─── */}
        <div className="flex items-center gap-4 mb-5">
          <div className="text-center min-w-[70px]">
            <div className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{favorite.departure_time}</div>
            <div className="text-xs text-gray-500 mt-1 truncate">{favorite.from_station}</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1 py-1">
            <div className="text-sm font-medium text-primary-600">{favorite.duration}</div>
            <div className="w-full h-px bg-gray-200 relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400 border-2 border-white shadow-sm" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500 border-2 border-white shadow-sm" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="text-xs">{favorite.type_icon}</span>
              </div>
            </div>
          </div>
          <div className="text-center min-w-[70px]">
            <div className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{favorite.arrival_time}</div>
            <div className="text-xs text-gray-500 mt-1 truncate">{favorite.to_station}</div>
          </div>
        </div>

        {/* ─── 路线标签 ─── */}
        <div className="flex items-center gap-2 mb-5">
          <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-lg">
            {favorite.from_city}
          </span>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-lg">
            {favorite.to_city}
          </span>
        </div>

        {/* ─── 底部：价格 + 操作按钮 ─── */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-gray-400">¥</span>
              <span className="text-2xl font-bold text-primary-600 tabular-nums leading-none">{favorite.price}</span>
            </div>
            <span className="text-[11px] text-gray-400">起</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onView(favorite)}
              className="px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium rounded-xl
                shadow-md shadow-primary-600/20 transition-all duration-200
                hover:from-primary-700 hover:to-primary-600 hover:shadow-lg hover:shadow-primary-600/25
                active:scale-[0.97] text-sm"
            >
              查看详情
            </button>
            <button
              onClick={() => onDelete(favorite)}
              className="px-4 py-2.5 bg-white text-gray-500 font-medium rounded-xl border border-gray-200
                transition-all duration-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200
                active:scale-[0.97] text-sm"
            >
              取消收藏
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated, loadFromStorage, loading: authLoading } = useAuthStore();
  const {
    favorites,
    loading,
    error,
    filter,
    fetchFavorites,
    removeFavorite,
    setFilter,
    filteredFavorites,
  } = useFavoriteStore();

  const [deleteTarget, setDeleteTarget] = useState<Favorite | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 鉴权 + 数据加载
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated, fetchFavorites]);

  // 删除收藏
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await removeFavorite(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };

  // 查看详情
  const handleView = (fav: Favorite) => {
    router.push(`/route/${fav.route_id}?date=${fav.departure_date}`);
  };

  // 筛选后的列表
  const displayList = filteredFavorites();

  // 各类型数量
  const counts = {
    all: favorites.length,
    high_speed: favorites.filter((f) => f.type === 'high_speed').length,
    flight: favorites.filter((f) => f.type === 'flight').length,
    train: favorites.filter((f) => f.type === 'train').length,
  };

  // 加载中 / 未登录
  if (authLoading || (!isAuthenticated && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a] pt-20 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-amber-600/10 blur-[120px] breathe" />
        <div className="absolute bottom-[-30%] left-[-5%] w-[300px] h-[300px] rounded-full bg-primary-600/10 blur-[100px] breathe" style={{ animationDelay: '4s' }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 返回按钮 */}
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回个人中心
          </button>

          {/* 标题 */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/15">
              <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">我的收藏</h1>
              <p className="text-sm text-white/50 mt-1">
                {loading ? '加载中...' : `共 ${favorites.length} 条收藏路线`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10 pt-6 pb-16">
        {/* ─── 错误提示 ─── */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-6 animate-scale-in">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* ─── 筛选标签 ─── */}
        {!loading && favorites.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto scroll-container pb-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  filter === tab.key
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600 hover:shadow-sm'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  filter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ─── 内容区 ─── */}
        {loading ? (
          <LoadingGrid />
        ) : favorites.length === 0 ? (
          <EmptyState />
        ) : displayList.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">该类型下暂无收藏</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayList.map((fav, i) => (
              <FavoriteCard
                key={fav.id}
                favorite={fav}
                index={i}
                onDelete={setDeleteTarget}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── 删除确认弹窗 ─── */}
      <DeleteConfirm
        open={!!deleteTarget}
        favorite={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
