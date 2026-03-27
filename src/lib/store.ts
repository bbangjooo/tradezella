import { create } from 'zustand';

export interface AppStore {
  period: 'today' | 'week' | 'month' | 'all' | 'custom';
  setPeriod: (period: AppStore['period']) => void;

  dateRange: { from: Date | null; to: Date | null };
  setDateRange: (range: { from: Date | null; to: Date | null }) => void;

  filters: {
    symbol: string | null;
    side: string | null;
    result: 'win' | 'loss' | null;
  };
  setFilters: (filters: Partial<AppStore['filters']>) => void;
  resetFilters: () => void;
}

const defaultFilters: AppStore['filters'] = {
  symbol: null,
  side: null,
  result: null,
};

export const useAppStore = create<AppStore>((set) => ({
  period: 'all',
  setPeriod: (period) => set({ period }),

  dateRange: { from: null, to: null },
  setDateRange: (range) => set({ dateRange: range }),

  filters: { ...defaultFilters },
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));
