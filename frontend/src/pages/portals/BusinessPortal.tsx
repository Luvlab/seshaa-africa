import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Tag, CalendarDays, Settings, Eye, Star, MessageSquare,
  Plus, ChevronDown, ChevronUp, ArrowUpRight, QrCode, Loader2, AlertCircle,
  Megaphone, Trophy, Check, Globe, Ticket,
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth';
import type { Listing } from '../../types';

// ─── Local types ──────────────────────────────────────────────────────────────

type Tier = 'SILVER' | 'GOLD' | 'DIAMOND';

interface TieredListing extends Listing {
  tier?: Tier;
}

type PromotionType = 'OFFER' | 'ANNOUNCEMENT' | 'HIRING' | 'NEW_PRODUCT';
type EventStatus  = 'PENDING' | 'APPROVED' | 'FEATURED' | 'CANCELLED';

interface Promotion {
  id: string;
  listingId: string;
  type: PromotionType;
  title: string;
  description?: string;
  discountPercent?: number;
  couponCode?: string;
  endDate?: string;
  views: number;
  clicks: number;
  createdAt: string;
  listing?: Pick<Listing, 'id' | 'name'>;
}

interface BusinessEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  venue?: string;
  city: string;
  country: string;
  category?: string;
  isFree: boolean;
  price?: number;
  ticketUrl?: string;
  status: EventStatus;
  submittedById: string;
  createdAt: string;
}

type TabId = 'dashboard' | 'promotions' | 'events' | 'settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_STYLES: Record<Tier, string> = {
  SILVER:  'bg-gray-100 text-gray-600',
  GOLD:    'bg-yellow-100 text-yellow-700',
  DIAMOND: 'bg-cyan-100 text-cyan-700',
};

const PROMO_TYPE_STYLES: Record<PromotionType, string> = {
  OFFER:        'bg-orange-100 text-orange-700',
  ANNOUNCEMENT: 'bg-blue-100 text-blue-700',
  HIRING:       'bg-green-100 text-green-700',
  NEW_PRODUCT:  'bg-purple-100 text-purple-700',
};

const EVENT_STATUS_STYLES: Record<EventStatus, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  APPROVED:  'bg-green-100 text-green-700',
  FEATURED:  'bg-cyan-100 text-cyan-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function Spinner() {
  return <Loader2 size={20} className="animate-spin text-gray-400" />;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
      <AlertCircle size={16} className="shrink-0" />
      {message}
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier?: Tier }) {
  if (!tier) return null;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_STYLES[tier]}`}>
      {tier}
    </span>
  );
}

// ─── Hero stat row ────────────────────────────────────────────────────────────

function HeroStats({ listings }: { listings: TieredListing[] }) {
  const totalViews   = listings.reduce((s, l) => s + (l.viewCount ?? 0), 0);
  const avgRating    = listings.length
    ? listings.reduce((s, l) => s + (l.avgRating ?? 0), 0) / listings.length
    : 0;

  const stats = [
    { label: 'Total Views',   value: totalViews.toLocaleString(), icon: <Eye size={18}/>,      color: 'text-blue-600 bg-blue-50' },
    { label: 'Listings',      value: listings.length,             icon: <Globe size={18}/>,     color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Avg. Rating',   value: avgRating.toFixed(1),        icon: <Star size={18}/>,      color: 'text-yellow-600 bg-yellow-50' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${s.color}`}>
            {s.icon}
          </div>
          <div>
            <p className="text-xl font-black text-gray-900 leading-none">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Listing card ─────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  onAddPromo,
}: {
  listing: TieredListing;
  onAddPromo: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{listing.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{listing.city}, {listing.country}</p>
        </div>
        <TierBadge tier={listing.tier} />
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Eye size={12}/> {(listing.viewCount ?? 0).toLocaleString()}</span>
        <span className="flex items-center gap-1"><Star size={12}/> {(listing.avgRating ?? 0).toFixed(1)}</span>
        <span className="flex items-center gap-1"><MessageSquare size={12}/> {listing.reviewCount ?? 0}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onAddPromo(listing.id)}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Megaphone size={13}/> Add Promo
        </button>
        {(!listing.tier || listing.tier !== 'DIAMOND') && (
          <a
            href="/add-listing"
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--cp)' }}
          >
            <ArrowUpRight size={13}/> Upgrade
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Dashboard ───────────────────────────────────────────────────────────

function DashboardTab({
  onAddPromo,
}: {
  onAddPromo: (listingId: string) => void;
}) {
  const { user } = useAuthStore();
  const [listings, setListings] = useState<TieredListing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get('/listings', { params: { submittedById: user.id, limit: 20 } })
      .then(r => {
        const data = r.data?.listings ?? r.data ?? [];
        setListings(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Failed to load listings.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (error)   return <ErrorBanner message={error} />;

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Globe size={28} className="text-gray-400" />
        </div>
        <p className="text-gray-700 font-semibold text-lg mb-1">No listings yet</p>
        <p className="text-gray-400 text-sm mb-5">Add your business to get discovered across Africa</p>
        <a
          href="/add-listing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--cp)' }}
        >
          <Plus size={16}/> Add your first listing
        </a>
      </div>
    );
  }

  return (
    <div>
      <HeroStats listings={listings} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map(l => (
          <ListingCard key={l.id} listing={l} onAddPromo={onAddPromo} />
        ))}
      </div>
    </div>
  );
}

// ─── Promotion form (collapsible) ─────────────────────────────────────────────

const PROMO_TYPES: PromotionType[] = ['OFFER', 'ANNOUNCEMENT', 'HIRING', 'NEW_PRODUCT'];

function PromotionForm({
  listings,
  preselectedListingId,
  onCreated,
}: {
  listings: TieredListing[];
  preselectedListingId: string;
  onCreated: () => void;
}) {
  const [open, setOpen]     = useState(!!preselectedListingId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    listingId:       preselectedListingId || listings[0]?.id || '',
    type:            'OFFER' as PromotionType,
    title:           '',
    description:     '',
    discountPercent: '',
    couponCode:      '',
    endDate:         '',
  });

  // Keep listingId in sync if the preselected changes
  useEffect(() => {
    if (preselectedListingId) {
      setOpen(true);
      setForm(f => ({ ...f, listingId: preselectedListingId }));
    }
  }, [preselectedListingId]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.listingId || !form.title) { setError('Listing and title are required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/promotions', {
        ...form,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
        endDate: form.endDate || undefined,
      });
      setSuccess(true);
      setForm(f => ({ ...f, title: '', description: '', discountPercent: '', couponCode: '', endDate: '' }));
      setTimeout(() => { setSuccess(false); setOpen(false); onCreated(); }, 1500);
    } catch {
      setError('Failed to create promotion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800 flex items-center gap-2">
          <Plus size={16} style={{ color: 'var(--cp)' }}/> Create Promotion
        </span>
        {open ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
      </button>

      {open && (
        <div className="px-5 pb-6 border-t">
          <div className="pt-4 space-y-4">
            {error   && <ErrorBanner message={error} />}
            {success && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
                <Check size={16}/> Promotion created!
              </div>
            )}

            {/* Listing selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Listing</label>
              <select
                className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400 bg-white"
                value={form.listingId}
                onChange={e => set('listingId', e.target.value)}
              >
                {listings.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {/* Type segmented control */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Type</label>
              <div className="flex flex-wrap gap-2">
                {PROMO_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => set('type', t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.type === t
                        ? PROMO_TYPE_STYLES[t] + ' border-transparent'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title *</label>
              <input
                className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                placeholder="e.g. 20% off this weekend"
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
              <textarea
                className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400 resize-none"
                rows={3}
                placeholder="Details about this promotion..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            {/* OFFER-only fields */}
            {form.type === 'OFFER' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount %</label>
                  <input
                    type="number"
                    min={1} max={100}
                    className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                    placeholder="e.g. 20"
                    value={form.discountPercent}
                    onChange={e => set('discountPercent', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coupon Code</label>
                  <input
                    className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400 uppercase"
                    placeholder="e.g. SAVE20"
                    value={form.couponCode}
                    onChange={e => set('couponCode', e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            )}

            {/* End date */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Date</label>
              <input
                type="date"
                className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: 'var(--cp)' }}
            >
              {submitting ? <Spinner /> : <><Plus size={16}/> Create Promotion</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Promotion card ───────────────────────────────────────────────────────────

function PromotionCard({ promo }: { promo: Promotion }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PROMO_TYPE_STYLES[promo.type]}`}>
              {promo.type.replace('_', ' ')}
            </span>
            {promo.listing && (
              <span className="text-xs text-gray-500">{promo.listing.name}</span>
            )}
          </div>
          <p className="font-semibold text-gray-900">{promo.title}</p>
          {promo.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{promo.description}</p>}
          {promo.couponCode && (
            <span className="inline-block mt-2 text-xs font-mono font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
              {promo.couponCode}
              {promo.discountPercent ? ` · ${promo.discountPercent}% off` : ''}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Eye size={11}/> {promo.views ?? 0} views</span>
        <span className="flex items-center gap-1"><ArrowUpRight size={11}/> {promo.clicks ?? 0} clicks</span>
        {promo.endDate && <span>Ends {new Date(promo.endDate).toLocaleDateString()}</span>}
      </div>
    </div>
  );
}

// ─── Tab: Promotions ──────────────────────────────────────────────────────────

function PromotionsTab({ preselectedListingId }: { preselectedListingId: string }) {
  const { user } = useAuthStore();
  const [listings, setListings]     = useState<TieredListing[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filterListingId, setFilterListingId] = useState(preselectedListingId);

  const loadListings = useCallback(() => {
    if (!user) return Promise.resolve();
    return api.get('/listings', { params: { submittedById: user.id, limit: 20 } })
      .then(r => {
        const data = r.data?.listings ?? r.data ?? [];
        setListings(Array.isArray(data) ? data : []);
      });
  }, [user]);

  const loadPromotions = useCallback(() => {
    const params: Record<string, string> = {};
    if (filterListingId) params.listingId = filterListingId;
    return api.get('/promotions', { params })
      .then(r => {
        const data = r.data?.promotions ?? r.data ?? [];
        setPromotions(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, [filterListingId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadListings(), loadPromotions()])
      .catch(() => setError('Failed to load promotions.'))
      .finally(() => setLoading(false));
  }, [loadListings, loadPromotions]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div>
      {error && <ErrorBanner message={error} />}

      <PromotionForm
        listings={listings}
        preselectedListingId={preselectedListingId || filterListingId}
        onCreated={loadPromotions}
      />

      {/* Filter by listing */}
      {listings.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-gray-500 shrink-0">Filter by listing:</label>
          <select
            className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:border-gray-400 bg-white"
            value={filterListingId}
            onChange={e => setFilterListingId(e.target.value)}
          >
            <option value="">All listings</option>
            {listings.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      )}

      {promotions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Tag size={36} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No promotions yet</p>
          <p className="text-gray-400 text-sm">Create a promotion to drive more traffic to your listing</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {promotions.map(p => <PromotionCard key={p.id} promo={p} />)}
        </div>
      )}
    </div>
  );
}

// ─── Event form (collapsible) ─────────────────────────────────────────────────

function EventForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuthStore();
  const [open, setOpen]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const [form, setForm] = useState({
    title:       '',
    description: '',
    startDate:   '',
    endDate:     '',
    venue:       '',
    city:        user?.country || '',
    country:     user?.country || '',
    category:    '',
    isFree:      true,
    price:       '',
    ticketUrl:   '',
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.startDate || !form.city || !form.country) {
      setError('Title, start date, city and country are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/events', {
        ...form,
        price: form.price ? Number(form.price) : undefined,
        endDate: form.endDate || undefined,
        ticketUrl: form.ticketUrl || undefined,
      });
      setSuccess(true);
      setForm(f => ({ ...f, title: '', description: '', startDate: '', endDate: '', venue: '', price: '', ticketUrl: '' }));
      setTimeout(() => { setSuccess(false); setOpen(false); onCreated(); }, 1500);
    } catch {
      setError('Failed to submit event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800 flex items-center gap-2">
          <Plus size={16} style={{ color: 'var(--cp)' }}/> Submit Event
        </span>
        {open ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
      </button>

      {open && (
        <div className="px-5 pb-6 border-t">
          <div className="pt-4 space-y-4">
            {error   && <ErrorBanner message={error} />}
            {success && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
                <Check size={16}/> Event submitted for review!
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title *</label>
                <input
                  className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                  placeholder="Event name"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                <textarea
                  className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400 resize-none"
                  rows={3}
                  placeholder="What's this event about?"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date *</label>
                <input
                  type="date"
                  className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                  value={form.startDate}
                  onChange={e => set('startDate', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Date</label>
                <input
                  type="date"
                  className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                  value={form.endDate}
                  onChange={e => set('endDate', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Venue</label>
                <input
                  className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                  placeholder="Hall name, address..."
                  value={form.venue}
                  onChange={e => set('venue', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City *</label>
                <input
                  className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                  placeholder="City"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Country *</label>
                <input
                  className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                  placeholder="Country"
                  value={form.country}
                  onChange={e => set('country', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                <input
                  className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                  placeholder="e.g. Music, Business, Sport"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 pt-5">
                <button
                  type="button"
                  onClick={() => set('isFree', !form.isFree)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.isFree ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isFree ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-medium text-gray-700">Free event</span>
              </div>

              {!form.isFree && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price (USD)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                      placeholder="0.00"
                      value={form.price}
                      onChange={e => set('price', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket URL</label>
                    <input
                      type="url"
                      className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm outline-none focus:border-gray-400"
                      placeholder="https://eventbrite.com/..."
                      value={form.ticketUrl}
                      onChange={e => set('ticketUrl', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: 'var(--cp)' }}
            >
              {submitting ? <Spinner /> : <><CalendarDays size={16}/> Submit Event</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Events ──────────────────────────────────────────────────────────────

function EventsTab() {
  const { user } = useAuthStore();
  const [events, setEvents]   = useState<BusinessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const loadEvents = useCallback(() => {
    if (!user) return;
    setLoading(true);
    api.get('/events', { params: { submittedById: user.id } })
      .then(r => {
        const data = r.data?.events ?? r.data ?? [];
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Failed to load events.'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div>
      {error && <ErrorBanner message={error} />}

      <EventForm onCreated={loadEvents} />

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <CalendarDays size={36} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No events yet</p>
          <p className="text-gray-400 text-sm">Submit your first event to get it listed on Seshaa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="bg-white rounded-2xl shadow-sm border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${EVENT_STATUS_STYLES[ev.status]}`}>
                      {ev.status}
                    </span>
                    {ev.category && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{ev.category}</span>
                    )}
                    {ev.isFree ? (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">Free</span>
                    ) : (
                      <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        ${ev.price ?? '—'}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">{ev.title}</p>
                  {ev.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ev.description}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
                <span>{new Date(ev.startDate).toLocaleDateString()}</span>
                {ev.venue && <span>{ev.venue}</span>}
                <span>{ev.city}, {ev.country}</span>
                {ev.ticketUrl && (
                  <a
                    href={ev.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    <Ticket size={11}/> Tickets
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tier pricing table ───────────────────────────────────────────────────────

const TIERS: { tier: Tier; price: string; features: string[]; highlight: boolean }[] = [
  {
    tier: 'SILVER',
    price: 'Free',
    highlight: false,
    features: ['Basic listing', 'Phone & address', 'Verified badge (on approval)', 'Community reviews'],
  },
  {
    tier: 'GOLD',
    price: '$9/mo',
    highlight: false,
    features: ['Everything in Silver', 'Photo gallery', 'Opening hours', 'Analytics dashboard', 'Priority support'],
  },
  {
    tier: 'DIAMOND',
    price: '$19/mo',
    highlight: true,
    features: ['Everything in Gold', 'Featured placement', 'Online bookings', 'Multiple locations', 'QR window sticker', 'Review replies'],
  },
];

// ─── Tab: Settings / QR ───────────────────────────────────────────────────────

function SettingsTab() {
  const { user } = useAuthStore();
  const [listings, setListings] = useState<TieredListing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get('/listings', { params: { submittedById: user.id, limit: 20 } })
      .then(r => {
        const data: TieredListing[] = r.data?.listings ?? r.data ?? [];
        const arr = Array.isArray(data) ? data : [];
        setListings(arr);
        if (arr.length > 0 && !selectedId) setSelectedId(arr[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectedListing = listings.find(l => l.id === selectedId);

  const qrUrl = selectedId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://seshaa.africa/listing/${selectedId}`
    : null;

  return (
    <div className="space-y-6">
      {/* QR Code section */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <QrCode size={20} style={{ color: 'var(--cp)' }}/>
          <h2 className="font-bold text-gray-800">QR Code for Your Listing</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : listings.length === 0 ? (
          <p className="text-sm text-gray-500">Add a listing first to generate a QR code.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div>
              {listings.length > 1 && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Select listing</label>
                  <select
                    className="border rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                  >
                    {listings.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}
              {qrUrl && (
                <img
                  src={qrUrl}
                  alt={`QR code for ${selectedListing?.name}`}
                  width={200}
                  height={200}
                  className="rounded-xl border shadow-sm"
                />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 mb-1">{selectedListing?.name}</p>
              <p className="text-xs text-gray-400 mb-3">
                https://seshaa.africa/listing/{selectedId}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Print this QR code and display it at your business so customers can find your Seshaa listing instantly.
              </p>
              {qrUrl && (
                <a
                  href={qrUrl}
                  download={`seshaa-qr-${selectedId}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ArrowUpRight size={14}/> Download QR
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tier + pricing */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-5">
          <Trophy size={20} style={{ color: 'var(--cp)' }}/>
          <h2 className="font-bold text-gray-800">Listing Tiers</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {TIERS.map(t => (
            <div
              key={t.tier}
              className={`rounded-2xl border-2 p-5 flex flex-col ${
                t.highlight ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200'
              }`}
            >
              {t.highlight && (
                <span className="self-start text-xs bg-cyan-500 text-white font-bold px-2 py-0.5 rounded-full mb-3">
                  Best Value
                </span>
              )}
              <TierBadge tier={t.tier} />
              <p className="text-2xl font-black text-gray-900 mt-3 mb-1">{t.price}</p>
              <ul className="space-y-1.5 mt-2 flex-1">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {t.tier !== 'SILVER' && (
                <a
                  href="/add-listing"
                  className="mt-5 flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--cp)' }}
                >
                  Upgrade to {t.tier}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab strip ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',  label: 'Dashboard',   icon: <LayoutDashboard size={16}/> },
  { id: 'promotions', label: 'Promotions',  icon: <Tag size={16}/> },
  { id: 'events',     label: 'Events',      icon: <CalendarDays size={16}/> },
  { id: 'settings',   label: 'Settings',    icon: <Settings size={16}/> },
];

// ─── Root component ───────────────────────────────────────────────────────────

export default function BusinessPortal() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab]             = useState<TabId>('dashboard');
  const [promoListingId, setPromoListingId]   = useState('');

  const handleAddPromo = (listingId: string) => {
    setPromoListingId(listingId);
    setActiveTab('promotions');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--cp)', opacity: 0.15 }}
        />
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 -ml-12"
          style={{ backgroundColor: 'transparent' }}
        >
          <Globe size={24} style={{ color: 'var(--cp)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            {t('portal.business', 'Business Portal')}
          </h1>
          <p className="text-sm text-gray-500">
            {user?.name ? `Welcome back, ${user.name}` : 'Manage your listings, promotions and events'}
          </p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex border-b mb-7 gap-0 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--cp)] text-[var(--cp)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard'  && <DashboardTab onAddPromo={handleAddPromo} />}
      {activeTab === 'promotions' && <PromotionsTab preselectedListingId={promoListingId} />}
      {activeTab === 'events'     && <EventsTab />}
      {activeTab === 'settings'   && <SettingsTab />}
    </div>
  );
}
