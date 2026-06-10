import { create } from 'zustand';
import { searchApi, SearchParams, RecommendResult } from '@/lib/search';

interface ResultState {
  results: Record<string, RecommendResult[]>;
  activeTab: string;
  compareList: RecommendResult[];
  loading: boolean;
  error: string | null;
  fetchAllRecommendations: (params: SearchParams) => Promise<void>;
  fetchRecommendations: (type: string, params: SearchParams) => Promise<void>;
  setActiveTab: (tab: string) => void;
  addToCompare: (item: RecommendResult) => void;
  removeFromCompare: (itemId: string) => void;
  clearCompare: () => void;
  clearResults: () => void;
}

export const useResultStore = create<ResultState>((set, get) => ({
  results: {},
  activeTab: 'all',
  compareList: [],
  loading: false,
  error: null,

  fetchAllRecommendations: async (params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await searchApi.getAllRecommendations(params);
      set({ results: data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '获取推荐失败', loading: false });
    }
  },

  fetchRecommendations: async (type, params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await searchApi.getRecommendations(type, params);
      set((state) => ({
        results: { ...state.results, [type]: data },
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || '获取推荐失败', loading: false });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  addToCompare: (item) => {
    const list = get().compareList;
    if (list.length >= 4) return;
    if (list.find((i) => i.item_id === item.item_id)) return;
    set({ compareList: [...list, item] });
  },

  removeFromCompare: (itemId) => {
    set({ compareList: get().compareList.filter((i) => i.item_id !== itemId) });
  },

  clearCompare: () => set({ compareList: [] }),
  clearResults: () => set({ results: {}, compareList: [], error: null }),
}));
