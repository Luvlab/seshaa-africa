/**
 * useSeoStore — global SEO / social-sharing config
 *
 * Loaded once from /api/admin/public/seo-settings on app mount.
 * Used by <SeoHead> to fill fallback values whenever a page doesn't
 * provide its own title / description / image.
 */
import { create } from 'zustand';

export interface SeoConfig {
  title:        string;
  description:  string;
  thumbnailUrl: string;
  url:          string;
  keywords:     string;
  twitterCard:  'summary' | 'summary_large_image';
  twitterHandle:string;
  author:       string;
  robots:       string;
  jsonLd:       string;   // raw JSON-LD string
}

export const SEO_DEFAULTS: SeoConfig = {
  title:         'Seshaa — Africa\'s Directory. Seshaa and you will find.',
  description:   'Find any business, person or service across all 54 African countries. Real phone numbers, addresses, reviews & bookings. Available in 14 African languages.',
  thumbnailUrl:  'https://seshaa.africa/og-image.svg',
  url:           'https://seshaa.africa',
  keywords:      'Africa directory, business directory Africa, phone numbers Africa, seshaa, listings Africa, find businesses Africa',
  twitterCard:   'summary_large_image',
  twitterHandle: '@SeshaaAfrica',
  author:        'Seshaa Africa',
  robots:        'index,follow',
  jsonLd: JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Seshaa Africa',
    url: 'https://seshaa.africa',
    description: 'Africa\'s business directory — all 54 countries, 14 languages',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://seshaa.africa/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }, null, 2),
};

interface SeoState {
  config: SeoConfig;
  loaded: boolean;
  load: () => Promise<void>;
  set: (partial: Partial<SeoConfig>) => void;
}

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useSeoStore = create<SeoState>((set, get) => ({
  config: { ...SEO_DEFAULTS },
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const r = await fetch(`${BASE}/admin/public/seo-settings`);
      if (!r.ok) throw new Error('seo fetch failed');
      const data = (await r.json()) as Partial<SeoConfig>;
      set({
        config: { ...SEO_DEFAULTS, ...data },
        loaded: true,
      });
    } catch {
      set({ loaded: true }); // use defaults if API unreachable
    }
  },

  set: (partial) => set(s => ({ config: { ...s.config, ...partial } })),
}));
