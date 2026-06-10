// ============================================================
// 订单 API 层
// 支持真实数据库和 Mock 模式
// ============================================================

import api from './api';

// ---------- 类型定义 ----------

export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled';

export interface OrderPassenger {
  name: string;
  idType: string;
  idNumber: string;
  phone: string;
}

export interface Order {
  id: string;
  order_no: string;
  status: OrderStatus;
  train_no: string;
  date: string;
  seat: string;
  price: number;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  passengers: OrderPassenger[];
  contact_phone: string;
  created_at: string;
}

export interface CreateOrderParams {
  train_no: string;
  date: string;
  seat_type: string;
  price: number;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  passengers: OrderPassenger[];
  contact_phone: string;
}

// ---------- Mock 数据 ----------

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD1001',
    order_no: 'TR20260608001',
    status: 'paid',
    train_no: 'G11',
    date: '2026-06-15',
    seat: '二等座',
    price: 553,
    origin: '北京',
    destination: '上海',
    departure: '09:00',
    arrival: '13:43',
    passengers: [{ name: '张三', idType: 'sfz', idNumber: '110101199001011234', phone: '13800138000' }],
    contact_phone: '13800138000',
    created_at: '2026-06-08T10:00:00Z',
  },
  {
    id: 'ORD1002',
    order_no: 'TR20260608002',
    status: 'pending',
    train_no: 'MU5101',
    date: '2026-06-20',
    seat: '经济舱',
    price: 1280,
    origin: '上海',
    destination: '广州',
    departure: '08:30',
    arrival: '11:05',
    passengers: [{ name: '李四', idType: 'sfz', idNumber: '310101199202022345', phone: '13900139000' }],
    contact_phone: '13900139000',
    created_at: '2026-06-08T14:30:00Z',
  },
  {
    id: 'ORD1003',
    order_no: 'TR20260608003',
    status: 'completed',
    train_no: 'D3125',
    date: '2026-05-28',
    seat: '一等座',
    price: 187,
    origin: '杭州',
    destination: '南京',
    departure: '14:20',
    arrival: '16:05',
    passengers: [{ name: '王五', idType: 'sfz', idNumber: '330101199303033456', phone: '13700137000' }],
    contact_phone: '13700137000',
    created_at: '2026-05-25T09:00:00Z',
  },
  {
    id: 'ORD1004',
    order_no: 'TR20260608004',
    status: 'cancelled',
    train_no: 'K45',
    date: '2026-06-10',
    seat: '硬座',
    price: 86,
    origin: '成都',
    destination: '重庆',
    departure: '10:30',
    arrival: '14:20',
    passengers: [{ name: '赵六', idType: 'sfz', idNumber: '510101199404044567', phone: '13600136000' }],
    contact_phone: '13600136000',
    created_at: '2026-06-05T16:00:00Z',
  },
];

function mockDelay(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Mock API ----------

let mockStore = [...MOCK_ORDERS];

const mockApi = {
  getOrders: async (status?: string) => {
    await mockDelay();
    let items = [...mockStore];
    if (status && status !== 'all') {
      items = items.filter((o) => o.status === status);
    }
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { data: items };
  },

  getOrderById: async (id: string) => {
    await mockDelay(300);
    const order = mockStore.find((o) => o.id === id);
    if (!order) throw { response: { data: { detail: '订单不存在' } } };
    return { data: order };
  },

  createOrder: async (params: CreateOrderParams) => {
    await mockDelay();
    const newOrder: Order = {
      id: `ORD${Date.now()}`,
      order_no: `TR${Date.now()}`,
      status: 'pending',
      train_no: params.train_no,
      date: params.date,
      seat: params.seat_type,
      price: params.price,
      origin: params.origin,
      destination: params.destination,
      departure: params.departure,
      arrival: params.arrival,
      passengers: params.passengers,
      contact_phone: params.contact_phone,
      created_at: new Date().toISOString(),
    };
    mockStore = [newOrder, ...mockStore];
    return { data: newOrder };
  },

  updateOrderStatus: async (id: string, status: OrderStatus) => {
    await mockDelay(300);
    mockStore = mockStore.map((o) => o.id === id ? { ...o, status } : o);
    return { data: { id, status } };
  },
};

// ---------- 真实 API ----------

const realApi = {
  getOrders: async (status?: string) => {
    const params = status && status !== 'all' ? `?status=${status}` : '';
    return api.get<Order[]>(`/api/orders${params}`);
  },

  getOrderById: async (id: string) => {
    return api.get<Order>(`/api/orders/${id}`);
  },

  createOrder: async (params: CreateOrderParams) => {
    return api.post<Order>('/api/orders', params);
  },

  updateOrderStatus: async (id: string, status: OrderStatus) => {
    return api.patch(`/api/orders/${id}`, { status });
  },
};

// ---------- 统一导出 ----------

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || !process.env.NEXT_PUBLIC_API_URL;

export const ordersApi = USE_MOCK ? mockApi : realApi;
