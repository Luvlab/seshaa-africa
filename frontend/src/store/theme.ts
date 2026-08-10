import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCountriesStore } from './countries';

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

// All 54 African countries — flag-derived colors (Wikipedia-verified hex values)
const THEMES: Record<string, Omit<CountryTheme, 'code'>> = {
  DZ: { primary: '#007A33', secondary: '#FFFFFF', accent: '#C8102E', name: 'Algeria', lang: 'ar' },        // green #007A33, red #C8102E
  AO: { primary: '#CC0000', secondary: '#000000', accent: '#FFCB00', name: 'Angola', lang: 'pt' },          // red, black, gold #FFCB00
  BJ: { primary: '#008751', secondary: '#FCD116', accent: '#DE2110', name: 'Benin', lang: 'fr' },           // Pan-African green/yellow/red
  BW: { primary: '#75AADB', secondary: '#FFFFFF', accent: '#000000', name: 'Botswana', lang: 'en' },        // light blue, white, black
  BF: { primary: '#EF2B2D', secondary: '#009A00', accent: '#FCD116', name: 'Burkina Faso', lang: 'fr' },    // red, green, yellow star
  BI: { primary: '#C8102E', secondary: '#43B02A', accent: '#FFFFFF', name: 'Burundi', lang: 'fr' },         // red #C8102E, green #43B02A
  CV: { primary: '#003893', secondary: '#CF2027', accent: '#FFD700', name: 'Cape Verde', lang: 'pt' },      // blue, red, yellow stars
  CM: { primary: '#007A5E', secondary: '#CE1126', accent: '#FCD116', name: 'Cameroon', lang: 'fr' },        // green, red, yellow
  CF: { primary: '#289728', secondary: '#FFCE00', accent: '#003082', name: 'Central African Republic', lang: 'fr' }, // green, yellow #FFCE00, blue
  TD: { primary: '#00205B', secondary: '#FFCD00', accent: '#C8102E', name: 'Chad', lang: 'fr' },            // indigo #00205B, yellow #FFCD00, red #C8102E
  KM: { primary: '#3A75C4', secondary: '#3F9C35', accent: '#FFC61E', name: 'Comoros', lang: 'ar' },         // blue, green, yellow
  CG: { primary: '#009739', secondary: '#FFD100', accent: '#EF3340', name: 'Republic of Congo', lang: 'fr' }, // green #009739, yellow #FFD100, red #EF3340
  CD: { primary: '#007FFF', secondary: '#F7D618', accent: '#CE1021', name: 'DR Congo', lang: 'fr' },        // blue, yellow, red
  CI: { primary: '#F77F00', secondary: '#FFFFFF', accent: '#009A44', name: "Côte d'Ivoire", lang: 'fr' },   // orange, white, green
  DJ: { primary: '#6AB2E7', secondary: '#12AD2B', accent: '#D7141A', name: 'Djibouti', lang: 'fr' },        // light blue, green, red star #D7141A
  EG: { primary: '#C8102E', secondary: '#FFFFFF', accent: '#000000', name: 'Egypt', lang: 'ar' },           // red #C8102E, white, black
  GQ: { primary: '#3E9A00', secondary: '#E32118', accent: '#0073CE', name: 'Equatorial Guinea', lang: 'es' }, // green, red, blue
  ER: { primary: '#3C8BDC', secondary: '#4CAA51', accent: '#EB0433', name: 'Eritrea', lang: 'ar' },         // blue #3C8BDC, green, red #EB0433
  ET: { primary: '#078930', secondary: '#FCDD09', accent: '#DA121A', name: 'Ethiopia', lang: 'am' },        // green, yellow, red — Pan-African
  GA: { primary: '#009639', secondary: '#FFD100', accent: '#003DA5', name: 'Gabon', lang: 'fr' },           // green #009639, yellow #FFD100, blue #003DA5
  GM: { primary: '#3A7728', secondary: '#CE1126', accent: '#3E4095', name: 'Gambia', lang: 'en' },          // green, red, blue
  GH: { primary: '#006B3D', secondary: '#FCD20F', accent: '#CF0921', name: 'Ghana', lang: 'en' },           // green #006B3D, gold, red
  GN: { primary: '#CE1126', secondary: '#FCD116', accent: '#009460', name: 'Guinea', lang: 'fr' },          // red, yellow, green
  GW: { primary: '#CE1126', secondary: '#FFD700', accent: '#009E49', name: 'Guinea-Bissau', lang: 'pt' },   // red, yellow, green #009E49
  KE: { primary: '#008C51', secondary: '#922529', accent: '#000000', name: 'Kenya', lang: 'sw' },           // green #008C51, red #922529, black
  LS: { primary: '#009543', secondary: '#00209F', accent: '#FFFFFF', name: 'Lesotho', lang: 'en' },         // green, blue #00209F, white
  LR: { primary: '#BF0A30', secondary: '#FFFFFF', accent: '#002868', name: 'Liberia', lang: 'en' },         // red, white, blue (US-style)
  LY: { primary: '#239E46', secondary: '#000000', accent: '#EF3340', name: 'Libya', lang: 'ar' },           // green, black, red #EF3340
  MG: { primary: '#FC3D32', secondary: '#007E3A', accent: '#FFFFFF', name: 'Madagascar', lang: 'fr' },      // red, green, white
  MW: { primary: '#339E35', secondary: '#CE1126', accent: '#000000', name: 'Malawi', lang: 'en' },          // green, red, black
  ML: { primary: '#14B53A', secondary: '#FCD116', accent: '#CE1126', name: 'Mali', lang: 'fr' },            // green, yellow, red
  MR: { primary: '#00A95C', secondary: '#FFD700', accent: '#D01C1F', name: 'Mauritania', lang: 'ar' },      // green #00A95C (2020 update), red #D01C1F
  MU: { primary: '#EA2839', secondary: '#1A206D', accent: '#FFD500', name: 'Mauritius', lang: 'fr' },       // red, blue, yellow
  MA: { primary: '#B7312C', secondary: '#FFFFFF', accent: '#006341', name: 'Morocco', lang: 'ar' },         // red #B7312C, white, green star #006341
  MZ: { primary: '#009A44', secondary: '#FCE100', accent: '#D21034', name: 'Mozambique', lang: 'pt' },      // green, yellow, red triangle #D21034
  NA: { primary: '#002F6C', secondary: '#009543', accent: '#C8102E', name: 'Namibia', lang: 'en' },         // blue #002F6C, green, red #C8102E
  NE: { primary: '#0DB02B', secondary: '#E05206', accent: '#FFFFFF', name: 'Niger', lang: 'fr' },           // green, orange, white circle
  NG: { primary: '#008751', secondary: '#FFFFFF', accent: '#FFFFFF', name: 'Nigeria', lang: 'en' },         // green #008751 and white only
  RW: { primary: '#20603D', secondary: '#FAD201', accent: '#00A1DE', name: 'Rwanda', lang: 'en' },          // green, yellow, blue
  ST: { primary: '#12AD2B', secondary: '#FFCE00', accent: '#D21034', name: 'São Tomé & Príncipe', lang: 'pt' }, // green, yellow, red
  SN: { primary: '#00853F', secondary: '#FDEF42', accent: '#E31B23', name: 'Senegal', lang: 'fr' },         // green, yellow, red
  SC: { primary: '#003F87', secondary: '#FED141', accent: '#D62828', name: 'Seychelles', lang: 'fr' },      // blue, yellow #FED141, red
  SL: { primary: '#1EB53A', secondary: '#FFFFFF', accent: '#0072C6', name: 'Sierra Leone', lang: 'en' },    // green, white, blue
  SO: { primary: '#418FDE', secondary: '#FFFFFF', accent: '#418FDE', name: 'Somalia', lang: 'ar' },         // light blue #418FDE, white star
  ZA: { primary: '#007A4D', secondary: '#FFB612', accent: '#002395', name: 'South Africa', lang: 'en' },    // green, gold, blue
  SS: { primary: '#078930', secondary: '#DA121A', accent: '#000000', name: 'South Sudan', lang: 'en' },     // green, red #DA121A, black
  SD: { primary: '#007229', secondary: '#D21034', accent: '#000000', name: 'Sudan', lang: 'ar' },           // green, red, black
  SZ: { primary: '#3E5EB9', secondary: '#FFD900', accent: '#B10C0C', name: 'Eswatini', lang: 'en' },        // blue, yellow, crimson
  TZ: { primary: '#1EB53A', secondary: '#000000', accent: '#00A3DD', name: 'Tanzania', lang: 'sw' },        // green, black, blue
  TG: { primary: '#006A4E', secondary: '#FFCE00', accent: '#D21034', name: 'Togo', lang: 'fr' },            // green, yellow, red
  TN: { primary: '#E70013', secondary: '#FFFFFF', accent: '#E70013', name: 'Tunisia', lang: 'ar' },         // red and white only
  UG: { primary: '#000000', secondary: '#FCDC04', accent: '#D90000', name: 'Uganda', lang: 'en' },          // black, yellow #FCDC04, red
  ZM: { primary: '#147F55', secondary: '#F99815', accent: '#D40829', name: 'Zambia', lang: 'en' },          // green #147F55, orange #F99815, red #D40829
  ZW: { primary: '#006400', secondary: '#FFD200', accent: '#D40000', name: 'Zimbabwe', lang: 'en' },        // green, yellow, red
  DEFAULT: { primary: '#1A5C38', secondary: '#FFFFFF', accent: '#FCD116', name: 'Africa', lang: 'en' },
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
  countryClicks: Record<string, number>; // frequency tracking
  applyTheme: (code: string) => void;
  detectFromIP: () => Promise<void>;
  loadThemeOverrides: () => Promise<void>;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      countryCode: '',
      theme: { ...THEMES['DEFAULT'], code: '' },
      detected: false,
      overrides: {},
      countryClicks: {},

      applyTheme: (code: string) => {
        // '' means "All Africa / DEFAULT"
        const effectiveKey = code || 'DEFAULT';
        const base = THEMES[effectiveKey] || THEMES['DEFAULT'];
        const override = get().overrides[effectiveKey] || {};
        const t = { ...base, ...override };
        const theme: CountryTheme = { ...t, code };
        const root = document.documentElement;
        root.style.setProperty('--cp', t.primary);
        root.style.setProperty('--cp-dark', darken(t.primary));
        root.style.setProperty('--cp-light', lighten(t.primary, 220));
        root.style.setProperty('--cs', t.secondary);
        root.style.setProperty('--ca', t.accent);
        root.style.setProperty('--ct', t.text || contrastText(t.primary));
        // Track frequency (only for real country codes, not empty/default)
        const prev = get().countryClicks;
        const countryClicks = code
          ? { ...prev, [code]: (prev[code] || 0) + 1 }
          : prev;
        set({ countryCode: code, theme, detected: true, countryClicks });
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
          const data = await r.json() as { countryCode: string; suggestedLang?: string };
          // Only apply country theme if that country is active; else stay on Africa default
          if (data.countryCode) {
            const active = useCountriesStore.getState().activeCountries;
            if (active.length === 0 || active.includes(data.countryCode)) {
              get().applyTheme(data.countryCode);
            } else {
              // IP country not active — keep persisted/default theme but mark detected
              set({ detected: true });
            }
          }

          // Auto-set language only if the user has never explicitly picked one
          if (!localStorage.getItem('seshaa-lang')) {
            // Admin-configured language overrides the IP-suggested one
            const { countryLanguages } = useCountriesStore.getState();
            const configuredLang = data.countryCode ? countryLanguages[data.countryCode] : undefined;
            const langToApply = configuredLang || data.suggestedLang;
            if (langToApply) {
              const prevGeo = localStorage.getItem('seshaa-lang-geo');
              if (prevGeo !== langToApply) {
                import('../i18n').then(({ default: i18n, LANGUAGES }) => {
                  i18n.changeLanguage(langToApply);
                  const dir = LANGUAGES.find(l => l.code === langToApply)?.dir || 'ltr';
                  document.documentElement.dir = dir;
                }).catch(() => {});
              }
              localStorage.setItem('seshaa-lang-geo', langToApply);
            }
          }
        } catch {
          get().applyTheme(''); // fallback → Africa/global, never a specific country
        }
      },
    }),
    {
      name: 'seshaa-theme-v4', // v4: persist countryCode so selected country survives refresh
      partialize: (s) => ({ countryClicks: s.countryClicks, countryCode: s.countryCode }),
    }
  )
);

export const getThemeForCode = (code: string): CountryTheme => ({
  ...(THEMES[code] || THEMES['DEFAULT']),
  code,
});
