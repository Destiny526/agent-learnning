import { create } from 'zustand';

// ── Types ───────────────────────────────────────────────────────────

export type PreferenceKey =
  | 'budget'       // 省钱优先
  | 'speed'        // 速度优先
  | 'comfort'      // 舒适优先
  | 'direct'       // 直达优先
  | 'business'     // 商务出行
  | 'tourism';     // 旅游休闲

export interface PreferenceItem {
  key: PreferenceKey;
  icon: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PREFERENCE_OPTIONS: PreferenceItem[] = [
  {
    key: 'budget',
    icon: '💰',
    label: '省钱优先',
    description: '优先推荐价格最低的方案',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    key: 'speed',
    icon: '⚡',
    label: '速度优先',
    description: '优先推荐耗时最短的方案',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    key: 'comfort',
    icon: '🛋️',
    label: '舒适优先',
    description: '优先推荐舒适度最高的方案',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    key: 'direct',
    icon: '🎯',
    label: '直达优先',
    description: '优先推荐无需换乘的直达方案',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  {
    key: 'business',
    icon: '💼',
    label: '商务出行',
    description: '推荐商务座/头等舱，注重效率和舒适',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  {
    key: 'tourism',
    icon: '🏖️',
    label: '旅游休闲',
    description: '推荐性价比高、沿途风景好的方案',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
];

// Dimension weights for each preference
export const PREFERENCE_WEIGHTS: Record<PreferenceKey, { time: number; price: number; duration: number; comfort: number }> = {
  budget:   { time: 0.15, price: 0.50, duration: 0.20, comfort: 0.15 },
  speed:    { time: 0.25, price: 0.10, duration: 0.50, comfort: 0.15 },
  comfort:  { time: 0.15, price: 0.15, duration: 0.15, comfort: 0.55 },
  direct:   { time: 0.20, price: 0.20, duration: 0.30, comfort: 0.30 },
  business: { time: 0.30, price: 0.05, duration: 0.30, comfort: 0.35 },
  tourism:  { time: 0.10, price: 0.35, duration: 0.15, comfort: 0.40 },
};

// ── State ───────────────────────────────────────────────────────────

interface PreferenceState {
  selected: PreferenceKey[];
  add: (key: PreferenceKey) => void;
  remove: (key: PreferenceKey) => void;
  toggle: (key: PreferenceKey) => void;
  clear: () => void;
  has: (key: PreferenceKey) => boolean;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const STORAGE_KEY = 'travel_preferences';

export const usePreferenceStore = create<PreferenceState>((set, get) => ({
  selected: [],

  add: (key) => {
    const { selected } = get();
    if (selected.includes(key) || selected.length >= 3) return;
    const next = [...selected, key];
    set({ selected: next });
    get().saveToStorage();
  },

  remove: (key) => {
    const next = get().selected.filter((k) => k !== key);
    set({ selected: next });
    get().saveToStorage();
  },

  toggle: (key) => {
    const { selected } = get();
    if (selected.includes(key)) {
      get().remove(key);
    } else {
      get().add(key);
    }
  },

  clear: () => {
    set({ selected: [] });
    get().saveToStorage();
  },

  has: (key) => get().selected.includes(key),

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ selected: parsed });
        }
      }
    } catch {
      // ignore
    }
  },

  saveToStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(get().selected));
    } catch {
      // ignore
    }
  },
}));
