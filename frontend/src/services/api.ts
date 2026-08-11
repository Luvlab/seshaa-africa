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

// Auto-logout on 401 "Invalid token" — clears stale JWT and redirects to auth
api.interceptors.response.use(
  res => res,
  err => {
    const status = err?.response?.status;
    const msg = (err?.response?.data?.error as string | undefined)?.toLowerCase();
    // Only fire on the exact "Invalid token" message from the JWT middleware
    // (not "Invalid credentials" from login, "Invalid Google token", etc.)
    if (status === 401 && msg === 'invalid token') {
      try {
        const stored = localStorage.getItem('seshaa-auth');
        const token: string | null = stored ? (JSON.parse(stored)?.state?.token ?? null) : null;
        if (token && !window.location.pathname.startsWith('/auth')) {
          localStorage.removeItem('seshaa-auth');
          window.dispatchEvent(new CustomEvent('seshaa:auth:expired'));
        }
      } catch { /* ignore parse errors */ }
    }
    return Promise.reject(err);
  }
);

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
    localHour?: number; lifestyle?: string;
  }) => api.get<Ad[]>('/ads', { params }),
  click: (id: string) => api.post(`/ads/${id}/click`),
  create: (data: Partial<Ad> & { salesRepId?: string; packageId?: string; targetKeywords?: string[]; targetInterests?: string[]; countries?: string[]; dayparts?: string[]; lifestyleTargets?: string[] }) =>
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
  register: (data: { name: string; email?: string; phone?: string; password: string; language: string; country?: string; instagram?: string; snapchat?: string; tiktok?: string; facebook?: string }) =>
    api.post('/auth/register', data),
  login: (identifier: string, password: string) => api.post('/auth/login', { identifier, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  googleLogin: (idToken: string) => api.post('/auth/google', { idToken }),
  adminSetPassword: (userId: string, newPassword: string) =>
    api.post('/auth/admin/set-password', { userId, newPassword }),
};

// Sales Reps
export const salesRepApi = {
  dashboard: () => api.get('/salesreps/dashboard'),
  leaderboard: () => api.get('/salesreps/leaderboard'),
  apply: (data: { name: string; phone: string; country: string; city?: string; why?: string }) =>
    api.post('/salesreps/apply', data),
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

// Merch / POD
export const merchApi = {
  providers: () => api.get<Array<{ id: string; name: string; connected: boolean; eco?: string }>>('/merch/providers'),
  products: (provider: string, limit = 24) => api.get<{ provider: string; products: Array<{ id: string; name: string; description?: string; imageUrl?: string; provider: string; priceFrom?: number; currency?: string }>; fallback: boolean }>('/merch/products', { params: { provider, limit } }),
  services: () => api.get<{ services: Array<{ name: string; website: string; region: string; eco?: string; description?: string }> }>('/merch/services'),
};

// Market — business products
export const marketApi = {
  products: (params?: { country?: string; category?: string; limit?: number; offset?: number }) =>
    api.get<any>('/market/products', { params }),
  productsByListing: (listingId: string) =>
    api.get<any>(`/market/products/${listingId}`),
  myProducts: () =>
    api.get<any>('/market/my-products'),
  createProduct: (data: { listingId: string; name: string; description?: string; imageUrl?: string; price?: number; currency?: string; contactUrl?: string }) =>
    api.post<any>('/market/products', data),
  updateProduct: (id: string, data: Partial<{ name: string; description: string; imageUrl: string; price: number; currency: string; inStock: boolean; contactUrl: string; active: boolean }>) =>
    api.patch<any>(`/market/products/${id}`, data),
  deleteProduct: (id: string) =>
    api.delete(`/market/products/${id}`),
};

// Admin
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  financials: () => api.get('/admin/financials'),
  listings: (params?: { status?: string; page?: number }) => api.get('/admin/listings', { params }),
  verifyListing: (id: string) => api.post(`/admin/listings/${id}/verify`),
  rejectListing: (id: string) => api.post(`/admin/listings/${id}/reject`),
  updateListing: (id: string, data: Record<string, unknown>) => api.patch(`/admin/listings/${id}`, data),
  users: (params?: { q?: string; page?: number }) => api.get('/admin/users', { params }),
  payCommissions: (salesRepId: string) => api.post('/admin/commissions/pay', { salesRepId }),
  pendingPayouts: () => api.get('/admin/ambassador-payouts'),
  approvePayout: (id: string) => api.post(`/admin/ambassador-payouts/approve/${id}`),
  loanApplications: (status?: string) => api.get('/bank/applications', { params: { status } }),
  updateLoan: (id: string, data: { status: string; approvedAmount?: number; notes?: string }) =>
    api.patch(`/bank/${id}`, data),
  getHero: () => api.get('/admin/hero'),
  setHero: (data: object) => api.post('/admin/hero', data),
  // Hero slideshow management
  getHeroSlides: () => api.get('/admin/hero-slides'),
  getPublicHeroSlides: (country?: string) => api.get(`/admin/public/hero-slides${country ? `?country=${encodeURIComponent(country)}` : ''}`),
  getSeoSettings: () => api.get('/admin/seo-settings'),
  saveSeoSettings: (data: {
    title?: string; description?: string; thumbnailUrl?: string; url?: string;
    keywords?: string; twitterCard?: string; twitterHandle?: string;
    author?: string; robots?: string; jsonLd?: string;
  }) => api.post('/admin/seo-settings', data),
  getPublicSeoSettings: () => api.get('/admin/public/seo-settings'),
  getThemeSettings: () => api.get('/admin/theme-settings'),
  saveThemeSettings: (data: { overrides: Record<string, { primary?: string; secondary?: string; accent?: string; text?: string }> }) => api.post('/admin/theme-settings', data),
  getPublicThemeSettings: () => api.get('/admin/public/theme-settings'),
  getPublicStats: () => api.get<{ listings: number; users: number; countries: number; classifieds: number }>('/admin/public/stats'),
  getYoutubeMeta: (url: string) => api.get<{ videoId: string; title: string; author: string; thumbnail: string; embedUrl: string }>(`/admin/youtube-meta?url=${encodeURIComponent(url)}`),
  createHeroSlide: (data: object) => api.post('/admin/hero-slides', data),
  updateHeroSlide: (id: string, data: object) => api.put(`/admin/hero-slides/${id}`, data),
  deleteHeroSlide: (id: string) => api.delete(`/admin/hero-slides/${id}`),
  toggleHeroSlide: (id: string) => api.patch(`/admin/hero-slides/${id}/toggle`),
  scrapeCounts: () => api.get<{ counts: { city: string; country: string; count: number }[]; total: number }>('/admin/scrape/counts'),
  scrapeCity: (city: string, country: string) => api.post<{ ok: boolean; city: string; country: string; inserted: number }>('/admin/scrape', { city, country }),
  scrapeAll: () => api.post<{ ok: boolean; message: string; cities: number }>('/admin/scrape/all'),
  scrapeEnrich: () => api.post<{ ok: boolean; enriched: number }>('/admin/scrape/enrich'),
  blackOwnedCities: () => api.get<{ cities: number; byRegion: Record<string, number>; yelpKeyConfigured: boolean }>('/admin/scrape/blackowned/cities'),
  scrapeBlackOwned: (opts: { source?: string; region?: string; dryRun?: boolean }) => api.post<{ ok: boolean; message: string }>('/admin/scrape/blackowned', opts),
  getSalesReps: () => api.get('/admin/salesreps'),
  approveSalesRep: (id: string) => api.post(`/admin/salesreps/${id}/approve`),
  rejectSalesRep: (id: string) => api.delete(`/admin/salesreps/${id}`),
  getAiSettings: () => api.get('/admin/ai-settings'),
  saveAiSettings: (data: { openRouterApiKey?: string; openRouterModel?: string }) => api.post('/admin/ai-settings', data),
  getPodSettings: () => api.get('/admin/pod-settings'),
  savePodSettings: (data: { printifyApiKey?: string; printfulApiKey?: string }) => api.post('/admin/pod-settings', data),
  scrapePodServices: () => api.post('/admin/pod-services/scrape'),
  userAnalytics: () => api.get('/admin/user-analytics'),
  getCountrySettings: () => api.get<{ activeCountries: string[]; countryLanguages: Record<string, string>; defaultCountry: string }>('/admin/country-settings'),
  saveCountrySettings: (data: { activeCountries: string[]; countryLanguages: Record<string, string>; defaultCountry: string }) => api.post('/admin/country-settings', data),
  getNavSettings: () => api.get<{ visibleNavItems: string[]; allNavItems: string[] }>('/admin/nav-settings'),
  saveNavSettings: (data: { visibleNavItems: string[] }) => api.post('/admin/nav-settings', data),
};

// Community Translations
export const translationApi = {
  forLang: (lang: string) => api.get(`/translations/${lang}`),
  full: (lang: string) => api.get(`/translations/${lang}/full`),
  stats: () => api.get('/translations/stats/all'),
  suggest: (lang: string, key: string, value: string) =>
    api.post('/translations/suggest', { lang, key, value }),
  vote: (id: string) => api.post(`/translations/${id}/vote`),
  unvote: (id: string) => api.delete(`/translations/${id}/vote`),
};

// Events
export const eventsApi = {
  list:      (p?: object) => api.get('/events', { params: p }),
  get:       (id: string) => api.get(`/events/${id}`),
  create:    (d: object)  => api.post('/events', d),
  update:    (id: string, d: object) => api.put(`/events/${id}`, d),
  remove:    (id: string) => api.delete(`/events/${id}`),
  attend:    (id: string) => api.post(`/events/${id}/attend`),
  attendees: (id: string) => api.get(`/events/${id}/attendees`),
  feature:   (id: string) => api.post(`/events/${id}/feature`),
  // Scraped / discovered events from external sources
  discover:  (p?: { country?: string; category?: string; q?: string; limit?: number; refresh?: string }) =>
    api.get<{ total: number; events: DiscoveredEvent[] }>('/events/discover', { params: p }),
};

export interface DiscoveredEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  venue?: string;
  city: string;
  country: string;
  imageUrl?: string;
  sourceUrl: string;
  sourceName: string;
  category?: string;
  isFree: boolean;
  price?: string;
  ticketUrl?: string;
}

// Business Promotions
export const promotionsApi = {
  list:   (p?: object) => api.get('/promotions', { params: p }),
  get:    (id: string) => api.get(`/promotions/${id}`),
  create: (d: object)  => api.post('/promotions', d),
  update: (id: string, d: object) => api.put(`/promotions/${id}`, d),
  remove: (id: string) => api.delete(`/promotions/${id}`),
};

// Seshaa Radio
export interface LiveStation {
  id: string; name: string; country: string; countryName: string;
  streamUrl: string; favicon?: string; tags: string; codec: string;
  bitrate: number; language?: string; homepage?: string; votes?: number;
}
export interface ArchiveTrack {
  id: string; name: string; artist: string; album?: string;
  image: string; audio: string; audioDownload?: string; duration?: number;
  year?: number; shareUrl: string; source: 'archive'; tags?: string[]; subjects?: string[];
}

export const radioApi = {
  tags:        () => api.get<{ id: string; label: string; emoji: string }[]>('/radio/tags'),
  tracks:      (tag: string, limit = 50) => api.get<{ id: string; name: string; artist: string; album: string; image: string; audio: string; audioDownload: string; duration: number; tags: string[]; shareUrl: string; source: string; year?: number }[]>('/radio/tracks', { params: { tag, limit } }),
  stations:    () => api.get<LiveStation[]>('/radio/stations'),
  archive:     (params?: { genre?: string; year_from?: number; year_to?: number; page?: number; limit?: number }) =>
    api.get<{ total: number; tracks: ArchiveTrack[] }>('/radio/archive', { params }),
  community:   (params?: { genre?: string; country?: string; limit?: number; page?: number }) => api.get('/radio/community', { params }),
  submit:      (data: { title: string; artist: string; audioUrl: string; imageUrl?: string; country?: string; genre?: string; album?: string; duration?: number; ownerRights: boolean }) => api.post('/radio/submit', data),
  recordPlay:  (id: string) => api.post(`/radio/${id}/play`),
  featured:    () => api.get<{ id: string; title: string; artist: string; audioUrl: string; imageUrl?: string; country?: string; genre?: string }[]>('/radio/featured'),
  featureRequest: (trackId: string, data: { weeks: number; paymentRef?: string }) => api.post(`/radio/${trackId}/feature-request`, data),
  adminFeatureRequests: () => api.get('/radio/admin/feature-requests'),
  adminUpdateFeatureRequest: (id: string, status: string, adminNote?: string) => api.patch(`/radio/admin/feature-requests/${id}`, { status, adminNote }),
  adminPendingTracks: () => api.get('/radio/admin/pending'),
  adminApproveTrack: (id: string) => api.patch(`/radio/admin/${id}/approve`),
  adminDeleteTrack:  (id: string) => api.delete(`/radio/admin/${id}`),
};

// Messages / Chat channels
export const messagesApi = {
  list:     (channelId: string, after?: string, limit = 50) =>
    api.get<unknown[]>(`/messages/${channelId}`, { params: { after, limit } }),
  send:     (channelId: string, content: string, messageType = 'text', metadata?: unknown) =>
    api.post(`/messages/${channelId}`, { content, messageType, metadata }),
  read:     (channelId: string) => api.post(`/messages/${channelId}/read`),
  dmStart:  (recipientId: string) =>
    api.post<{ channelId: string }>('/messages/dm/start', { recipientId }),
  channels: () => api.get<{
    fixed: { channelId: string; channelType: string; label: string }[];
    dms:   { channelId: string; lastMsg: string; lastAt: string; unread: number }[];
  }>('/messages/channels/list'),
};

// Rides / Delivery / Transport
export const ridesApi = {
  // Driver
  registerDriver: (data: {
    vehicleType: string; services: string[]; plateNumber?: string; licenseNo?: string;
    city: string; country: string; bio?: string; photoUrl?: string;
  }) => api.post('/rides/driver/register', data),
  myDriver:           () => api.get('/rides/driver/me'),
  setAvailability:    (available: boolean) => api.patch('/rides/driver/availability', { available }),
  drivers:            (params?: { type?: string; city?: string; country?: string }) =>
    api.get<unknown[]>('/rides/drivers', { params }),
  // Requests
  create: (data: {
    type?: string; pickupAddress: string; dropoffAddress?: string;
    pickupLat?: number; pickupLng?: number; dropoffLat?: number; dropoffLng?: number;
    notes?: string; packageDesc?: string; weight?: number; currency?: string;
    country?: string; city?: string; scheduledAt?: string;
  }) => api.post('/rides', data),
  myRides:   (type?: string) => api.get<unknown[]>('/rides/my', { params: { type } }),
  available: (params?: { type?: string; city?: string; country?: string }) =>
    api.get<unknown[]>('/rides/available', { params }),
  accept:    (id: string) => api.post(`/rides/${id}/accept`),
  setStatus: (id: string, status: string, finalPrice?: number) =>
    api.patch(`/rides/${id}/status`, { status, finalPrice }),
  get:       (id: string) => api.get(`/rides/${id}`),
  // Admin
  adminAll:         (params?: { type?: string; status?: string; page?: number }) =>
    api.get('/rides/admin/all', { params }),
  adminDrivers:     () => api.get('/rides/admin/drivers'),
  verifyDriver:     (id: string) => api.patch(`/rides/admin/drivers/${id}/verify`),
};

// Obituaries
export interface ObitItem {
  id: string; title: string; excerpt: string; link: string;
  source: string; country: string; priority: number; date: string; image?: string;
}
export const obituariesApi = {
  list: () => api.get<ObitItem[]>('/obituaries'),
  submit: (data: { name: string; area?: string; tribe?: string; profession?: string; description: string; submittedBy?: string }) =>
    api.post('/obituaries/submit', data),
};

// Analytics / Behaviour tracking
export const analyticsApi = {
  event: (eventType: string, fields?: Record<string, unknown>) =>
    api.post('/analytics/event', { eventType, ...fields }),
  batch: (events: { eventType: string; path?: string; target?: string; value?: string; metadata?: unknown; sessionId?: string; device?: string }[]) =>
    api.post('/analytics/batch', { events }),
  admin:    () => api.get('/analytics/admin'),
  sessions: () => api.get('/analytics/admin/sessions'),
  prognosis: () => api.get<{
    daily:    { day: string; count: string }[];
    forecast: { day: number; predicted: number }[];
    trend:    'growing' | 'declining' | 'stable';
    slope:    number;
  }>('/analytics/admin/prognosis'),
};

export const contactApi = {
  list: () => api.get<{ id: string; createdAt: string; name?: string; email?: string; phone?: string; subject?: string; message?: string }[]>('/contact/admin'),
};

export const feedbackApi = {
  list: (params?: { type?: string; status?: string }) =>
    api.get('/feedback', { params }),
  create: (data: { type: string; title: string; description?: string; priority?: string }) =>
    api.post('/feedback', data),
  upvote: (id: string) =>
    api.post(`/feedback/${id}/upvote`),
  update: (id: string, data: { status?: string; adminReply?: string; priority?: string }) =>
    api.patch(`/feedback/${id}`, data),
  delete: (id: string) =>
    api.delete(`/feedback/${id}`),
};

export type HireProfile = {
  id: string;
  userId: string;
  profession: string;
  bio?: string;
  hourlyRate?: number;
  dayRate?: number;
  currency: string;
  available: boolean;
  country: string;
  city?: string;
  skills: string[];
  photos: string[];
  avgRating: number;
  ratingCount: number;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string; country?: string; instagram?: string; tiktok?: string };
};

export type HireBooking = {
  id: string;
  profileId: string;
  clientId: string;
  date?: string;
  duration?: number;
  message: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED';
  totalPrice?: number;
  createdAt: string;
};

export const hireApi = {
  list: (params?: { profession?: string; country?: string; city?: string; search?: string }) =>
    api.get<HireProfile[]>('/hire', { params }),
  professions: () => api.get<string[]>('/hire/professions'),
  me: () => api.get<HireProfile | null>('/hire/me'),
  saveProfile: (data: Partial<HireProfile> & { profession: string }) =>
    api.post<HireProfile>('/hire/profile', data),
  get: (id: string) => api.get<HireProfile>(`/hire/${id}`),
  book: (id: string, data: { date?: string; duration?: number; message: string; totalPrice?: number }) =>
    api.post<HireBooking>(`/hire/${id}/book`, data),
  sentBookings: () => api.get<(HireBooking & { profile: HireProfile })[]>('/hire/bookings/sent'),
  receivedBookings: () => api.get<(HireBooking & { client: { id: string; name: string; avatarUrl?: string; phone?: string; email?: string } })[]>('/hire/bookings/received'),
  updateBooking: (id: string, status: string) => api.patch<HireBooking>(`/hire/bookings/${id}`, { status }),
};

export default api;
