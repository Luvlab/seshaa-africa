import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { interestsApi } from '../services/api';

function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface InterestsState {
  sessionId: string;
  surveyDone: boolean;
  categories: string[];
  keywords: string[];
  country: string;
  city: string;
  useType: string;
  setSurveyDone: (v: boolean) => void;
  setSurvey: (data: { categories: string[]; useType: string; country?: string; city?: string }) => Promise<void>;
  trackKeyword: (keyword: string, category?: string) => void;
  setLocation: (country: string, city?: string) => void;
}

export const useInterestsStore = create<InterestsState>()(
  persist(
    (set, get) => ({
      sessionId: generateSessionId(),
      surveyDone: false,
      categories: [],
      keywords: [],
      country: '',
      city: '',
      useType: '',

      setSurveyDone: (v) => set({ surveyDone: v }),

      setSurvey: async ({ categories, useType, country, city }) => {
        const { sessionId } = get();
        set({ categories, useType, country: country || get().country, city: city || get().city, surveyDone: true });
        await interestsApi.survey(sessionId, categories, useType, country, city).catch(() => {});
      },

      trackKeyword: (keyword, category) => {
        const { sessionId, keywords, categories } = get();
        const updatedKeywords = [...new Set([keyword, ...keywords])].slice(0, 20);
        const updatedCats = category ? [...new Set([category, ...categories])].slice(0, 10) : categories;
        set({ keywords: updatedKeywords, categories: updatedCats });
        interestsApi.track(sessionId, keyword, category).catch(() => {});
      },

      setLocation: (country, city) => {
        set({ country, city: city || get().city });
      },
    }),
    {
      name: 'seshaa-interests',
      partialize: (s) => ({
        sessionId: s.sessionId,
        surveyDone: s.surveyDone,
        categories: s.categories,
        keywords: s.keywords,
        country: s.country,
        city: s.city,
        useType: s.useType,
      }),
    }
  )
);
