// ============================================================
// 通知状态管理 (Zustand)
// ============================================================

import { create } from 'zustand';
import { notificationsApi, type Notification, type NotificationType } from '@/lib/notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  filter: NotificationType | 'all';

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  setFilter: (filter: NotificationType | 'all') => void;
  filteredNotifications: () => Notification[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  filter: 'all',

  fetchNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await notificationsApi.getNotifications({ type: get().filter });
      set({ notifications: data.items, unreadCount: data.unread_count, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '获取通知失败', loading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, state.unreadCount - (state.notifications.find((n) => n.id === id && !n.is_read) ? 1 : 0)),
      }));
    } catch {
      // 静默处理
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {
      // 静默处理
    }
  },

  deleteNotification: async (id) => {
    try {
      const wasUnread = get().notifications.find((n) => n.id === id && !n.is_read);
      await notificationsApi.deleteNotification(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }));
    } catch {
      // 静默处理
    }
  },

  setFilter: (filter) => {
    set({ filter });
    get().fetchNotifications();
  },

  filteredNotifications: () => get().notifications,
}));
