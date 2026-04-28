import axios from 'axios';
import type { SearchFilters, SearchResult, Listing, Ad, AISearchResult, Review, Booking, Classified, PriceEntry } from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const stored = localStorage.getItem('seshaa-auth');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.token) cfg.headers.Authorization = `Bearer ${state.token}`;
    } catch {}
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
  getContextual: (params: {
    country?: string; city?: string; category?: string; tier?: string;
    sessionId?: string; interests?: string; keywords?: string;
  }) => api.get<Ad[]>('/ads', { params }),
  click: (id: string) => api.post(`/ads/${id}/click`),
  create: (data: Partial<Ad> & { salesRepId?: string; packageId?: string; targetKeywords?: string[]; targetInterests?: string[]; countries?: string[] }) =>
    api.post<Ad>('/ads', data),
  myAds: () => api.get<Ad[]>('/ads/my'),
  myStats: () => api.get('/ads/my/stats'),
  packages: () => api.get('/ads/packages'),
  update: (id: string, data: { active?: boolean; title?: string; description?: string }) =>
    api.patch(`/ads/${id}`, data),
};

// Interests
export const interestsApi = {
  track: (sessionId: string, keyword?: string, category?: string, country?: string, city?: string) =>
    api.post('/interests/track', { sessionId, keyword, category, country, city }),
  survey: (sessionId: string, categories: string[], useType: string, country?: string, city?: string) =>
    api.post('/interests/survey', { sessionId, categories, useType, country, city }),
  my: (sessionId: string) => api.get('/interests/my', { params: { sessionId } }),
  link: (sessionId: string) => api.patch('/interests/link', { sessionId }),
};

// Classifieds
export const classifiedsApi = {
  list: (params?: { q?: string; category?: string; city?: string; country?: string; minPrice?: number; maxPrice?: number; condition?: string; page?: number }) =>
    api.get<{ items: Classified[]; total: number; page: number; pages: number }>('/classifieds', { params }),
  get: (id: string) => api.get<Classified>(`/classifieds/${id}`),
  my: () => api.get<Classified[]>('/classifieds/my'),
  categories: () => api.get<string[]>('/classifieds/categories'),
  create: (data: Partial<Classified>) => api.post<Classified>('/classifieds', data),
  update: (id: string, data: Partial<Classified> & { status?: string }) => api.patch<Classified>(`/classifieds/${id}`, data),
  remove: (id: string) => api.delete(`/classifieds/${id}`),
};

// Price Comparison
export const pricesApi = {
  compare: (params: { item?: string; category?: string; city?: string; country?: string }) =>
    api.get<{ entries: PriceEntry[]; grouped: Record<string, PriceEntry[]>; total: number }>('/prices', { params }),
  forListing: (listingId: string) => api.get<PriceEntry[]>(`/prices/listing/${listingId}`),
  trending: (params?: { country?: string; city?: string }) =>
    api.get<{ item: string; category: string; _count: { item: number } }[]>('/prices/trending', { params }),
  add: (data: { listingId: string; item: string; price: number; unit?: string; currency?: string; category: string }) =>
    api.post<PriceEntry>('/prices', data),
  bulkAdd: (listingId: string, entries: { item: string; price: number; unit?: string; currency?: string; category: string }[]) =>
    api.post('/prices/bulk', { listingId, entries }),
  remove: (id: string) => api.delete(`/prices/${id}`),
};

// Auth
export const authApi = {
  register: (data: { name: string; email?: string; phone?: string; password: string; language: string; country?: string }) =>
    api.post('/auth/register', data),
  login: (identifier: string, password: string) => api.post('/auth/login', { identifier, password }),
};

// Sales Reps
export const salesRepApi = {
  dashboard: () => api.get('/salesreps/dashboard'),
  leaderboard: () => api.get('/salesreps/leaderboard'),
};

// Ambassador
export const ambassadorApi = {
  apply: (country: string, city?: string) => api.post('/ambassador/apply', { country, city }),
  dashboard: () => api.get('/ambassador/dashboard'),
  addListing: (data: Partial<Listing>) => api.post('/ambassador/listings', data),
  proPlans: () => api.get('/ambassador/pro-plans'),
  leaderboard: () => api.get('/ambassador/leaderboard'),
  requestPayout: (method: string) => api.post('/ambassador/payout-request', { method }),
};

// Payments
export const paymentsApi = {
  methods: (countryCode: string) => api.get(`/payments/methods/${countryCode}`),
  stripeCheckout: (listingId: string, plan: string, successUrl: string) =>
    api.post('/payments/stripe/checkout', { listingId, plan, successUrl, cancelUrl: window.location.href }),
  flutterwaveInitiate: (data: { listingId: string; plan: string; phone: string; countryCode: string }) =>
    api.post('/payments/flutterwave/initiate', data),
  cryptoAddress: (listingId: string, plan: string, coin?: string) =>
    api.get('/payments/crypto/address', { params: { listingId, plan, coin } }),
};

// Reviews
export const reviewsApi = {
  forListing: (listingId: string) => api.get<Review[]>(`/reviews/${listingId}`),
  submit: (listingId: string, rating: number, comment?: string) =>
    api.post<Review>('/reviews', { listingId, rating, comment }),
  markHelpful: (id: string) => api.post(`/reviews/${id}/helpful`),
  replyOwner: (id: string, reply: string) => api.post(`/reviews/${id}/reply`, { reply }),
};

// Bookings
export const bookingsApi = {
  my: () => api.get<Booking[]>('/bookings/my'),
  forListing: (listingId: string) => api.get<Booking[]>(`/bookings/listing/${listingId}`),
  create: (data: {
    listingId: string; service: string; date: string;
    duration?: number; notes?: string; guestCount?: number;
    contactName?: string; contactPhone?: string;
  }) => api.post<Booking>('/bookings', data),
  updateStatus: (id: string, status: string) => api.patch(`/bookings/${id}`, { status }),
  categories: () => api.get<string[]>('/bookings/categories'),
};

// Geo / Theme
export const geoApi = {
  detect: () => api.get<{ countryCode: string; countryName: string; colors: Record<string, string> }>('/geo/detect'),
};

// Certifications & Awards
export const certApi = {
  verify: (code: string) => api.get(`/certifications/verify/${code}`),
  forListing: (listingId: string) => api.get(`/certifications/listing/${listingId}`),
  checkEligibility: (listingId: string) => api.post(`/certifications/check-eligibility/${listingId}`),
  awards: (params?: { country?: string; year?: number; category?: string }) =>
    api.get('/certifications/awards', { params }),
};

// Seshaa Bank
export const bankApi = {
  stats: () => api.get('/bank/stats'),
  my: () => api.get('/bank/my'),
  apply: (data: { amount: number; purpose: string; listingId?: string; repaymentMethod?: string }) =>
    api.post('/bank/apply', data),
};

// AI Search
export const aiSearchApi = {
  query: (query: string, context: { country?: string; language?: string }) =>
    api.post<AISearchResult>('/ai/search', { query, ...context }),
  chat: (messages: { role: string; content: string }[], context?: Record<string, unknown>) =>
    api.post('/ai/chat', { messages, context }),
};

// Admin
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  financials: () => api.get('/admin/financials'),
  listings: (params?: { status?: string; page?: number }) => api.get('/admin/listings', { params }),
  verifyListing: (id: string) => api.post(`/admin/listings/${id}/verify`),
  rejectListing: (id: string) => api.post(`/admin/listings/${id}/reject`),
  users: (params?: { q?: string; page?: number }) => api.get('/admin/users', { params }),
  payCommissions: (salesRepId: string) => api.post('/admin/commissions/pay', { salesRepId }),
  pendingPayouts: () => api.get('/admin/ambassador-payouts'),
  approvePayout: (id: string) => api.post(`/admin/ambassador-payouts/approve/${id}`),
  loanApplications: (status?: string) => api.get('/bank/applications', { params: { status } }),
  updateLoan: (id: string, data: { status: string; approvedAmount?: number; notes?: string }) =>
    api.patch(`/bank/${id}`, data),
};

export default api;
