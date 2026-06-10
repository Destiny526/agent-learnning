import { create } from 'zustand';

interface SearchRecord {
  origin: string;
  destination: string;
  departureDate: string;
  timestamp: number;
}

interface SearchState {
  origin: string;
  destination: string;
  departureDate: string;
  recommendationType: string;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredTime: string | null;
  searchHistory: SearchRecord[];
  setSearchParams: (params: Partial<SearchState>) => void;
  clearSearch: () => void;
  addHistory: (record: Omit<SearchRecord, 'timestamp'>) => void;
  loadHistory: () => void;
}

const DEFAULTS = {
  origin: '',
  destination: '',
  departureDate: '',
  recommendationType: 'optimal',
  budgetMin: null,
  budgetMax: null,
  preferredTime: null,
};

export const useSearchStore = create<SearchState>((set, get) => ({
  ...DEFAULTS,
  searchHistory: [],

  setSearchParams: (params) => set(params),

  clearSearch: () => set(DEFAULTS),

  addHistory: (record) => {
    const newRecord = { ...record, timestamp: Date.now() };
    const history = [newRecord, ...get().searchHistory.filter(
      (h) => !(h.origin === record.origin && h.destination === record.destination && h.departureDate === record.departureDate)
    )].slice(0, 10);
    set({ searchHistory: history });
    if (typeof window !== 'undefined') {
      localStorage.setItem('searchHistory', JSON.stringify(history));
    }
  },

  loadHistory: () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      try { set({ searchHistory: JSON.parse(saved) }); } catch {}
    }
  },
}));
