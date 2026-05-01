/**
 * Seshaa Archive — fully searchable historical news database.
 * Stores every headline scraped across all categories, forever.
 * Search by keyword · category · country · source · date range.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Filter, X, ChevronLeft, ChevronRight,
  ExternalLink, Calendar, Globe2, Layers, Database,
  TrendingUp, RefreshCw, BookOpen,
} from 'lucide-react';
import clsx from 'clsx';
import SeshaaTitle from '../components/brand/SeshaaTitle';
import { useThemeStore } from '../store/theme';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

const CATEGORIES = [
  { id: '',              label: 'All Categories', emoji: '🗂️' },
  { id: 'general',      label: 'Top Stories',    emoji: '🌍' },
  { id: 'politics',     label: 'Politics',       emoji: '🏛️' },
  { id: 'business',     label: 'Business',       emoji: '📈' },
  { id: 'technology',   label: 'Technology',     emoji: '💻' },
  { id: 'health',       label: 'Health',         emoji: '🏥' },
  { id: 'sports',       label: 'Sports',         emoji: '⚽' },
  { id: 'entertainment',label: 'Entertainment',  emoji: '🎭' },
  { id: 'agriculture',  label: 'Agriculture',    emoji: '🌾' },
  { id: 'finance',      label: 'Finance',        emoji: '💰' },
  { id: 'travel',       label: 'Travel',         emoji: '✈️' },
];

interface ArchiveItem {
  id: string;
  title: string;
  link: string;
  summary?: string;
  image?: string;
  source: string;
  country: string;
  category: string;
  publishedAt: string;
  archivedAt: string;
  lang: string;
}

interface ArchiveResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: ArchiveItem[];
}

interface Stats {
  total: number;
  byCategory: { category: string; _count: { _all: number } }[];
  byCountry:  { country: string;  _count: { _all: number } }[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Single archive card ───────────────────────────────────────────────────────
function ArchiveCard({ item }: { item: ArchiveItem }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 p-3 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100"
    >
      {item.image && !imgErr ? (
        <img
          src={item.image}
          alt=""
          className="w-20 h-16 object-cover rounded-lg shrink-0 bg-gray-100"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="w-20 h-16 rounded-lg shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl">
          {CATEGORIES.find(c => c.id === item.category)?.emoji ?? '📰'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:underline leading-snug">
          {item.title}
        </h3>
        {item.summary && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.summary}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--cp)' }}>{item.source}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{item.country}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{timeAgo(item.publishedAt)}</span>
          <ExternalLink size={10} className="text-gray-300 group-hover:text-gray-400 ms-auto shrink-0" />
        </div>
      </div>
    </a>
  );
}

// ── Stat badge ────────────────────────────────────────────────────────────────
function StatBadge({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100">
      <span className="text-xl">{emoji}</span>
      <span className="text-lg font-bold text-gray-800">{value.toLocaleString()}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ArchivePage() {
  const { countryCode } = useThemeStore();

  // Search state
  const [q, setQ]             = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [page, setPage]       = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Result state
  const [data, setData]       = useState<ArchiveResponse | null>(null);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Active search (committed — only updates on Enter / search button)
  const [committed, setCommitted] = useState({ q: '', category: '', country: '', from: '', to: '', page: 1 });

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch stats once on mount
  useEffect(() => {
    fetch(`${API}/news/archive/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .finally(() => setStatsLoading(false));
  }, []);

  // Search when committed state changes
  const doSearch = useCallback(async (params: typeof committed) => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (params.q)        qs.set('q', params.q);
    if (params.category) qs.set('category', params.category);
    if (params.country)  qs.set('country', params.country);
    if (params.from)     qs.set('from', params.from);
    if (params.to)       qs.set('to', params.to);
    qs.set('page', String(params.page));
    qs.set('limit', '24');
    try {
      const r = await fetch(`${API}/news/archive?${qs}`);
      if (r.ok) setData(await r.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    doSearch(committed);
  }, [committed, doSearch]);

  // On mount: show latest without query
  useEffect(() => {
    // triggered by initial committed state
  }, []);

  const commit = (newPage = 1) => {
    setPage(newPage);
    setCommitted({ q, category, country, from, to, page: newPage });
  };

  const clearFilters = () => {
    setQ(''); setCategory(''); setCountry(''); setFrom(''); setTo('');
    setCommitted({ q: '', category: '', country: '', from: '', to: '', page: 1 });
  };

  const hasFilters = q || category || country || from || to;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <div className="text-white py-8 px-4" style={{ background: 'var(--cp)' }}>
        <div className="max-w-5xl mx-auto">
          {/* Title */}
          <div className="flex items-center gap-3 mb-2">
            <SeshaaTitle countryCode={countryCode} size="lg" staticSuffix="archive" />
          </div>
          <p className="text-white/80 text-sm mb-5">
            Every headline scraped from 100+ African publications — searchable forever.
          </p>

          {/* Main search bar */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2.5 gap-2 transition-colors">
              <Search size={16} className="text-white/70 shrink-0" />
              <input
                ref={inputRef}
                className="bg-transparent text-white placeholder-white/60 outline-none flex-1 text-sm"
                placeholder="Search headlines, topics, sources…"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commit(1); }}
              />
              {q && (
                <button onClick={() => { setQ(''); inputRef.current?.focus(); }} className="text-white/60 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => commit(1)}
              className="px-5 py-2.5 bg-white font-semibold text-sm rounded-xl hover:bg-white/90 transition-colors"
              style={{ color: 'var(--cp)' }}
            >
              Search
            </button>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={clsx(
                'px-3 py-2.5 rounded-xl border transition-colors flex items-center gap-1.5 text-sm font-medium',
                filtersOpen || (category || country || from || to)
                  ? 'bg-white text-gray-800 border-white'
                  : 'bg-white/20 text-white border-white/30 hover:bg-white/30',
              )}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">Filters</span>
              {(category || country || from || to) && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
              )}
            </button>
          </div>

          {/* Expandable filter strip */}
          {filtersOpen && (
            <div className="mt-3 bg-white/15 backdrop-blur rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Category */}
              <div>
                <label className="text-xs text-white/70 font-medium block mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id} className="text-gray-800">{c.label}</option>
                  ))}
                </select>
              </div>
              {/* Country */}
              <div>
                <label className="text-xs text-white/70 font-medium block mb-1">Country</label>
                <input
                  type="text"
                  placeholder="e.g. Nigeria"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commit(1); }}
                  className="w-full bg-white/20 text-white placeholder-white/50 rounded-lg px-3 py-1.5 text-sm outline-none"
                />
              </div>
              {/* From date */}
              <div>
                <label className="text-xs text-white/70 font-medium block mb-1">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="w-full bg-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                />
              </div>
              {/* To date */}
              <div>
                <label className="text-xs text-white/70 font-medium block mb-1">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="w-full bg-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                />
              </div>
              {/* Action row */}
              <div className="col-span-2 sm:col-span-4 flex justify-end gap-2 mt-1">
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-white/70 hover:text-white flex items-center gap-1">
                    <X size={12} /> Clear all
                  </button>
                )}
                <button
                  onClick={() => { commit(1); setFiltersOpen(false); }}
                  className="px-4 py-1.5 bg-white text-sm font-semibold rounded-lg"
                  style={{ color: 'var(--cp)' }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-5">
        {statsLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-24 h-16 rounded-xl bg-gray-200 animate-pulse shrink-0" />
            ))}
          </div>
        ) : stats ? (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            <StatBadge emoji="📰" label="Total Articles" value={stats.total.toLocaleString()} />
            {stats.byCategory.slice(0, 5).map(c => (
              <StatBadge
                key={c.category}
                emoji={CATEGORIES.find(x => x.id === c.category)?.emoji ?? '📋'}
                label={CATEGORIES.find(x => x.id === c.category)?.label ?? c.category}
                value={c._count._all}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Category pills ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => { setCategory(c.id); setCommitted(prev => ({ ...prev, category: c.id, page: 1 })); }}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                category === c.id
                  ? 'text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200',
              )}
              style={category === c.id ? { backgroundColor: 'var(--cp)' } : {}}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {/* Result header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {loading ? (
              <RefreshCw size={14} className="animate-spin text-gray-400" />
            ) : (
              <Database size={14} className="text-gray-400" />
            )}
            <span className="text-sm text-gray-500">
              {loading ? 'Searching…' : data
                ? `${data.total.toLocaleString()} archived articles`
                : 'Start searching the archive'}
            </span>
          </div>
          {data && data.pages > 1 && (
            <span className="text-xs text-gray-400">
              Page {data.page} of {data.pages}
            </span>
          )}
        </div>

        {/* Empty state - no data yet */}
        {!loading && !data && (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold text-gray-600 mb-1">Seshaa Archive</p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Every article scraped from 100+ African news sources, stored permanently.
              Search by keyword, filter by category, country, or date.
            </p>
          </div>
        )}

        {/* Empty search result */}
        {!loading && data && data.items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-gray-600">No articles found</p>
            <p className="text-sm mt-1">Try broader terms or remove filters</p>
            <button onClick={clearFilters} className="mt-3 text-sm font-medium hover:underline" style={{ color: 'var(--cp)' }}>
              Clear all filters
            </button>
          </div>
        )}

        {/* Skeleton loader */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex gap-3 p-3 animate-pulse">
                <div className="w-20 h-16 rounded-lg bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-4/5" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results grid */}
        {!loading && data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {data.items.map(item => (
                <ArchiveCard key={item.id} item={item} />
              ))}
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => commit(data.page - 1)}
                  disabled={data.page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                {/* Page numbers — show 5 around current */}
                {(() => {
                  const start = Math.max(1, data.page - 2);
                  const end   = Math.min(data.pages, start + 4);
                  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                    <button
                      key={p}
                      onClick={() => commit(p)}
                      className={clsx(
                        'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                        p === data.page
                          ? 'text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300',
                      )}
                      style={p === data.page ? { backgroundColor: 'var(--cp)' } : {}}
                    >
                      {p}
                    </button>
                  ));
                })()}

                <button
                  onClick={() => commit(data.page + 1)}
                  disabled={data.page >= data.pages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Sidebar stats — most active countries/sources, shown below on mobile */}
        {stats && !loading && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Top countries */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe2 size={15} style={{ color: 'var(--cp)' }} />
                <span className="font-semibold text-gray-700 text-sm">Coverage by Country</span>
              </div>
              <div className="space-y-2">
                {stats.byCountry.slice(0, 10).map(row => {
                  const pct = Math.round((row._count._all / stats.byCountry[0]._count._all) * 100);
                  return (
                    <div key={row.country} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-28 truncate">{row.country}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--cp)' }} />
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right">{row._count._all.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top categories */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={15} style={{ color: 'var(--cp)' }} />
                <span className="font-semibold text-gray-700 text-sm">Coverage by Category</span>
              </div>
              <div className="space-y-2">
                {stats.byCategory.map(row => {
                  const cat = CATEGORIES.find(c => c.id === row.category);
                  const pct = Math.round((row._count._all / stats.byCategory[0]._count._all) * 100);
                  return (
                    <div key={row.category} className="flex items-center gap-2">
                      <span className="text-base leading-none">{cat?.emoji ?? '📋'}</span>
                      <span className="text-xs text-gray-600 w-24 truncate">{cat?.label ?? row.category}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--cs, var(--cp))' }} />
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right">{row._count._all.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Attribution */}
        <p className="text-xs text-gray-400 text-center mt-8 pb-4">
          All content © their respective publishers. Seshaa Archive indexes headlines and links only.
          Click any article to read the full story at the source.
        </p>
      </div>
    </div>
  );
}
