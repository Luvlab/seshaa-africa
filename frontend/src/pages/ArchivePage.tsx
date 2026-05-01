/**
 * Seshaa Archive — fully searchable historical news database.
 * Full viewport width. All strings via i18n.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Filter, X, ChevronLeft, ChevronRight,
  ExternalLink, Globe2, Layers, Database, RefreshCw, BookOpen,
} from 'lucide-react';
import clsx from 'clsx';
import SeshaaTitle from '../components/brand/SeshaaTitle';
import { useThemeStore } from '../store/theme';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

const CATEGORY_IDS = [
  '','general','politics','business','technology','health',
  'sports','entertainment','agriculture','finance','travel',
];
const CATEGORY_EMOJIS: Record<string,string> = {
  '':'🗂️', general:'🌍', politics:'🏛️', business:'📈', technology:'💻', health:'🏥',
  sports:'⚽', entertainment:'🎭', agriculture:'🌾', finance:'💰', travel:'✈️',
};

interface ArchiveItem {
  id: string; title: string; link: string; summary?: string; image?: string;
  source: string; country: string; category: string; publishedAt: string; archivedAt: string; lang: string;
}
interface ArchiveResponse { total: number; page: number; limit: number; pages: number; items: ArchiveItem[]; }
interface Stats {
  total: number;
  byCategory: { category: string; _count: { _all: number } }[];
  byCountry:  { country:  string; _count: { _all: number } }[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const h = Math.floor(diff / 3600000);
  if (h < 24)     return `${h}h ago`;
  const d = Math.floor(diff / 86400000);
  if (d < 30)     return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function ArchiveCard({ item }: { item: ArchiveItem }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer"
      className="group flex gap-3 p-3 hover:bg-white hover:shadow-sm transition-all border-b border-gray-100">
      {item.image && !imgErr ? (
        <img src={item.image} alt="" className="w-20 h-16 object-cover shrink-0 bg-gray-100"
          onError={() => setImgErr(true)} />
      ) : (
        <div className="w-20 h-16 shrink-0 bg-gray-100 flex items-center justify-center text-2xl">
          {CATEGORY_EMOJIS[item.category] ?? '📰'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:underline leading-snug">
          {item.title}
        </h3>
        {item.summary && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.summary}</p>}
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

function StatBadge({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-3 bg-white border-r border-gray-100 last:border-0">
      <span className="text-xl">{emoji}</span>
      <span className="text-lg font-bold text-gray-800">{Number(value).toLocaleString()}</span>
      <span className="text-xs text-gray-500 text-center">{label}</span>
    </div>
  );
}

export default function ArchivePage() {
  const { t } = useTranslation();
  const { countryCode } = useThemeStore();

  const [q, setQ]               = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry]   = useState('');
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [data, setData]         = useState<ArchiveResponse | null>(null);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  const [committed, setCommitted] = useState({ q: '', category: '', country: '', from: '', to: '', page: 1 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API}/news/archive/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .finally(() => setStatsLoading(false));
  }, []);

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
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { doSearch(committed); }, [committed, doSearch]);

  const commit = (newPage = 1) => {
    setCommitted({ q, category, country, from, to, page: newPage });
  };

  const clearFilters = () => {
    setQ(''); setCategory(''); setCountry(''); setFrom(''); setTo('');
    setCommitted({ q: '', category: '', country: '', from: '', to: '', page: 1 });
  };

  const hasFilters = q || category || country || from || to;

  return (
    <div className="w-full min-h-screen bg-gray-50">

      {/* ── Masthead — full width ── */}
      <div className="w-full text-white py-8 px-6 sm:px-8 lg:px-12" style={{ background: 'var(--cp)' }}>
        <div className="flex items-center gap-3 mb-2">
          <SeshaaTitle countryCode={countryCode} size="lg" staticSuffix="archive" />
        </div>
        <p className="text-white/80 text-sm mb-5">{t('archive.subtitle')}</p>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2.5 gap-2 transition-colors">
            <Search size={16} className="text-white/70 shrink-0" />
            <input ref={inputRef}
              className="bg-transparent text-white placeholder-white/60 outline-none flex-1 text-sm"
              placeholder={t('archive.search')}
              value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(1); }} />
            {q && (
              <button onClick={() => { setQ(''); inputRef.current?.focus(); }} className="text-white/60 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => commit(1)}
            className="px-5 py-2.5 bg-white font-semibold text-sm rounded-xl hover:bg-white/90 transition-colors"
            style={{ color: 'var(--cp)' }}>
            {t('search.searchBtn')}
          </button>
          <button onClick={() => setFiltersOpen(v => !v)}
            className={clsx('px-3 py-2.5 rounded-xl border transition-colors flex items-center gap-1.5 text-sm font-medium',
              filtersOpen || (category || country || from || to)
                ? 'bg-white text-gray-800 border-white'
                : 'bg-white/20 text-white border-white/30 hover:bg-white/30')}>
            <Filter size={14} />
            <span className="hidden sm:inline">{t('archive.filters')}</span>
            {(category || country || from || to) && (
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
            )}
          </button>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="mt-3 bg-white/15 backdrop-blur rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">{t('archive.category')}</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none">
                {CATEGORY_IDS.map(id => (
                  <option key={id} value={id} className="text-gray-800">
                    {id === '' ? t('archive.allCategories') : t(`news.categories.${id}`, id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">{t('archive.country')}</label>
              <input type="text" placeholder="e.g. Nigeria" value={country} onChange={e => setCountry(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commit(1); }}
                className="w-full bg-white/20 text-white placeholder-white/50 rounded-lg px-3 py-1.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">{t('archive.from')}</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="w-full bg-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">{t('archive.to')}</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="w-full bg-white/20 text-white rounded-lg px-3 py-1.5 text-sm outline-none" />
            </div>
            <div className="col-span-2 sm:col-span-4 flex justify-end gap-2 mt-1">
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-white/70 hover:text-white flex items-center gap-1">
                  <X size={12} /> {t('archive.clearAll')}
                </button>
              )}
              <button onClick={() => { commit(1); setFiltersOpen(false); }}
                className="px-4 py-1.5 bg-white text-sm font-semibold rounded-lg" style={{ color: 'var(--cp)' }}>
                {t('archive.apply')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats bar — full width ── */}
      <div className="w-full bg-white border-b border-gray-100 overflow-x-auto scrollbar-none">
        {statsLoading ? (
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-28 h-16 bg-gray-100 animate-pulse border-r border-gray-200 flex-shrink-0" />
            ))}
          </div>
        ) : stats ? (
          <div className="flex">
            <StatBadge emoji="📰" label={t('archive.totalArticles')} value={stats.total} />
            {stats.byCategory.slice(0, 6).map(c => (
              <StatBadge key={c.category}
                emoji={CATEGORY_EMOJIS[c.category] ?? '📋'}
                label={t(`news.categories.${c.category}`, c.category)}
                value={c._count._all}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Category pills — full width ── */}
      <div className="w-full px-4 sm:px-6 lg:px-10 py-3 bg-white border-b border-gray-100">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {CATEGORY_IDS.map(id => (
            <button key={id}
              onClick={() => setCommitted(prev => ({ ...prev, category: id, page: 1 }))}
              className={clsx('flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                category === id ? 'text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200')}
              style={category === id ? { backgroundColor: 'var(--cp)' } : {}}>
              <span>{CATEGORY_EMOJIS[id]}</span>
              {id === '' ? t('archive.allCategories') : t(`news.categories.${id}`, id)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results — full width two-column grid ── */}
      <div className="w-full px-4 sm:px-6 lg:px-10 py-4">
        {/* Result header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {loading
              ? <RefreshCw size={14} className="animate-spin text-gray-400" />
              : <Database size={14} className="text-gray-400" />}
            <span className="text-sm text-gray-500">
              {loading
                ? t('archive.searching')
                : data
                  ? t('archive.total', { count: data.total })
                  : t('archive.emptyTitle')}
            </span>
          </div>
          {data && data.pages > 1 && (
            <span className="text-xs text-gray-400">
              {t('archive.page', { page: data.page, pages: data.pages })}
            </span>
          )}
        </div>

        {/* Empty/loading/results */}
        {!loading && !data && (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold text-gray-600 mb-1">{t('archive.emptyTitle')}</p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">{t('archive.emptyBody')}</p>
          </div>
        )}

        {!loading && data && data.items.length === 0 && (
          <div className="text-center py-16">
            <Search size={40} className="mx-auto mb-3 opacity-30 text-gray-400" />
            <p className="font-semibold text-gray-600">{t('archive.noResults')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('archive.noResultsBody')}</p>
            <button onClick={clearFilters} className="mt-3 text-sm font-medium hover:underline" style={{ color: 'var(--cp)' }}>
              {t('archive.clearFilters')}
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 bg-gray-100">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex gap-3 p-3 animate-pulse bg-white border-b border-r border-gray-100">
                <div className="w-20 h-16 bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-4/5" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-l border-gray-100">
              {data.items.map(item => <ArchiveCard key={item.id} item={item} />)}
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => commit(data.page - 1)} disabled={data.page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-40">
                  <ChevronLeft size={14} /> {t('archive.prev')}
                </button>
                {(() => {
                  const start = Math.max(1, data.page - 2);
                  const end   = Math.min(data.pages, start + 4);
                  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                    <button key={p} onClick={() => commit(p)}
                      className={clsx('w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                        p === data.page ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300')}
                      style={p === data.page ? { backgroundColor: 'var(--cp)' } : {}}>
                      {p}
                    </button>
                  ));
                })()}
                <button onClick={() => commit(data.page + 1)} disabled={data.page >= data.pages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-40">
                  {t('archive.next')} <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Stats panels — full width two-column ── */}
      {stats && !loading && (
        <div className="w-full px-4 sm:px-6 lg:px-10 pb-8 grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-200 mt-2">
          {/* By country */}
          <div className="bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe2 size={15} style={{ color: 'var(--cp)' }} />
              <span className="font-semibold text-gray-700 text-sm">{t('archive.byCountry')}</span>
            </div>
            <div className="space-y-2">
              {stats.byCountry.slice(0, 12).map(row => {
                const pct = Math.round((row._count._all / stats.byCountry[0]._count._all) * 100);
                return (
                  <div key={row.country} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-32 truncate">{row.country}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--cp)' }} />
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right">{row._count._all.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* By category */}
          <div className="bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={15} style={{ color: 'var(--cp)' }} />
              <span className="font-semibold text-gray-700 text-sm">{t('archive.byCategory')}</span>
            </div>
            <div className="space-y-2">
              {stats.byCategory.map(row => {
                const pct = Math.round((row._count._all / stats.byCategory[0]._count._all) * 100);
                return (
                  <div key={row.category} className="flex items-center gap-2">
                    <span className="text-base leading-none">{CATEGORY_EMOJIS[row.category] ?? '📋'}</span>
                    <span className="text-xs text-gray-600 w-28 truncate">{t(`news.categories.${row.category}`, row.category)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--cs, var(--cp))' }} />
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right">{row._count._all.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center py-6 px-4">{t('archive.attribution')}</p>
    </div>
  );
}
