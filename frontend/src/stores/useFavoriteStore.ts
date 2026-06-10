// ============================================================
// 收藏状态管理 (Zustand)
// ============================================================

import { create } from 'zustand';
import { favoritesApi, type Favorite, type AddFavoriteParams, type FavoriteType } from '@/lib/favorites';

interface FavoriteState {
  favorites: Favorite[];
  loading: boolean;
  error: string | null;
  filter: FavoriteType | 'all';

  fetchFavorites: () => Promise<void>;
  addFavorite: (params: AddFavoriteParams) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorited: (routeId: string) => boolean;
  setFilter: (filter: FavoriteType | 'all') => void;
  filteredFavorites: () => Favorite[];
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  loading: false,
  error: null,
  filter: 'all',

  fetchFavorites: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await favoritesApi.getFavorites(get().filter);
      set({ favorites: data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '获取收藏失败', loading: false });
    }
  },

  addFavorite: async (params) => {
    try {
      const { data } = await favoritesApi.addFavorite(params);
      set((state) => ({ favorites: [data, ...state.favorites] }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '收藏失败' });
    }
  },

  removeFavorite: async (id) => {
    try {
      await favoritesApi.removeFavorite(id);
      set((state) => ({ favorites: state.favorites.filter((f) => f.id !== id) }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '取消收藏失败' });
    }
  },

  isFavorited: (routeId) => {
    return get().favorites.some((f) => f.route_id === routeId);
  },

  setFilter: (filter) => {
    set({ filter });
    get().fetchFavorites();
  },

  filteredFavorites: () => get().favorites,
}));
