/**
 * DiasporaPage — seshaa.diaspora
 *
 * A dedicated portal connecting African diaspora communities worldwide
 * to African businesses — both in their host country AND back home.
 * Shares the same database and API as the main Seshaa app.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe2, MapPin, Heart, ArrowRight, Search,
  Building2, UtensilsCrossed, Scissors, ShoppingBag,
  Music2, Send, Plane, Package, Users, Sparkles,
  Plus, X, ChevronRight, Clock, Phone, Globe, Star,
  Utensils, HeartPulse, GraduationCap, Banknote, Bus, BedDouble,
  Laptop, CheckCircle, Camera,
} from 'lucide-react';
import SeshaaTitle from '../components/brand/SeshaaTitle';
import { listingsApi } from '../services/api';
import { useAuthStore } from '../store/auth';

// ── Category options for Add a Place ────────────────────────────────────────
const ADD_CATEGORIES = [
  { id: 'restaurant',   label: 'Restaurant / Food',  icon: Utensils,    color: '#e67e22' },
  { id: 'health',       label: 'Health / Medical',   icon: HeartPulse,  color: '#e74c3c' },
  { id: 'beauty',       label: 'Hair & Beauty',      icon: Scissors,    color: '#e91e8c' },
  { id: 'finance',      label: 'Finance / Money',    icon: Banknote,    color: '#27ae60' },
  { id: 'transport',    label: 'Transport',           icon: Bus,         color: '#9b59b6' },
  { id: 'hotel',        label: 'Hotel / Stay',        icon: BedDouble,   color: '#1abc9c' },
  { id: 'tech',         label: 'Tech / IT',           icon: Laptop,      color: '#2980b9' },
  { id: 'education',    label: 'Education',           icon: GraduationCap, color: '#3498db' },
  { id: 'shopping',     label: 'Shopping / Retail',  icon: ShoppingBag, color: '#f59e0b' },
  { id: 'music',        label: 'Events / Music',     icon: Music2,       color: '#ef4444' },
  { id: 'travel',       label: 'Travel / Flights',   icon: Plane,        color: '#10b981' },
  { id: 'other',        label: 'Other',              icon: Building2,    color: '#6b7280' },
];

// ── Add a Place Drawer ───────────────────────────────────────────────────────
function AddPlaceDrawer({ onClose, isDiaspora = true }: { onClose: () => void; isDiaspora?: boolean }) {
  const { user } = useAuthStore();
  const [step, setStep]           = useState(1); // 1=type+name, 2=location, 3=details, 4=done
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]           = useState({
    type: 'BUSINESS' as 'BUSINESS' | 'PERSONAL' | 'NGO' | 'GOVERNMENT',
    name: '',
    category: '',
    address: '',
    city: '',
    country: isDiaspora ? '' : '',   // diaspora = outside Africa
    phone: '',
    website: '',
    whatsapp: '',
    openingHours: '',
    description: '',
    language: 'en',
    tags: isDiaspora ? ['diaspora'] : [] as string[],
  });

  const set = (k: string, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || !form.city.trim() || !form.country.trim()) return;
    setSubmitting(true);
    try {
      await listingsApi.create(form);
      setStep(4);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const progress = Math.round((step / 3) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 bg-white w-full sm:rounded-3xl sm:max-w-lg overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 40px)', borderRadius: '24px 24px 0 0' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-gray-50 shrink-0">
          <div className="flex-1">
            <h2 className="font-black text-gray-900 text-lg">
              {isDiaspora ? '🌍 Add an African Place' : '📍 Add a Place'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isDiaspora
                ? 'African-owned businesses outside Africa'
                : 'Add any business to the Seshaa directory'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        {step < 4 && (
          <div className="h-1 bg-gray-100 shrink-0">
            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Steps */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-8">
              <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-black text-gray-900 mb-2">Place added!</h3>
              <p className="text-sm text-gray-500 mb-6">
                <strong>{form.name}</strong> has been submitted. It will appear once reviewed — usually within 24 hours.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50">
                  Done
                </button>
                <button onClick={() => { setStep(1); setForm(f => ({ ...f, name: '' })); }}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
                  style={{ background: 'var(--cp, #008751)' }}>
                  Add another
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Type + Name + Category */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Place type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['BUSINESS', 'PERSONAL', 'NGO', 'GOVERNMENT'] as const).map(t => (
                    <button key={t} onClick={() => set('type', t)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.type === t ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {t === 'BUSINESS' ? '🏪 Business' : t === 'PERSONAL' ? '👤 Personal' : t === 'NGO' ? '❤️ NGO' : '🏛️ Government'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Place name *</label>
                <input
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-green-500 font-medium"
                  placeholder="e.g. Nairobi Kitchen, Dr. Olu Clinic…"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {ADD_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => set('category', cat.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${
                        form.category === cat.id ? 'border-current' : 'border-gray-100 hover:border-gray-200'
                      }`}
                      style={form.category === cat.id ? { borderColor: cat.color, backgroundColor: cat.color + '15' } : {}}>
                      <cat.icon size={18} style={{ color: form.category === cat.id ? cat.color : '#9ca3af' }} />
                      <span className="text-xs font-semibold text-gray-700 leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                <MapPin size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  {isDiaspora
                    ? 'Enter the city and country where this African business is located (outside Africa).'
                    : 'Enter the full address of this place.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Address</label>
                <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
                  placeholder="Street address (optional)"
                  value={form.address} onChange={e => set('address', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">City *</label>
                  <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
                    placeholder={isDiaspora ? "e.g. London" : "e.g. Nairobi"}
                    value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Country *</label>
                  <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
                    placeholder={isDiaspora ? "e.g. UK, US, FR" : "Country code"}
                    value={form.country} onChange={e => set('country', e.target.value.toUpperCase())} />
                </div>
              </div>

              {isDiaspora && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">African homeland (optional)</label>
                  <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500"
                    placeholder="e.g. Nigerian-owned, Ghanaian cuisine…"
                    value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Contact + hours */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <Phone size={16} className="text-gray-400 shrink-0" />
                  <input className="flex-1 bg-transparent text-sm outline-none"
                    placeholder="Phone number"
                    value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <Globe size={16} className="text-gray-400 shrink-0" />
                  <input className="flex-1 bg-transparent text-sm outline-none"
                    placeholder="Website URL"
                    value={form.website} onChange={e => set('website', e.target.value)} />
                </div>
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <span className="text-green-600 text-base shrink-0">📱</span>
                  <input className="flex-1 bg-transparent text-sm outline-none"
                    placeholder="WhatsApp number"
                    value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
                </div>
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <Clock size={16} className="text-gray-400 shrink-0" />
                  <input className="flex-1 bg-transparent text-sm outline-none"
                    placeholder="Opening hours e.g. Mon–Fri 9am–6pm"
                    value={form.openingHours} onChange={e => set('openingHours', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Description (optional)</label>
                <textarea className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 resize-none"
                  rows={3}
                  placeholder="Describe this place…"
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <Camera size={16} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">Photos can be added after the place is approved. You'll be notified by email.</p>
              </div>

              {!user && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                  <Star size={16} className="text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-800">
                    <a href="/auth" className="font-bold underline">Sign in</a> to track your submissions, respond to reviews, and manage your listing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        {step < 4 && (
          <div className="flex gap-3 px-5 py-4 border-t bg-gray-50 shrink-0">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-100 text-sm">
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                disabled={step === 1 ? !form.name.trim() : !form.city.trim() || !form.country.trim()}
                onClick={() => setStep(s => s + 1)}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--cp, #008751)' }}>
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                disabled={submitting}
                onClick={submit}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--cp, #008751)' }}>
                {submitting ? 'Submitting…' : '✓ Submit Place'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Diaspora host countries / cities ────────────────────────────────────────
const DIASPORA_HUBS = [
  { city: 'London',      country: 'United Kingdom',  code: 'GB', flag: '🇬🇧', pop: '1.5M+ Africans' },
  { city: 'Paris',       country: 'France',           code: 'FR', flag: '🇫🇷', pop: '700K+ Africans' },
  { city: 'New York',    country: 'United States',    code: 'US', flag: '🇺🇸', pop: '2M+ Africans'   },
  { city: 'Toronto',     country: 'Canada',           code: 'CA', flag: '🇨🇦', pop: '500K+ Africans' },
  { city: 'Amsterdam',   country: 'Netherlands',      code: 'NL', flag: '🇳🇱', pop: '300K+ Africans' },
  { city: 'Brussels',    country: 'Belgium',          code: 'BE', flag: '🇧🇪', pop: '400K+ Africans' },
  { city: 'Lisbon',      country: 'Portugal',         code: 'PT', flag: '🇵🇹', pop: '250K+ Africans' },
  { city: 'Madrid',      country: 'Spain',            code: 'ES', flag: '🇪🇸', pop: '200K+ Africans' },
  { city: 'Berlin',      country: 'Germany',          code: 'DE', flag: '🇩🇪', pop: '250K+ Africans' },
  { city: 'Stockholm',   country: 'Sweden',           code: 'SE', flag: '🇸🇪', pop: '200K+ Africans' },
  { city: 'Dubai',       country: 'UAE',              code: 'AE', flag: '🇦🇪', pop: '400K+ Africans' },
  { city: 'Sydney',      country: 'Australia',        code: 'AU', flag: '🇦🇺', pop: '150K+ Africans' },
  { city: 'Oslo',        country: 'Norway',           code: 'NO', flag: '🇳🇴', pop: '100K+ Africans' },
  { city: 'Riyadh',      country: 'Saudi Arabia',     code: 'SA', flag: '🇸🇦', pop: '500K+ Africans' },
  { city: 'São Paulo',   country: 'Brazil',           code: 'BR', flag: '🇧🇷', pop: '12M+ Afro-Brazilians' },
  { city: 'Shanghai',    country: 'China',            code: 'CN', flag: '🇨🇳', pop: '200K+ Africans' },
];

// ── African homeland countries ───────────────────────────────────────────────
const HOMELAND_PICKS = [
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria'       },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana'         },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya'         },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa'  },
  { code: 'ET', flag: '🇪🇹', name: 'Ethiopia'      },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt'         },
  { code: 'SN', flag: '🇸🇳', name: 'Senegal'       },
  { code: 'CI', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: 'CM', flag: '🇨🇲', name: 'Cameroon'      },
  { code: 'MA', flag: '🇲🇦', name: 'Morocco'       },
  { code: 'TZ', flag: '🇹🇿', name: 'Tanzania'      },
  { code: 'UG', flag: '🇺🇬', name: 'Uganda'        },
  { code: 'AO', flag: '🇦🇴', name: 'Angola'        },
  { code: 'ZW', flag: '🇿🇼', name: 'Zimbabwe'      },
  { code: 'SO', flag: '🇸🇴', name: 'Somalia'       },
  { code: 'RW', flag: '🇷🇼', name: 'Rwanda'        },
  { code: 'CD', flag: '🇨🇩', name: 'DR Congo'      },
  { code: 'ML', flag: '🇲🇱', name: 'Mali'          },
];

// ── Diaspora-specific categories ─────────────────────────────────────────────
const DIASPORA_CATS = [
  { icon: UtensilsCrossed, label: 'African Food',      desc: 'Restaurants & grocers',    color: '#FF6B35', q: 'african restaurant' },
  { icon: Scissors,        label: 'Hair & Beauty',     desc: 'Braiding, weaves & more',   color: '#9333EA', q: 'african hair salon'  },
  { icon: Send,            label: 'Send Money Home',   desc: 'Remittances & transfers',   color: '#0EA5E9', q: 'money transfer'      },
  { icon: ShoppingBag,     label: 'African Fashion',   desc: 'Ankara, Kente & textiles',  color: '#F59E0B', q: 'african fashion'     },
  { icon: Music2,          label: 'Music & Events',    desc: 'Artists, clubs & events',   color: '#EF4444', q: 'african music events' },
  { icon: Plane,           label: 'Travel & Flights',  desc: 'Tickets to Africa',         color: '#10B981', q: 'flights africa'      },
  { icon: Package,         label: 'Ship to Africa',    desc: 'Send parcels & cargo home', color: '#6366F1', q: 'shipping africa'     },
  { icon: Building2,       label: 'All Businesses',    desc: 'Full directory',            color: '#008751', q: ''                    },
];

// ── How it works steps ────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: '01',
    icon: MapPin,
    title: 'Find African near you',
    desc: 'Browse African-owned businesses, restaurants, salons, and services in your city abroad.',
  },
  {
    step: '02',
    icon: Heart,
    title: 'Stay connected to home',
    desc: 'Explore listings, news, and prices from your African country — wherever you are in the world.',
  },
  {
    step: '03',
    icon: Globe2,
    title: 'Build community',
    desc: 'Add your business, share events, and help grow the African diaspora network.',
  },
];

// ── Manifesto stats ───────────────────────────────────────────────────────────
const STATS = [
  { value: '300M+', label: 'Africans in the diaspora' },
  { value: '54',    label: 'African countries covered' },
  { value: '16',    label: 'Diaspora host countries'   },
  { value: '1',     label: 'Connected community'       },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function DiasporaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState('');
  const [activeHub, setActiveHub] = useState<string | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQ)}`);
    }
  };

  const searchCat = (q: string) => {
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
    else navigate('/search');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {showAddPlace && <AddPlaceDrawer onClose={() => setShowAddPlace(false)} isDiaspora />}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #0d2d1a 40%, #1a1a2e 70%, #0a0a0a 100%)',
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #008751, transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #FCD116, transparent)' }} />
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #CE1126, transparent)' }} />

        <div className="relative w-full px-6 sm:px-8 lg:px-12 py-20 text-center">
          {/* Brand */}
          <div className="flex justify-center mb-6">
            <SeshaaTitle staticSuffix="diaspora" size="lg" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-4">
            Africa,{' '}
            <span style={{ color: '#FCD116' }}>wherever</span>{' '}
            you are
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 leading-relaxed">
            {t('diaspora.subtitle')}
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto flex items-center bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 gap-3 hover:bg-white/15 transition-colors focus-within:border-green-400/50">
            <Search size={18} className="text-green-400 shrink-0" />
            <input
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-base"
              placeholder={t('diaspora.search')}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={handleSearch}
            />
            <button
              onClick={() => navigate('/search?ai=1&q=' + encodeURIComponent(searchQ))}
              title="AI search"
              className="text-yellow-400 hover:text-yellow-300"
            >
              <Sparkles size={16} />
            </button>
          </div>

          {/* Add a Place CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button
              onClick={() => setShowAddPlace(true)}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white font-black text-gray-900 rounded-2xl hover:bg-green-50 transition-colors text-sm shadow-lg"
            >
              <Plus size={16} /> Add an African Place
            </button>
            <button
              onClick={() => navigate('/search?tags=diaspora')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/15 border border-white/30 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors text-sm"
            >
              <Globe2 size={16} /> Browse Diaspora Places
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-10 border-t border-white/10">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black" style={{ color: '#FCD116' }}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <div className="bg-gray-900 py-16">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <h2 className="text-2xl font-bold text-center mb-10 text-white">{t('home.rep.how')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(item => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{ background: 'linear-gradient(135deg, #008751, #00a862)' }}>
                  <item.icon size={24} className="text-white" />
                </div>
                <p className="text-xs font-mono text-green-500 mb-1">{item.step}</p>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Diaspora categories ───────────────────────────────────────────── */}
      <div className="py-14 bg-gray-950">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">{t('diaspora.findServices')}</h2>
            <Link to="/search" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
              All listings <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {DIASPORA_CATS.map(cat => (
              <button
                key={cat.label}
                onClick={() => searchCat(cat.q)}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-600 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: cat.color + '22', border: `1.5px solid ${cat.color}44` }}
                >
                  <cat.icon size={20} style={{ color: cat.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{cat.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Diaspora hubs ─────────────────────────────────────────────────── */}
      <div className="py-14 bg-gray-900">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <h2 className="text-xl font-bold text-white mb-2">{t('diaspora.hubs')}</h2>
          <p className="text-sm text-gray-400 mb-8">
            {t('diaspora.subtitle')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {DIASPORA_HUBS.map(hub => (
              <button
                key={hub.code}
                onClick={() => {
                  setActiveHub(hub.code);
                  navigate(`/search?country=${hub.code}&q=african`);
                }}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left hover:scale-[1.01] active:scale-[0.99] ${
                  activeHub === hub.code
                    ? 'bg-green-900/30 border-green-500/50'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                }`}
              >
                <span className="text-2xl leading-none shrink-0">{hub.flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{hub.city}</p>
                  <p className="text-xs text-gray-400 truncate">{hub.pop}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Connect back home ─────────────────────────────────────────────── */}
      <div className="py-14 bg-gray-950">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <h2 className="text-xl font-bold text-white mb-2">{t('diaspora.homeland')}</h2>
          <p className="text-sm text-gray-400 mb-8">
            {t('diaspora.subtitle')}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-2">
            {HOMELAND_PICKS.map(c => (
              <Link
                key={c.code}
                to={`/country/${c.code}`}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all hover:scale-[1.04] active:scale-[0.97] text-center"
              >
                <span className="text-2xl leading-none">{c.flag}</span>
                <span className="text-xs text-gray-300 font-medium leading-tight">{c.name}</span>
              </Link>
            ))}
            <Link
              to="/search"
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gray-900 border border-dashed border-gray-700 hover:border-gray-500 transition-all hover:scale-[1.04] text-center"
            >
              <span className="text-2xl leading-none">🌍</span>
              <span className="text-xs text-gray-400 leading-tight">All Africa</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Community CTA ─────────────────────────────────────────────────── */}
      <div
        className="py-20 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #003d24, #008751, #003d24)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #FCD116 0%, transparent 50%), radial-gradient(circle at 80% 50%, #CE1126 0%, transparent 50%)' }} />
        <div className="relative w-full px-6 sm:px-8 lg:px-12">
          <Users size={40} className="mx-auto mb-4 text-white/80" />
          <h2 className="text-3xl font-black mb-4 text-white">{t('diaspora.title')}</h2>
          <p className="text-green-100 text-base mb-8 leading-relaxed">
            {t('diaspora.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowAddPlace(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-800 font-bold rounded-xl hover:bg-green-50 transition-colors text-sm">
              <Plus size={16} /> Add an African Place
            </button>
            <Link to="/search"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 border border-white/40 text-white font-bold rounded-xl hover:bg-white/30 transition-colors text-sm">
              <Search size={16} /> {t('nav.search')}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Back to main app ──────────────────────────────────────────────── */}
      <div className="bg-gray-900 py-6 text-center border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-2">Part of the Seshaa Africa network</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-400 hover:text-green-300"
        >
          <SeshaaTitle staticSuffix="africa" size="sm" />
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
