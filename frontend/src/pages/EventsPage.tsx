import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Ticket, Plus, ChevronDown } from 'lucide-react';
import { eventsApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { COUNTRIES } from '../components/layout/CountryPicker';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Event {
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

// ── Constants ─────────────────────────────────────────────────────────────────
const AFRICAN_COUNTRIES = [
  'Algeria', 'Angola', 'Botswana', 'Cameroon', 'Democratic Republic of the Congo',
  'Egypt', 'Ethiopia', 'Ghana', 'Ivory Coast', 'Kenya', 'Madagascar', 'Morocco',
  'Mozambique', 'Nigeria', 'Rwanda', 'Senegal', 'South Africa', 'Tanzania',
  'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
];

const CATEGORIES = ['Music', 'Sports', 'Food', 'Business', 'Culture', 'Tech', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
  Music:    'from-purple-400 to-pink-500',
  Sports:   'from-green-400 to-emerald-600',
  Food:     'from-orange-400 to-amber-500',
  Business: 'from-blue-400 to-indigo-500',
  Culture:  'from-yellow-400 to-orange-500',
  Tech:     'from-cyan-400 to-blue-500',
  Other:    'from-gray-400 to-gray-600',
};

function formatDate(d: string) {
  const date = new Date(d);
  const datePart = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timePart = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} · ${timePart}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { user } = useAuthStore();
  const { countryCode } = useThemeStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [attending, setAttending] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    venue: '',
    city: '',
    country: '',
    category: 'Other',
    isFree: true,
    price: '',
    ticketUrl: '',
  });

  const setF = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const mapped = countryCode ? (COUNTRIES.find(c => c.code === countryCode)?.name || '') : '';
    setCountry(mapped);
  }, [countryCode]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, string> = { status: 'APPROVED,FEATURED', limit: '30' };
        if (country) params.country = country;
        if (category) params.category = category;
        const res = await eventsApi.list(params);
        setEvents(res.data ?? []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [country, category]);

  const filteredEvents = search.trim()
    ? events.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.city?.toLowerCase().includes(search.toLowerCase()) ||
        e.venue?.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  const handleAttend = async (id: string) => {
    if (!user) return;
    try {
      await eventsApi.attend(id);
      setAttending(prev => new Set([...prev, id]));
    } catch { /* ignore */ }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startDate || !form.city || !form.country) {
      setSubmitError('Title, start date, city and country are required.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await eventsApi.create({
        ...form,
        price: form.isFree ? undefined : parseFloat(form.price) || undefined,
      });
      setSubmitSuccess(true);
      setShowSubmitForm(false);
      setForm({ title: '', description: '', startDate: '', endDate: '', venue: '', city: '', country: '', category: 'Other', isFree: true, price: '', ticketUrl: '' });
    } catch {
      setSubmitError('Failed to submit event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {submitSuccess && (
          <p className="mb-3 text-sm bg-purple-50 border border-purple-200 text-purple-700 rounded-xl px-4 py-2 inline-block">
            Event submitted! It will appear after review.
          </p>
        )}
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full sm:w-auto sm:flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 bg-white"
          />

          {/* Country */}
          <div className="relative w-full sm:w-auto">
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="appearance-none w-full sm:w-auto border border-gray-200 rounded-xl pl-4 pr-8 py-2.5 text-sm outline-none focus:border-purple-400 bg-white"
            >
              <option value="">All countries</option>
              {AFRICAN_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 flex-1">
            <button
              onClick={() => setCategory('')}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                !category ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat === category ? '' : cat)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  category === cat ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          {user && (
            <button
              onClick={() => setShowSubmitForm(s => !s)}
              className="shrink-0 inline-flex items-center gap-1.5 bg-purple-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-purple-700 text-sm transition-colors"
            >
              <Plus size={15} /> Submit Event
            </button>
          )}
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading events…</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎪</div>
            <p className="text-gray-500 text-lg font-semibold">No events yet</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to submit one!</p>
            {user && (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="mt-4 inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-purple-700 transition-colors"
              >
                <Plus size={18} /> Submit an Event
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map(event => {
              const gradient = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.Other;
              const isGoing = attending.has(event.id);
              return (
                <div key={event.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  {/* Image / placeholder */}
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className={`w-full h-40 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <span className="text-4xl">🎉</span>
                    </div>
                  )}

                  <div className="p-4 space-y-2">
                    {/* FEATURED badge */}
                    {event.status === 'FEATURED' && (
                      <span className="inline-block text-xs font-black bg-cyan-100 text-cyan-700 px-2.5 py-0.5 rounded-full">
                        FEATURED
                      </span>
                    )}

                    <h3 className="font-black text-gray-900 text-base leading-snug line-clamp-2">{event.title}</h3>

                    {event.venue && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={11} /> {event.venue}
                      </p>
                    )}
                    {(event.city || event.country) && (
                      <p className="text-xs text-gray-400">
                        {[event.city, event.country].filter(Boolean).join(', ')}
                      </p>
                    )}

                    <p className="text-xs text-purple-600 font-semibold flex items-center gap-1">
                      <Calendar size={11} /> {formatDate(event.startDate)}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {event.isFree ? (
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Free</span>
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

                      {user && (
                        <button
                          onClick={() => handleAttend(event.id)}
                          disabled={isGoing}
                          className={clsx(
                            'text-xs font-bold px-3 py-1.5 rounded-xl transition-colors',
                            isGoing
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          )}
                        >
                          {isGoing ? 'Going ✓' : 'Going'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submit form */}
        {showSubmitForm && user && (
          <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-black text-gray-900 mb-5">Submit an Event</h2>
            <form onSubmit={handleSubmitEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Title *</label>
                <input
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                  placeholder="Event name"
                  value={form.title} onChange={e => setF('title', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white resize-none"
                  placeholder="Tell people what to expect…"
                  value={form.description} onChange={e => setF('description', e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Start Date & Time *</label>
                  <input
                    required type="datetime-local"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                    value={form.startDate} onChange={e => setF('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                    value={form.endDate} onChange={e => setF('endDate', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Venue</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                  placeholder="Venue name or address"
                  value={form.venue} onChange={e => setF('venue', e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">City *</label>
                  <input
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                    placeholder="Nairobi"
                    value={form.city} onChange={e => setF('city', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Country *</label>
                  <select
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                    value={form.country} onChange={e => setF('country', e.target.value)}
                  >
                    <option value="">Select country…</option>
                    {AFRICAN_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat} type="button"
                      onClick={() => setF('category', cat)}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                        form.category === cat ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFree}
                    onChange={e => setF('isFree', e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                  Free event
                </label>
                {!form.isFree && (
                  <input
                    type="number" min="0" step="0.01"
                    className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-400 bg-white w-32"
                    placeholder="Price (USD)"
                    value={form.price} onChange={e => setF('price', e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Ticket URL</label>
                <input
                  type="url"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 bg-white"
                  placeholder="https://tickets.example.com"
                  value={form.ticketUrl} onChange={e => setF('ticketUrl', e.target.value)}
                />
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-2xl font-black text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit Event'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="px-6 py-3 rounded-2xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
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
