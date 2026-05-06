/**
 * Seshaa Events — community-submitted + auto-discovered African events
 *
 * Two data streams:
 *  1. DB events (user-submitted, approved)  — via eventsApi.list
 *  2. Discovered events (scraped / Eventbrite)  — via eventsApi.discover
 *
 * Discovered events always link back to their source with full credit,
 * matching the pattern used on the news page.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, MapPin, Users, Ticket, Plus, ChevronDown,
  ExternalLink, RefreshCw, Search, Loader2, Globe, Clock,
} from 'lucide-react';
import { eventsApi } from '../services/api';
import type { DiscoveredEvent } from '../services/api';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { COUNTRIES } from '../components/layout/CountryPicker';
import clsx from 'clsx';
import FavoriteButton from '../components/ui/FavoriteButton';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DBEvent {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  city?: string;
  country?: string;
  startDate: string;
  endDate?: string;
  category: string;
  status: string;
  isFree: boolean;
  price?: number;
  currency?: string;
  ticketUrl?: string;
  imageUrl?: string;
  _count?: { attendees: number };
}

// ── Constants ──────────────────────────────────────────────────────────────────
const AFRICAN_COUNTRIES = [
  'Algeria','Angola','Botswana','Cameroon','Democratic Republic of the Congo',
  'Egypt','Ethiopia','Ghana','Ivory Coast','Kenya','Madagascar','Morocco',
  'Mozambique','Nigeria','Rwanda','Senegal','South Africa','Tanzania',
  'Tunisia','Uganda','Zambia','Zimbabwe','Uganda','Ethiopia','Sudan',
  "Côte d'Ivoire",'Burkina Faso','Mali','Niger','Togo','Benin','Gabon',
  'Congo','Namibia','Malawi','Zambia','Eritrea','Mauritius','Reunion',
].filter((v,i,a) => a.indexOf(v) === i).sort();

const CATEGORIES = ['Music','Sports','Food','Business','Culture','Tech','Other'];

const CAT_EMOJI: Record<string, string> = {
  Music: '🎵', Sports: '⚽', Food: '🍽️', Business: '💼',
  Culture: '🎭', Tech: '💻', Other: '🎪',
};

const CATEGORY_COLORS: Record<string, string> = {
  Music: 'from-purple-400 to-pink-500', Sports: 'from-green-400 to-emerald-600',
  Food: 'from-orange-400 to-amber-500', Business: 'from-blue-400 to-indigo-500',
  Culture: 'from-yellow-400 to-orange-500', Tech: 'from-cyan-400 to-blue-500',
  Other: 'from-gray-400 to-gray-600',
};

function formatDate(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function isUpcoming(d: string) {
  return new Date(d).getTime() >= Date.now() - 86400_000; // within last 24h still shows
}

// ── Discovered event card ─────────────────────────────────────────────────────
function DiscoveredCard({ event }: { event: DiscoveredEvent }) {
  const cat = event.category ?? 'Other';
  const gradient = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other;
  const url = event.ticketUrl || event.sourceUrl;
  const upcoming = isUpcoming(event.startDate);

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton id={event.id ?? url} type="event" name={event.title} size={14} />
      </div>
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* 4:3 image */}
      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
        {event.imageUrl ? (
          <img
            src={event.imageUrl} alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-1`}>
            <span className="text-4xl">{CAT_EMOJI[cat] ?? '🎪'}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        {/* Category + upcoming badge */}
        <div className="flex items-center gap-2">
          {cat !== 'Other' && (
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
              {CAT_EMOJI[cat]} {cat}
            </span>
          )}
          {upcoming && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Upcoming</span>
          )}
        </div>

        <h3 className="font-black text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors">
          {event.title}
        </h3>

        {(event.venue || event.city) && (
          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
            <MapPin size={11} className="shrink-0" />
            {[event.venue, event.city, event.country].filter(Boolean).join(', ')}
          </p>
        )}

        <p className="text-xs text-purple-600 font-semibold flex items-center gap-1">
          <Calendar size={11} /> {formatDate(event.startDate)}
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {event.isFree ? (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>
            ) : event.price ? (
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Ticket size={10} /> {event.price}
              </span>
            ) : null}
          </div>
          {/* Source credit — always visible */}
          <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
            <Globe size={9} />
            {event.sourceName}
            <ExternalLink size={9} className="opacity-60" />
          </span>
        </div>
      </div>
    </a>
    </div>
  );
}

// ── DB event card (community-submitted) ──────────────────────────────────────
function DBEventCard({ event, onAttend, attending }: { event: DBEvent; onAttend: (id: string) => void; attending: boolean }) {
  const cat = event.category ?? 'Other';
  const gradient = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other;

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton id={event.id} type="event" name={event.title} size={14} />
      </div>
      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-4xl">{CAT_EMOJI[cat] ?? '🎪'}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          {event.status === 'FEATURED' && (
            <span className="text-[11px] font-black bg-cyan-100 text-cyan-700 px-2.5 py-0.5 rounded-full">FEATURED</span>
          )}
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">Community</span>
        </div>

        <h3 className="font-black text-gray-900 text-sm leading-snug line-clamp-2">{event.title}</h3>

        {event.venue && (
          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
            <MapPin size={11} className="shrink-0" /> {event.venue}
          </p>
        )}
        {(event.city || event.country) && (
          <p className="text-xs text-gray-400">{[event.city, event.country].filter(Boolean).join(', ')}</p>
        )}

        <p className="text-xs text-purple-600 font-semibold flex items-center gap-1">
          <Calendar size={11} /> {formatDate(event.startDate)}
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {event.isFree ? (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>
            ) : event.price ? (
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Ticket size={11} /> {event.currency ?? '$'}{event.price}
              </span>
            ) : null}
            {(event._count?.attendees ?? 0) > 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Users size={11} /> {event._count!.attendees}
              </span>
            )}
          </div>

          {event.ticketUrl && (
            <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1">
              Tickets <ExternalLink size={10} />
            </a>
          )}
          {!event.ticketUrl && (
            <button
              onClick={() => onAttend(event.id)}
              disabled={attending}
              className={clsx(
                'text-xs font-bold px-3 py-1.5 rounded-xl transition-colors',
                attending ? 'bg-green-100 text-green-700 cursor-default' : 'bg-purple-600 text-white hover:bg-purple-700'
              )}
            >
              {attending ? '✓ Going' : 'Going'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { user }        = useAuthStore();
  const { countryCode } = useThemeStore();

  const [dbEvents,          setDbEvents]          = useState<DBEvent[]>([]);
  const [discovered,        setDiscovered]         = useState<DiscoveredEvent[]>([]);
  const [loadingDb,         setLoadingDb]          = useState(true);
  const [loadingDiscover,   setLoadingDiscover]    = useState(true);
  const [refreshing,        setRefreshing]         = useState(false);
  const [country,           setCountry]            = useState('');
  const [category,          setCategory]           = useState('');
  const [search,            setSearch]             = useState('');
  const [attending,         setAttending]          = useState<Set<string>>(new Set());
  const [showSubmitForm,    setShowSubmitForm]      = useState(false);
  const [submitError,       setSubmitError]        = useState('');
  const [submitSuccess,     setSubmitSuccess]      = useState(false);
  const [submitting,        setSubmitting]         = useState(false);
  const [tab,               setTab]                = useState<'discovered' | 'community'>('discovered');

  const [form, setForm] = useState({
    title: '', description: '', startDate: '', endDate: '',
    venue: '', city: '', country: '', category: 'Other',
    isFree: true, price: '', ticketUrl: '',
  });
  const setF = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  // Auto-detect user's country
  useEffect(() => {
    const mapped = countryCode ? (COUNTRIES.find(c => c.code === countryCode)?.name || '') : '';
    setCountry(mapped);
  }, [countryCode]);

  // Load DB events
  const loadDbEvents = useCallback(async () => {
    setLoadingDb(true);
    try {
      const params: Record<string, string> = { status: 'APPROVED,FEATURED', limit: '30' };
      if (country) params.country = country;
      if (category) params.category = category;
      const res = await eventsApi.list(params);
      setDbEvents((res.data as { events: DBEvent[] })?.events ?? (res.data as DBEvent[]) ?? []);
    } catch { setDbEvents([]); }
    finally { setLoadingDb(false); }
  }, [country, category]);

  // Load discovered events
  const loadDiscovered = useCallback(async (force = false) => {
    setLoadingDiscover(true);
    try {
      const res = await eventsApi.discover({
        country:  country  || undefined,
        category: category || undefined,
        q:        search.trim() || undefined,
        limit:    60,
        refresh:  force ? '1' : undefined,
      });
      setDiscovered(res.data.events ?? []);
    } catch { setDiscovered([]); }
    finally { setLoadingDiscover(false); setRefreshing(false); }
  }, [country, category, search]);

  useEffect(() => { loadDbEvents(); },           [loadDbEvents]);
  useEffect(() => { loadDiscovered(); },         [loadDiscovered]);

  const handleRefresh = () => { setRefreshing(true); loadDiscovered(true); };

  const handleAttend = async (id: string) => {
    if (!user) return;
    setAttending(prev => new Set([...prev, id]));
    try { await eventsApi.attend(id); } catch { /* ignore */ }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setSubmitError('');
    try {
      await eventsApi.create({
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate:   form.endDate ? new Date(form.endDate).toISOString() : undefined,
        price:     form.isFree ? undefined : parseFloat(form.price) || undefined,
      });
      setSubmitSuccess(true); setShowSubmitForm(false);
      loadDbEvents();
    } catch (err: unknown) {
      setSubmitError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  // Client-side filter for search on DB events
  const filteredDb = search.trim()
    ? dbEvents.filter(e => {
        const q = search.toLowerCase();
        return [e.title, e.city, e.venue, e.country, e.category].some(f => f?.toLowerCase().includes(q));
      })
    : dbEvents;

  // Discovered already filtered server-side, but apply local search too
  const filteredDiscovered = search.trim()
    ? discovered.filter(e => {
        const terms = search.toLowerCase().split(/\s+/);
        const blob = [e.title, e.description, e.city, e.country, e.category, e.venue, e.sourceName].join(' ').toLowerCase();
        return terms.every(t => blob.includes(t));
      })
    : discovered;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-4">

        {submitSuccess && (
          <p className="mb-3 text-sm bg-purple-50 border border-purple-200 text-purple-700 rounded-xl px-4 py-2 inline-block">
            ✓ Event submitted! It will appear after review.
          </p>
        )}

        {/* ── Filter bar ── */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-5">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2.5 focus-within:border-purple-400 transition-colors min-w-0">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search concerts, festivals, Lagos…"
              className="flex-1 min-w-0 outline-none text-sm bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 shrink-0">×</button>
            )}
          </div>

          {/* Country */}
          <div className="relative">
            <select
              value={country} onChange={e => setCountry(e.target.value)}
              className="appearance-none border border-gray-200 rounded-xl pl-4 pr-8 py-2.5 text-sm outline-none focus:border-purple-400 bg-white"
            >
              <option value="">All countries</option>
              {AFRICAN_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh} disabled={refreshing || loadingDiscover}
            title="Refresh discovered events"
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500 hover:text-purple-600 disabled:opacity-40"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Submit */}
          {user && (
            <button
              onClick={() => setShowSubmitForm(s => !s)}
              className="shrink-0 inline-flex items-center gap-1.5 bg-purple-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-purple-700 text-sm transition-colors"
            >
              <Plus size={15} /> Submit Event
            </button>
          )}
        </div>

        {/* ── Category chips ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-3">
          <button
            onClick={() => setCategory('')}
            className={clsx('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              !category ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300')}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat} onClick={() => setCategory(cat === category ? '' : cat)}
              className={clsx('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                category === cat ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300')}
            >
              {CAT_EMOJI[cat]} {cat}
            </button>
          ))}
        </div>

        {/* ── Tab toggle ── */}
        <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
          <button
            onClick={() => setTab('discovered')}
            className={clsx('px-4 pb-3 text-sm font-bold border-b-2 transition-colors -mb-px',
              tab === 'discovered' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
          >
            🌍 Discovered
            {!loadingDiscover && filteredDiscovered.length > 0 && (
              <span className="ml-1.5 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">{filteredDiscovered.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('community')}
            className={clsx('px-4 pb-3 text-sm font-bold border-b-2 transition-colors -mb-px',
              tab === 'community' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
          >
            👥 Community
            {!loadingDb && filteredDb.length > 0 && (
              <span className="ml-1.5 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">{filteredDb.length}</span>
            )}
          </button>
        </div>

        {/* ── Discovered events tab ── */}
        {tab === 'discovered' && (
          <>
            {/* Attribution note */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Globe size={11} />
                Events sourced from Eventbrite, TimeOut, Pulse, OkayAfrica and 25+ African publishers · links go directly to source
              </p>
              {!loadingDiscover && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={10} /> cached 1h
                </span>
              )}
            </div>

            {loadingDiscover ? (
              <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
                <Loader2 size={28} className="animate-spin" />
                <p className="text-sm">Discovering African events…</p>
                <p className="text-xs text-gray-300">Checking 30+ sources across the continent</p>
              </div>
            ) : filteredDiscovered.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🌍</div>
                <p className="text-gray-500 font-semibold">No discovered events match your filters</p>
                <p className="text-sm text-gray-400 mt-1">Try a different country or category</p>
                <button onClick={handleRefresh} className="mt-4 inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-2xl hover:bg-purple-700">
                  <RefreshCw size={15} /> Refresh sources
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDiscovered.map(event => (
                  <DiscoveredCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Community events tab ── */}
        {tab === 'community' && (
          <>
            {loadingDb ? (
              <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
                <p className="text-sm">Loading community events…</p>
              </div>
            ) : filteredDb.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🎪</div>
                <p className="text-gray-500 text-lg font-semibold">No community events yet</p>
                <p className="text-gray-400 text-sm mt-1">Be the first to submit one!</p>
                {user && (
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-purple-700"
                  >
                    <Plus size={18} /> Submit an Event
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDb.map(event => (
                  <DBEventCard
                    key={event.id} event={event}
                    onAttend={handleAttend}
                    attending={attending.has(event.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Submit form ── */}
        {showSubmitForm && user && (
          <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-black text-gray-900 mb-5">Submit an Event</h2>
            <form onSubmit={handleSubmitEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Title *</label>
                <input required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                  placeholder="Event name" value={form.title} onChange={e => setF('title', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white resize-none"
                  placeholder="Tell people what to expect…" value={form.description} onChange={e => setF('description', e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Start Date & Time *</label>
                  <input required type="datetime-local" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                    value={form.startDate} onChange={e => setF('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">End Date & Time</label>
                  <input type="datetime-local" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                    value={form.endDate} onChange={e => setF('endDate', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Venue</label>
                <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                  placeholder="Venue name or address" value={form.venue} onChange={e => setF('venue', e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">City *</label>
                  <input required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                    placeholder="Nairobi" value={form.city} onChange={e => setF('city', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Country *</label>
                  <select required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                    value={form.country} onChange={e => setF('country', e.target.value)}>
                    <option value="">Select country…</option>
                    {AFRICAN_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button" onClick={() => setF('category', cat)}
                      className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                        form.category === cat ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}>
                      {CAT_EMOJI[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.isFree} onChange={e => setF('isFree', e.target.checked)} className="w-4 h-4 accent-purple-600" />
                  Free event
                </label>
                {!form.isFree && (
                  <input type="number" min="0" step="0.01" placeholder="Price (USD)"
                    className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-400 bg-white w-32"
                    value={form.price} onChange={e => setF('price', e.target.value)} />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Ticket URL</label>
                <input type="url" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                  placeholder="https://tickets.example.com" value={form.ticketUrl} onChange={e => setF('ticketUrl', e.target.value)} />
              </div>
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{submitError}</div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 rounded-2xl font-black text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 transition-colors">
                  {submitting ? 'Submitting…' : 'Submit Event'}
                </button>
                <button type="button" onClick={() => setShowSubmitForm(false)}
                  className="px-6 py-3 rounded-2xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
