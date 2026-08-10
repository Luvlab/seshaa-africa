import { create } from 'zustand';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// All possible nav item IDs (matches Navbar ALL_TABS)
export const ALL_NAV_ITEMS = [
  'home', 'search', 'news', 'classifieds', 'prices', 'market', 'radio', 'events',
  'translate', 'diaspora', 'ride', 'delivery', 'transport', 'archive', 'advertise',
  'ambassador', 'salesrep', 'obituaries', 'admin',
];

// Default visible set — hidden: classifieds, prices, market, diaspora, delivery, transport, archive, advertise, ambassador, salesrep
const DEFAULT_VISIBLE = [
  'home', 'search', 'news', 'radio', 'events', 'translate', 'ride', 'obituaries', 'admin',
];

interface NavState {
  visibleNavItems: string[];
  loaded: boolean;
  load: () => Promise<void>;
}

export const useNavStore = create<NavState>((set, get) => ({
  visibleNavItems: [...DEFAULT_VISIBLE],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const r = await fetch(`${BASE_URL}/admin/public/nav-settings`);
      const data = await r.json() as { visibleNavItems?: string[] };
      set({
        visibleNavItems: Array.isArray(data.visibleNavItems) ? data.visibleNavItems : [...DEFAULT_VISIBLE],
        loaded: true,
      });
    } catch {
      set({ visibleNavItems: [...DEFAULT_VISIBLE], loaded: true });
    }
  },
}));
