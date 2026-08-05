import { create } from 'zustand';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface CountriesState {
  activeCountries: string[];
  loaded: boolean;
  load: () => Promise<void>;
}

export const useCountriesStore = create<CountriesState>((set, get) => ({
  activeCountries: ['UG'],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const r = await fetch(`${BASE_URL}/admin/public/country-settings`);
      const data = await r.json() as { activeCountries?: string[] };
      set({ activeCountries: Array.isArray(data.activeCountries) ? data.activeCountries : ['UG'], loaded: true });
    } catch {
      set({ activeCountries: ['UG'], loaded: true });
    }
  },
}));
