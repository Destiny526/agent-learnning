// ============================================================
// 订单状态管理 (Zustand)
// ============================================================

import { create } from 'zustand';
import { ordersApi, type Order, type CreateOrderParams, type OrderStatus } from '@/lib/orders';

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;

  fetchOrders: (status?: string) => Promise<void>;
  fetchOrderDetail: (id: string) => Promise<void>;
  createOrder: (params: CreateOrderParams) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,

  fetchOrders: async (status?: string) => {
    set({ loading: true, error: null });
    try {
      const { data } = await ordersApi.getOrders(status);
      set({ orders: data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '获取订单失败', loading: false });
    }
  },

  fetchOrderDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data } = await ordersApi.getOrderById(id);
      set({ currentOrder: data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '获取订单详情失败', loading: false });
    }
  },

  createOrder: async (params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await ordersApi.createOrder(params);
      set((state) => ({ orders: [data, ...state.orders], loading: false }));
      return data;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '创建订单失败', loading: false });
      throw err;
    }
  },

  updateOrderStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await ordersApi.updateOrderStatus(id, status);
      set((state) => ({
        orders: state.orders.map((o) => o.id === id ? { ...o, status } : o),
        currentOrder: state.currentOrder?.id === id ? { ...state.currentOrder, status } : state.currentOrder,
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '更新订单失败', loading: false });
    }
  },
}));
