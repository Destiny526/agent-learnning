import { create } from 'zustand';
import type { Ticket } from '@/lib/mock-data';

interface CompareState {
  list: Ticket[];
  add: (ticket: Ticket) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  list: [],

  add: (ticket) => {
    const { list } = get();
    if (list.length >= 4) return;
    if (list.some((t) => t.id === ticket.id)) return;
    set({ list: [...list, ticket] });
  },

  remove: (id) => {
    set({ list: get().list.filter((t) => t.id !== id) });
  },

  clear: () => set({ list: [] }),

  has: (id) => get().list.some((t) => t.id === id),
}));
