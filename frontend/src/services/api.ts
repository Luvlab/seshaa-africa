import axios from 'axios';
import type { SearchFilters, SearchResult, Listing, Ad, AISearchResult } from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const stored = localStorage.getItem('seshaa-auth');
  if (stored) {
    const { state } = JSON.parse(stored);
    if (state?.token) cfg.headers.Authorization = `Bearer ${state.token}`;
  }
  return cfg;
});

// Listings
export const listingsApi = {
  search: (filters: SearchFilters) => api.get<SearchResult>('/listings', { params: filters }),
  get: (id: string) => api.get<Listing>(`/listings/${id}`),
  create: (data: Partial<Listing> & { tags?: string[] }) => api.post<Listing>('/listings', data),
  update: (id: string, data: Partial<Listing>) => api.put<Listing>(`/listings/${id}`, data),
  remove: (id: string) => api.delete(`/listings/${id}`),
  countries: () => api.get<string[]>('/listings/meta/countries'),
  categories: () => api.get<string[]>('/listings/meta/categories'),
};

// Ads
export const adsApi = {
  getContextual: (params: { country?: string; city?: string; category?: string; tier?: string }) =>
    api.get<Ad[]>('/ads', { params }),
  click: (id: string) => api.post(`/ads/${id}/click`),
  create: (data: Partial<Ad> & { salesRepId?: string }) => api.post<Ad>('/ads', data),
  myAds: () => api.get<Ad[]>('/ads/my'),
};

// Auth
export const authApi = {
  register: (data: { name: string; email?: string; phone?: string; password: string; language: string; country?: string }) =>
    api.post('/auth/register', data),
  login: (identifier: string, password: string) => api.post('/auth/login', { identifier, password }),
  applySalesRep: (userId: string, territory: string, country: string) =>
    api.post('/auth/sales-rep/apply', { userId, territory, country }),
};

// Sales Reps
export const salesRepApi = {
  dashboard: () => api.get('/salesreps/dashboard'),
  leaderboard: () => api.get('/salesreps/leaderboard'),
};

// AI Search — calls Claude API via backend proxy
export const aiSearchApi = {
  query: (query: string, context: { country?: string; language?: string }) =>
    api.post<AISearchResult>('/ai/search', { query, ...context }),
  chat: (messages: { role: string; content: string }[], context?: Record<string, unknown>) =>
    api.post('/ai/chat', { messages, context }),
};

export default api;
