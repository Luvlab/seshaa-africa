import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CountryTheme {
  primary: string;
  secondary: string;
  accent: string;
  text?: string;
  name: string;
  code: string;
  lang: string;
}

export interface ThemeOverride {
  primary?: string;
  secondary?: string;
  accent?: string;
  text?: string;
}

// All 54 African countries — flag-derived colors
const THEMES: Record<string, Omit<CountryTheme, 'code'>> = {
  DZ: { primary: '#006233', secondary: '#FFFFFF', accent: '#D21034', name: 'Algeria', lang: 'ar' },
  AO: { primary: '#CC0000', secondary: '#000000', accent: '#FFD700', name: 'Angola', lang: 'pt' },
  BJ: { primary: '#008751', secondary: '#FCD116', accent: '#DE2110', name: 'Benin', lang: 'fr' },
  BW: { primary: '#75AADB', secondary: '#FFFFFF', accent: '#000000', name: 'Botswana', lang: 'en' },
  BF: { primary: '#EF2B2D', secondary: '#009A00', accent: '#FCD116', name: 'Burkina Faso', lang: 'fr' },
  BI: { primary: '#CE1126', secondary: '#1EB53A', accent: '#FFFFFF', name: 'Burundi', lang: 'fr' },
  CV: { primary: '#003893', secondary: '#CF2027', accent: '#FFD700', name: 'Cape Verde', lang: 'pt' },
  CM: { primary: '#007A5E', secondary: '#CE1126', accent: '#FCD116', name: 'Cameroon', lang: 'fr' },
  CF: { primary: '#289728', secondary: '#FFCB00', accent: '#003082', name: 'Central African Republic', lang: 'fr' },
  TD: { primary: '#002664', secondary: '#FECB00', accent: '#C60C30', name: 'Chad', lang: 'fr' },
  KM: { primary: '#3A75C4', secondary: '#3F9C35', accent: '#FFC61E', name: 'Comoros', lang: 'ar' },
  CG: { primary: '#009A00', secondary: '#FBDE4A', accent: '#DC241F', name: 'Republic of Congo', lang: 'fr' },
  CD: { primary: '#007FFF', secondary: '#F7D618', accent: '#CE1021', name: 'DR Congo', lang: 'fr' },
  CI: { primary: '#F77F00', secondary: '#FFFFFF', accent: '#009A44', name: "Côte d'Ivoire", lang: 'fr' },
  DJ: { primary: '#6AB2E7', secondary: '#12AD2B', accent: '#FFFFFF', name: 'Djibouti', lang: 'fr' },
  EG: { primary: '#CE1126', secondary: '#FFFFFF', accent: '#000000', name: 'Egypt', lang: 'ar' },
  GQ: { primary: '#3E9A00', secondary: '#E32118', accent: '#0073CE', name: 'Equatorial Guinea', lang: 'es' },
  ER: { primary: '#4189DD', secondary: '#4CAA51', accent: '#D21034', name: 'Eritrea', lang: 'ar' },
  ET: { primary: '#078930', secondary: '#FCDD09', accent: '#DA121A', name: 'Ethiopia', lang: 'am' },
  GA: { primary: '#009E60', secondary: '#FFD700', accent: '#3A75C4', name: 'Gabon', lang: 'fr' },
  GM: { primary: '#3A7728', secondary: '#CE1126', accent: '#3E4095', name: 'Gambia', lang: 'en' },
  GH: { primary: '#006B3F', secondary: '#FCD20F', accent: '#CF0921', name: 'Ghana', lang: 'en' },
  GN: { primary: '#CE1126', secondary: '#FCD116', accent: '#009460', name: 'Guinea', lang: 'fr' },
  GW: { primary: '#CE1126', secondary: '#FFD700', accent: '#009E60', name: 'Guinea-Bissau', lang: 'pt' },
  KE: { primary: '#006600', secondary: '#BB0000', accent: '#000000', name: 'Kenya', lang: 'sw' },
  LS: { primary: '#009543', secondary: '#0033A0', accent: '#FFFFFF', name: 'Lesotho', lang: 'en' },
  LR: { primary: '#BF0A30', secondary: '#FFFFFF', accent: '#002868', name: 'Liberia', lang: 'en' },
  LY: { primary: '#239E46', secondary: '#000000', accent: '#FFFFFF', name: 'Libya', lang: 'ar' },
  MG: { primary: '#FC3D32', secondary: '#007E3A', accent: '#FFFFFF', name: 'Madagascar', lang: 'fr' },
  MW: { primary: '#339E35', secondary: '#CE1126', accent: '#000000', name: 'Malawi', lang: 'en' },
  ML: { primary: '#14B53A', secondary: '#FCD116', accent: '#CE1126', name: 'Mali', lang: 'fr' },
  MR: { primary: '#006233', secondary: '#FFD700', accent: '#D21034', name: 'Mauritania', lang: 'ar' },
  MU: { primary: '#EA2839', secondary: '#1A206D', accent: '#FFD500', name: 'Mauritius', lang: 'fr' },
  MA: { primary: '#C1272D', secondary: '#FFFFFF', accent: '#006233', name: 'Morocco', lang: 'ar' },
  MZ: { primary: '#009A44', secondary: '#FCE100', accent: '#000000', name: 'Mozambique', lang: 'pt' },
  NA: { primary: '#003580', secondary: '#009543', accent: '#CC0000', name: 'Namibia', lang: 'en' },
  NE: { primary: '#0DB02B', secondary: '#E05206', accent: '#FFFFFF', name: 'Niger', lang: 'fr' },
  NG: { primary: '#008751', secondary: '#FFFFFF', accent: '#006B2B', name: 'Nigeria', lang: 'en' },
  RW: { primary: '#20603D', secondary: '#FAD201', accent: '#00A1DE', name: 'Rwanda', lang: 'en' },
  ST: { primary: '#12AD2B', secondary: '#FFCE00', accent: '#D21034', name: 'São Tomé & Príncipe', lang: 'pt' },
  SN: { primary: '#00853F', secondary: '#FDEF42', accent: '#E31B23', name: 'Senegal', lang: 'fr' },
  SC: { primary: '#003F87', secondary: '#FCD856', accent: '#D62828', name: 'Seychelles', lang: 'fr' },
  SL: { primary: '#1EB53A', secondary: '#FFFFFF', accent: '#0072C6', name: 'Sierra Leone', lang: 'en' },
  SO: { primary: '#4189DD', secondary: '#FFFFFF', accent: '#4189DD', name: 'Somalia', lang: 'ar' },
  ZA: { primary: '#007A4D', secondary: '#FFB612', accent: '#002395', name: 'South Africa', lang: 'en' },
  SS: { primary: '#078930', secondary: '#D21034', accent: '#000000', name: 'South Sudan', lang: 'en' },
  SD: { primary: '#007229', secondary: '#D21034', accent: '#000000', name: 'Sudan', lang: 'ar' },
  SZ: { primary: '#3E5EB9', secondary: '#FFD900', accent: '#B10C0C', name: 'Eswatini', lang: 'en' },
  TZ: { primary: '#1EB53A', secondary: '#000000', accent: '#00A3DD', name: 'Tanzania', lang: 'sw' },
  TG: { primary: '#006A4E', secondary: '#FFCE00', accent: '#D21034', name: 'Togo', lang: 'fr' },
  TN: { primary: '#E70013', secondary: '#FFFFFF', accent: '#C60012', name: 'Tunisia', lang: 'ar' },
  UG: { primary: '#000000', secondary: '#FCD116', accent: '#D90000', name: 'Uganda', lang: 'en' },
  ZM: { primary: '#198A00', secondary: '#EF7D00', accent: '#000000', name: 'Zambia', lang: 'en' },
  ZW: { primary: '#006400', secondary: '#FFD200', accent: '#D40000', name: 'Zimbabwe', lang: 'en' },
  DEFAULT: { primary: '#008751', secondary: '#FFFFFF', accent: '#FCD116', name: 'Africa', lang: 'en' },
};

function darken(hex: string, amount = 20): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function lighten(hex: string, amount = 230): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function contrastText(hex: string): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#111827' : '#FFFFFF';
}

interface ThemeState {
  countryCode: string;
  theme: CountryTheme;
  detected: boolean;
  overrides: Record<string, ThemeOverride>;
  applyTheme: (code: string) => void;
  detectFromIP: () => Promise<void>;
  loadThemeOverrides: () => Promise<void>;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      countryCode: 'NG',
      theme: { ...THEMES['NG'], code: 'NG' },
      detected: false,
      overrides: {},

      applyTheme: (code: string) => {
        const base = THEMES[code] || THEMES['DEFAULT'];
        const override = get().overrides[code] || {};
        const t = { ...base, ...override };
        const theme: CountryTheme = { ...t, code };
        const root = document.documentElement;
        root.style.setProperty('--cp', t.primary);
        root.style.setProperty('--cp-dark', darken(t.primary));
        root.style.setProperty('--cp-light', lighten(t.primary, 220));
        root.style.setProperty('--cs', t.secondary);
        root.style.setProperty('--ca', t.accent);
        root.style.setProperty('--ct', t.text || contrastText(t.primary));
        set({ countryCode: code, theme, detected: true });
      },

      loadThemeOverrides: async () => {
        try {
          const r = await fetch(`${BASE_URL}/admin/public/theme-settings`);
          const data = await r.json() as { overrides?: Record<string, ThemeOverride> };
          set({ overrides: data.overrides || {} });
          get().applyTheme(get().countryCode);
        } catch {
          set({ overrides: {} });
        }
      },

      detectFromIP: async () => {
        if (get().detected) return; // already detected this session
        try {
          const r = await fetch(`${BASE_URL}/geo/detect`);
          const data = await r.json() as { countryCode: string };
          if (data.countryCode) get().applyTheme(data.countryCode);
        } catch {
          get().applyTheme('NG'); // fallback
        }
      },
    }),
    {
      name: 'seshaa-theme',
      partialize: (s) => ({ countryCode: s.countryCode, detected: false }), // don't persist detected flag
    }
  )
);

export const getThemeForCode = (code: string): CountryTheme => ({
  ...(THEMES[code] || THEMES['DEFAULT']),
  code,
});
