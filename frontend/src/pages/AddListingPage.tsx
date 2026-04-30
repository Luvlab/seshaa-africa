/**
 * AddListingPage — create a new listing with tier selection.
 * Silver = free, Gold = $9/month, Diamond = $19/month.
 * Geolocation auto-fills city + country via OSM Nominatim.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, MessageCircle, Tag, CheckCircle,
         Loader2, Sparkles, Camera, Clock, Star, Copy } from 'lucide-react';
import { listingsApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import clsx from 'clsx';
import AddressAutocomplete from '../components/directory/AddressAutocomplete';

// ── Listing tiers ─────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'SILVER',
    label: 'Silver',
    price: 'Free',
    color: 'border-gray-300 bg-gray-50',
    badge: 'bg-gray-200 text-gray-700',
    icon: '🥈',
    features: [
      'Name, phone & location',
      'Category & description',
      'Searchable in directory',
      'Up to 1 photo',
    ],
    locked: [],
  },
  {
    id: 'GOLD',
    label: 'Gold',
    price: '$9/mo',
    color: 'border-yellow-300 bg-yellow-50',
    badge: 'bg-yellow-400 text-white',
    icon: '🥇',
    features: [
      'Everything in Silver',
      'Website & WhatsApp link',
      'Up to 10 photos',
      'Opening hours',
      'Verified badge ✓',
      'View analytics',
    ],
    locked: [],
  },
  {
    id: 'DIAMOND',
    label: 'Diamond',
    price: '$19/mo',
    color: 'border-blue-300 bg-blue-50',
    badge: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white',
    icon: '💎',
    features: [
      'Everything in Gold',
      'Featured placement',
      'Online bookings',
      'QR code sticker',
      'Priority in search',
      'WhatsApp & call CTA',
    ],
    locked: [],
  },
] as const;

type TierId = 'SILVER' | 'GOLD' | 'DIAMOND';

const CATEGORIES = [
  'Restaurant & Food', 'Health & Medical', 'Education', 'Retail & Shopping',
  'Finance & Banking', 'Transport', 'Hotel & Lodging', 'Technology',
  'Construction', 'Agriculture', 'Legal Services', 'Beauty & Salon',
  'Auto & Garage', 'Church & Religion', 'NGO & Charity', 'Government', 'Other',
];

const LISTING_TYPES = ['BUSINESS', 'PERSONAL', 'GOVERNMENT', 'NGO'] as const;

// ── Reverse geocode via OpenStreetMap Nominatim ───────────────────────────────
async function reverseGeocode(lat: number, lon: number) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const d = await r.json();
  return {
    city:    d.address?.city || d.address?.town || d.address?.village || d.address?.hamlet || '',
    country: d.address?.country || '',
    region:  d.address?.state || d.address?.county || '',
    address: d.display_name?.split(',').slice(0, 2).join(', ') || '',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AddListingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tier, setTier] = useState<TierId>('SILVER');
  const [step, setStep] = useState<'tier' | 'form' | 'success'>('tier');
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');
  const [newListingId, setNewListingId] = useState('');

  const [form, setForm] = useState({
    type:        'BUSINESS' as typeof LISTING_TYPES[number],
    name:        '',
    phone:       '',
    phone2:      '',
    email:       '',
    address:     '',
    city:        '',
    country:     '',
    region:      '',
    category:    '',
    description: '',
    website:     '',
    whatsapp:    '',
    openingHours:'',
    latitude:    0,
    longitude:   0,
  });

  // Auto-detect location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            setForm(f => ({
              ...f,
              city:      geo.city    || f.city,
              country:   geo.country || f.country,
              region:    geo.region  || f.region,
              latitude:  pos.coords.latitude,
              longitude: pos.coords.longitude,
            }));
          } catch { /* ignore */ }
          setGeoLoading(false);
        },
        () => setGeoLoading(false),
        { timeout: 8000, maximumAge: 60000 }
      );
    }
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Business name is required');
    if (!form.phone.trim()) return setError('Phone number is required');
    if (!form.city.trim()) return setError('City is required');
    if (!form.country.trim()) return setError('Country is required');
    if (!form.category) return setError('Please select a category');

    setError('');
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        tier,
        // Only send advanced fields if Gold/Diamond
        website:     (tier === 'SILVER') ? undefined : form.website || undefined,
        whatsapp:    (tier === 'SILVER') ? undefined : form.whatsapp || undefined,
        openingHours:(tier === 'SILVER') ? undefined : form.openingHours || undefined,
        bookable:    tier === 'DIAMOND',
        isPro:       tier !== 'SILVER',
      };
      if (user?.role === 'SALES_REP') {
        payload.salesRepId = user.id;
      }
      const r = await listingsApi.create(payload);
      setNewListingId(r.data?.id || '');
      setStep('success');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Tier selection ──────────────────────────────────────────────────────────
  if (step === 'tier') return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">Add Your Listing</h1>
          <p className="text-gray-500 mt-2">Choose a plan. You can upgrade anytime.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {TIERS.map(t => (
            <button
              key={t.id}
              onClick={() => setTier(t.id)}
              className={clsx(
                'rounded-2xl border-2 p-5 text-left transition-all',
                t.color,
                tier === t.id ? 'ring-4 ring-offset-1' : 'hover:shadow-md',
                tier === t.id && t.id === 'SILVER' && 'ring-gray-300',
                tier === t.id && t.id === 'GOLD'   && 'ring-yellow-400',
                tier === t.id && t.id === 'DIAMOND' && 'ring-blue-400',
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{t.icon}</span>
                <span className={clsx('text-xs font-black px-2.5 py-1 rounded-full', t.badge)}>
                  {t.price}
                </span>
              </div>
              <h3 className="font-black text-lg text-gray-900 mb-3">{t.label}</h3>
              <ul className="space-y-1.5">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-500" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 mb-4 text-center">
            <a href="/auth" className="font-semibold hover:underline">Sign in or create a free account</a> to manage your listing later.
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={() => setStep('form')}
            className="px-8 py-3.5 rounded-2xl font-black text-white text-base transition-all"
            style={{ background: 'var(--cp, #008751)' }}
          >
            Continue with {TIERS.find(t => t.id === tier)?.label} →
          </button>
        </div>
      </div>
    </div>
  );

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 'success') {
    const isSalesRep = user?.role === 'SALES_REP';
    const listingUrl = `https://seshaa.africa/listing/${newListingId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(listingUrl)}`;
    const showRichSuccess = !isSalesRep && (user?.role === 'BUSINESS_OWNER' || user?.role === 'USER' || !user);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {showRichSuccess ? (
            <>
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Your listing is live!</h1>
              <p className="text-gray-500 mb-6">
                It will appear in search results after a quick review (usually under 24 hrs).
              </p>

              {newListingId && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 space-y-4">
                  <img src={qrUrl} alt="QR code" className="mx-auto rounded-xl" width={160} height={160} />
                  <p className="text-xs text-gray-500">Scan or share this QR code</p>

                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 font-mono break-all">
                    <span className="flex-1 text-left truncate">{listingUrl}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(listingUrl)}
                      className="shrink-0 text-gray-400 hover:text-gray-700"
                      title="Copy link"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {newListingId && (
                  <button
                    onClick={() => navigate(`/listing/${newListingId}`)}
                    className="px-6 py-3 rounded-xl font-bold text-white"
                    style={{ background: 'var(--cp, #008751)' }}
                  >
                    View listing →
                  </button>
                )}
                <button
                  onClick={() => navigate('/business')}
                  className="px-6 py-3 rounded-xl font-bold bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                >
                  Add a promotion →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-500" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Listing Submitted!</h1>
              <p className="text-gray-500 mb-6">
                Your {tier.toLowerCase()} listing is pending verification. We'll review it within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {newListingId && (
                  <button
                    onClick={() => navigate(`/listing/${newListingId}`)}
                    className="px-6 py-3 rounded-xl font-bold text-white"
                    style={{ background: 'var(--cp, #008751)' }}
                  >
                    View Listing
                  </button>
                )}
                <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200">
                  Back to Home
                </button>
                {tier === 'SILVER' && (
                  <button
                    onClick={() => { setTier('GOLD'); setStep('tier'); }}
                    className="px-6 py-3 rounded-xl font-bold bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  >
                    🥇 Upgrade to Gold
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  const selectedTier = TIERS.find(t => t.id === tier)!;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep('tier')} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-gray-900">Add Listing</h1>
          </div>
          <span className={clsx('text-xs font-black px-3 py-1.5 rounded-full', selectedTier.badge)}>
            {selectedTier.icon} {selectedTier.label} · {selectedTier.price}
          </span>
        </div>

        {/* Sales rep banner */}
        {user?.role === 'SALES_REP' && (
          <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5 mb-4">
            📋 <span><strong>Submitting as Sales Rep</strong> — this listing will be attributed to you.</span>
          </div>
        )}

        {/* Geo status */}
        {geoLoading && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4">
            <Loader2 size={14} className="animate-spin" />
            <span>Detecting your location…</span>
          </div>
        )}
        {!geoLoading && form.city && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-4">
            <MapPin size={14} />
            <span>Location detected: {form.city}, {form.country}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Listing Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LISTING_TYPES.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => set('type', t)}
                  className={clsx(
                    'py-2.5 rounded-xl text-xs font-semibold border-2 transition-colors',
                    form.type === t
                      ? 'border-current text-white'
                      : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300',
                  )}
                  style={form.type === t ? { backgroundColor: 'var(--cp, #008751)', borderColor: 'var(--cp, #008751)' } : {}}
                >
                  {t === 'BUSINESS' ? '🏢 Business' : t === 'PERSONAL' ? '👤 Personal' : t === 'GOVERNMENT' ? '🏛 Govt' : '🤝 NGO'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              {form.type === 'PERSONAL' ? 'Full Name' : 'Business / Organisation Name'} *
            </label>
            <input
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white"
              placeholder={form.type === 'PERSONAL' ? 'John Doe' : 'Acme Ltd.'}
              value={form.name} onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                <Phone size={12} className="inline mr-1" /> Phone *
              </label>
              <input
                required type="tel"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white"
                placeholder="+256 700 000 000"
                value={form.phone} onChange={e => set('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                <Phone size={12} className="inline mr-1" /> Second Phone (optional)
              </label>
              <input
                type="tel"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white"
                placeholder="+256 750 000 000"
                value={form.phone2} onChange={e => set('phone2', e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              <Mail size={12} className="inline mr-1" /> Email (optional)
            </label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white"
              placeholder="contact@example.com"
              value={form.email} onChange={e => set('email', e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                <MapPin size={12} className="inline mr-1" /> City / Town *
              </label>
              <input
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white"
                placeholder="Kampala"
                value={form.city} onChange={e => set('city', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Country *
              </label>
              <input
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white"
                placeholder="Uganda"
                value={form.country} onChange={e => set('country', e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Region / District
              </label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white"
                placeholder="Central Region"
                value={form.region} onChange={e => set('region', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Street Address (optional)
              </label>
              <AddressAutocomplete
                value={form.address}
                onChange={val => set('address', val)}
                onSelect={result => setForm(f => ({
                  ...f,
                  address:   result.address,
                  city:      result.city || f.city,
                  country:   result.country || f.country,
                  latitude:  result.lat,
                  longitude: result.lon,
                }))}
                countryCode={undefined}
                placeholder="14 Kampala Rd"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              <Tag size={12} className="inline mr-1" /> Category *
            </label>
            <select
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white"
              value={form.category} onChange={e => set('category', e.target.value)}
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-white resize-none"
              placeholder="Brief description of your business or services…"
              value={form.description} onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Gold/Diamond extras */}
          {tier !== 'SILVER' && (
            <div className={clsx(
              'rounded-2xl border-2 p-4 space-y-4',
              tier === 'GOLD' ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'
            )}>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                {tier === 'GOLD' ? '🥇 Gold Features' : '💎 Diamond Features'}
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    <Globe size={12} className="inline mr-1" /> Website URL
                  </label>
                  <input
                    type="url"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400 bg-white"
                    placeholder="https://yoursite.com"
                    value={form.website} onChange={e => set('website', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    <MessageCircle size={12} className="inline mr-1" /> WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400 bg-white"
                    placeholder="+256 700 000 000"
                    value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  <Clock size={12} className="inline mr-1" /> Opening Hours
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400 bg-white"
                  placeholder="Mon–Fri 8am–6pm, Sat 9am–2pm"
                  value={form.openingHours} onChange={e => set('openingHours', e.target.value)}
                />
              </div>

              {tier === 'DIAMOND' && (
                <div className="bg-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  <strong>💎 Diamond perks:</strong> Your listing gets featured at the top of search results,
                  customers can book directly, and you'll receive a Seshaa QR sticker for your window.
                </div>
              )}
            </div>
          )}

          {/* Photo upload placeholder */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              <Camera size={12} className="inline mr-1" /> Photos {tier === 'SILVER' ? '(1 max — upgrade for more)' : '(up to 10)'}
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 hover:border-gray-300 cursor-pointer">
              <Camera size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tap to add photos</p>
              <p className="text-xs mt-1">JPG, PNG up to 5 MB each</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Pricing notice for paid tiers */}
          {tier !== 'SILVER' && (
            <div className="bg-gray-100 rounded-xl p-3 text-xs text-gray-500">
              <Star size={11} className="inline mr-1" />
              {tier === 'GOLD' ? '$9/month' : '$19/month'} billing begins after your listing is verified.
              Cancel anytime. Your listing stays visible at Silver tier if you cancel.
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl font-black text-white text-base transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--cp, #008751)' }}
          >
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> Submitting…</>
            ) : (
              <><Sparkles size={18} /> Submit {selectedTier.label} Listing</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
