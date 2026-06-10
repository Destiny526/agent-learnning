// ============================================================
// 通知 API 层
// 支持 Mock 模式和真实 API
// ============================================================

import api from './api';

// ---------- 类型定义 ----------

export type NotificationType = 'order' | 'favorite' | 'system';

export interface Notification {
  id: string;
  user_id: number;
  type: NotificationType;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unread_count: number;
}

// ---------- Mock 数据 ----------

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'ntf_001',
    user_id: 1,
    type: 'order',
    title: '订单创建成功',
    content: '您的北京→上海（G11）行程已创建成功，请在30分钟内完成支付。',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf_002',
    user_id: 1,
    type: 'favorite',
    title: '路线降价提醒',
    content: '您收藏的上海→广州（MU5101）路线价格下降12%，当前价格¥1126。',
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf_003',
    user_id: 1,
    type: 'system',
    title: '系统公告',
    content: '新增航班推荐功能已上线，AI 将为您智能匹配最优航班方案。',
    is_read: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf_004',
    user_id: 1,
    type: 'order',
    title: '订单支付成功',
    content: '您的杭州→南京（D3125）订单已支付成功，座位号将在出票后通知。',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf_005',
    user_id: 1,
    type: 'favorite',
    title: '路线余票紧张',
    content: '您收藏的深圳→武汉（G88）路线7月10日余票不足20张，建议尽快预订。',
    is_read: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf_006',
    user_id: 1,
    type: 'system',
    title: '功能更新',
    content: 'AI 推荐算法升级，新增舒适度维度评分，推荐结果更精准。',
    is_read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf_007',
    user_id: 1,
    type: 'order',
    title: '出行提醒',
    content: '您明天有一趟成都→重庆（K45）的行程，请提前做好出行准备。',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ntf_008',
    user_id: 1,
    type: 'system',
    title: '隐私政策更新',
    content: '我们更新了隐私政策和服务条款，建议您了解相关变更内容。',
    is_read: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function mockDelay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- 真实 API ----------

const realApi = {
  getNotifications: (params?: { type?: string; page?: number; page_size?: number }) =>
    api.get<NotificationListResponse>('/api/notifications', { params }),
  markAsRead: (id: string) =>
    api.patch(`/api/notifications/${id}/read`),
  markAllAsRead: () =>
    api.patch('/api/notifications/read-all'),
  deleteNotification: (id: string) =>
    api.delete(`/api/notifications/${id}`),
};

// ---------- Mock API ----------

let mockStore = [...MOCK_NOTIFICATIONS];

const mockApi = {
  getNotifications: async (params?: { type?: string }) => {
    await mockDelay();
    let items = [...mockStore];
    if (params?.type && params.type !== 'all') {
      items = items.filter((n) => n.type === params.type);
    }
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      data: {
        items,
        total: items.length,
        unread_count: mockStore.filter((n) => !n.is_read).length,
      },
    };
  },

  markAsRead: async (id: string) => {
    await mockDelay(200);
    mockStore = mockStore.map((n) => n.id === id ? { ...n, is_read: true } : n);
    return { data: { success: true } };
  },

  markAllAsRead: async () => {
    await mockDelay(300);
    mockStore = mockStore.map((n) => ({ ...n, is_read: true }));
    return { data: { success: true, count: mockStore.length } };
  },

  deleteNotification: async (id: string) => {
    await mockDelay(200);
    mockStore = mockStore.filter((n) => n.id !== id);
    return { data: { success: true } };
  },
};

// ---------- 统一导出 ----------

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || !process.env.NEXT_PUBLIC_API_URL;

export const notificationsApi = USE_MOCK ? mockApi : realApi;
