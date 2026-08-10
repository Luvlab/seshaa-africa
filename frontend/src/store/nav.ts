import { create } from 'zustand';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const ALL_NAV_ITEMS = ['home','search','news','classifieds','prices','market','radio','events','translate','diaspora','ride','delivery','transport','archive','advertise','ambassador','admin'];

interface NavState {
  visibleNavItems: string[];
  loaded: boolean;
  load: () => Promise<void>;
}

export const useNavStore = create<NavState>((set, get) => ({
  visibleNavItems: [...ALL_NAV_ITEMS],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const r = await fetch(`${BASE_URL}/admin/public/nav-settings`);
      const data = await r.json() as { visibleNavItems?: string[] };
      set({
        visibleNavItems: Array.isArray(data.visibleNavItems) ? data.visibleNavItems : [...ALL_NAV_ITEMS],
        loaded: true,
      });
    } catch {
      set({ visibleNavItems: [...ALL_NAV_ITEMS], loaded: true });
    }
  },
}));
