export type UserRole = 'USER' | 'BUSINESS_OWNER' | 'SALES_REP' | 'ADMIN';
export type ListingType = 'PERSONAL' | 'BUSINESS' | 'GOVERNMENT' | 'NGO';
export type AdTier = 'BANNER' | 'FEATURED' | 'SPONSORED' | 'PREMIUM';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  language: string;
  country?: string;
  avatarUrl?: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  createdAt: string;
}

export interface Listing {
  id: string;
  type: ListingType;
  name: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  city: string;
  country: string;
  region?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  subcategory?: string;
  description?: string;
  website?: string;
  whatsapp?: string;
  verified: boolean;
  active: boolean;
  viewCount: number;
  submittedById?: string;
  tags: Tag[];
  ads?: Ad[];
  createdAt: string;
  updatedAt: string;
  isPro?: boolean;
  logoUrl?: string;
  photos?: string[];
  openingHours?: Record<string, string>;
  socialLinks?: Record<string, string>;
}

export interface Tag {
  id: string;
  name: string;
  listingId: string;
}

export interface Ad {
  id: string;
  title: string;
  imageUrl?: string;
  targetUrl: string;
  advertiser: string;
  contactPhone?: string;
  tier: AdTier;
  country?: string;
  city?: string;
  category?: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  active: boolean;
  listingId?: string;
  salesRepId?: string;
  createdAt: string;
}

export interface SalesRep {
  id: string;
  userId: string;
  territory: string;
  country: string;
  commissionRate: number;
  totalEarned: number;
  active: boolean;
  user: Pick<User, 'id' | 'name' | 'country'>;
}

export interface Commission {
  id: string;
  salesRepId: string;
  adId: string;
  amount: number;
  rate: number;
  paid: boolean;
  paidAt?: string;
  ad: Ad;
  createdAt: string;
}

// Chat / Social
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'listing' | 'address' | 'event' | 'image';
  metadata?: ListingShare | AddressShare | EventShare;
  timestamp: string;
  readBy: string[];
}

export interface ListingShare {
  listingId: string;
  listingName: string;
  listingType: ListingType;
  city: string;
  phone?: string;
}

export interface AddressShare {
  name: string;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
}

export interface EventShare {
  title: string;
  date: string;
  location: string;
  description?: string;
  listingId?: string;
}

export interface ChatRoom {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  location: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  listingId?: string;
  organizerId: string;
  isPublic: boolean;
  attendees: string[];
  imageUrl?: string;
  category?: string;
  createdAt: string;
}

// Search
export interface SearchFilters {
  q?: string;
  city?: string;
  country?: string;
  category?: string;
  type?: ListingType;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  listings: Listing[];
  total: number;
  page: number;
  pages: number;
}

export interface AISearchResult {
  query: string;
  interpretation: string;
  listings: Listing[];
  suggestions: string[];
}

// Portal tiers
export type PortalType = 'consumer' | 'business' | 'advertiser' | 'salesrep' | 'admin';

export interface ProFeatures {
  featuredPlacement: boolean;
  photoGallery: boolean;
  openingHours: boolean;
  analyticsAccess: boolean;
  prioritySupport: boolean;
  verifiedBadge: boolean;
  multipleLocations: boolean;
}
