'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import NotificationCard from '@/components/notifications/NotificationCard';
import NotificationFilter from '@/components/notifications/NotificationFilter';
import EmptyState from '@/components/notifications/EmptyState';
import LoadingSkeleton from '@/components/notifications/LoadingSkeleton';
import type { NotificationType } from '@/lib/notifications';

// ---------- 删除确认弹窗 ----------

function DeleteConfirm({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
          <p className="text-sm text-gray-500 mb-6">确定要删除这条通知吗？</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              取消
            </button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 主页面 ----------

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, loadFromStorage } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    filter,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setFilter,
  } = useNotificationStore();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // 鉴权
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  // 加载数据
  useEffect(() => {
    if (isAuthenticated) fetchNotifications();
  }, [isAuthenticated, fetchNotifications]);

  // 删除
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteNotification(deleteTarget);
    setDeleteTarget(null);
  };

  // 全部已读
  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllAsRead();
    setMarkingAll(false);
  };

  // 统计
  const counts: Record<NotificationType | 'all', number> = {
    all: notifications.length,
    order: notifications.filter((n) => n.type === 'order').length,
    favorite: notifications.filter((n) => n.type === 'favorite').length,
    system: notifications.filter((n) => n.type === 'system').length,
  };

  // 加载中
  if (authLoading || (!isAuthenticated && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a] pt-20 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-600/10 blur-[120px] breathe" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回个人中心
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/15">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">通知中心</h1>
                <p className="text-sm text-white/50 mt-1">
                  {unreadCount > 0 ? `您有 ${unreadCount} 条未读通知` : '所有通知已读'}
                </p>
              </div>
            </div>

            {/* 全部已读按钮 */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl text-sm text-white/80 hover:text-white hover:bg-white/15 transition-all disabled:opacity-50"
              >
                {markingAll ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                全部已读
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10 pt-6 pb-16">
        {/* 移动端全部已读按钮 */}
        {unreadCount > 0 && (
          <div className="sm:hidden mb-4">
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-primary-600 font-medium hover:bg-primary-50 transition-all disabled:opacity-50"
            >
              {markingAll ? '处理中...' : `全部已读（${unreadCount}）`}
            </button>
          </div>
        )}

        {/* 筛选标签 */}
        <div className="mb-6">
          <NotificationFilter active={filter} counts={counts} onChange={setFilter} />
        </div>

        {/* 内容区 */}
        {loading ? (
          <LoadingSkeleton />
        ) : notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {notifications.map((notification, i) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onDelete={setDeleteTarget}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <DeleteConfirm
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
