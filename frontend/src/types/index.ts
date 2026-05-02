export type UserRole = 'USER' | 'BUSINESS_OWNER' | 'SALES_REP' | 'AMBASSADOR' | 'ADMIN';
export type ListingType = 'PERSONAL' | 'BUSINESS' | 'GOVERNMENT' | 'NGO';
export type AdTier = 'BANNER' | 'FEATURED' | 'SPONSORED' | 'PREMIUM';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type LoanStatus = 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REPAID' | 'DEFAULTED' | 'REJECTED';
export type CertLevel = 'STANDARD' | 'GOLD' | 'PLATINUM';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  language: string;
  country?: string;
  avatarUrl?: string;
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
  createdAt: string;
  updatedAt: string;
  isPro?: boolean;
  bookable?: boolean;
  logoUrl?: string;
  photos?: string[];
  openingHours?: string;
  avgRating: number;
  reviewCount: number;
  certification?: SeshaaCertification;
  awards?: SeshaaAward[];
  reviews?: Review[];
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

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment?: string;
  helpfulCount: number;
  ownerReply?: string;
  createdAt: string;
  user: Pick<User, 'id' | 'name'>;
}

export interface Booking {
  id: string;
  listingId: string;
  userId: string;
  service: string;
  date: string;
  duration?: number;
  notes?: string;
  status: BookingStatus;
  totalPrice?: number;
  guestCount: number;
  contactName?: string;
  contactPhone?: string;
  createdAt: string;
  listing?: Pick<Listing, 'id' | 'name' | 'address' | 'city' | 'country' | 'phone' | 'logoUrl'>;
}

export interface SeshaaCertification {
  id: string;
  listingId: string;
  level: CertLevel;
  awardedAt: string;
  validUntil?: string;
}

export interface SeshaaAward {
  id: string;
  listingId: string;
  category: string;
  city?: string;
  country: string;
  year: number;
  rank: number;
}

export interface MicroLoan {
  id: string;
  userId: string;
  listingId?: string;
  amount: number;
  purpose: string;
  status: LoanStatus;
  approvedAmount?: number;
  repaymentMethod?: string;
  dueDate?: string;
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
  location: string;
  city: string;
  country: string;
  listingId?: string;
  organizerId: string;
  isPublic: boolean;
  attendees: string[];
  imageUrl?: string;
  category?: string;
  createdAt: string;
}

export interface SearchFilters {
  q?: string;
  city?: string;
  country?: string;
  category?: string;
  type?: ListingType;
  page?: number;
  limit?: number;
  bookable?: boolean;
  minRating?: number;
  submittedById?: string;
  tier?: string;
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

export type ClassifiedStatus = 'ACTIVE' | 'SOLD' | 'EXPIRED';
export type ClassifiedCondition = 'NEW' | 'USED' | 'REFURBISHED';

export interface Classified {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  condition: ClassifiedCondition;
  images: string[];
  city: string;
  country: string;
  userId: string;
  status: ClassifiedStatus;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'name'>;
}

export interface PriceEntry {
  id: string;
  listingId: string;
  item: string;
  price: number;
  unit?: string;
  currency: string;
  category: string;
  updatedAt: string;
  listing?: Pick<Listing, 'id' | 'name' | 'city' | 'country' | 'phone' | 'logoUrl' | 'avgRating' | 'reviewCount' | 'verified'>;
}

export type PortalType = 'consumer' | 'business' | 'advertiser' | 'salesrep' | 'ambassador' | 'admin';

export interface ProFeatures {
  featuredPlacement: boolean;
  photoGallery: boolean;
  openingHours: boolean;
  analyticsAccess: boolean;
  prioritySupport: boolean;
  verifiedBadge: boolean;
  multipleLocations: boolean;
  onlineBookings: boolean;
  proWindowSticker: boolean;
  reviewReplies: boolean;
}
