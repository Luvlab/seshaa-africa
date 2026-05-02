import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, Plus, Search, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { listingsApi, aiSearchApi } from '../services/api';
import ListingCard from '../components/directory/ListingCard';
import AdBanner from '../components/ads/AdBanner';
import { useThemeStore } from '../store/theme';
import type { Listing, SearchFilters } from '../types';

const TYPES = ['PERSONAL', 'BUSINESS', 'GOVERNMENT', 'NGO'] as const;
const CATEGORY_TABS = ['restaurant', 'health', 'education', 'finance', 'transport', 'hotel', 'tech', 'beauty', 'auto', 'agriculture'] as const;

export default function SearchPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { countryCode } = useThemeStore();

  const [filters, setFilters] = useState<SearchFilters>({
    q: params.get('q') || '',
    country: params.get('country') || countryCode || '',
    city: params.get('city') || '',
    category: params.get('category') || '',
    type: (params.get('type') as SearchFilters['type']) || undefined,
    page: 1,
    limit: 20,
  });

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [aiMode] = useState(params.get('ai') === '1');
  const [aiInterpretation, setAiInterpretation] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      if (aiMode && filters.q) {
        const r = await aiSearchApi.query(filters.q, { country: filters.country });
        setListings(r.data.listings);
        setTotal(r.data.listings.length);
        setAiInterpretation(r.data.interpretation);
        setAiSuggestions(r.data.suggestions);
      } else {
        const r = await listingsApi.search(filters);
        setListings(r.data.listings);
        setTotal(r.data.total);
        setPages(r.data.pages);
      }
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [filters, aiMode]);

  useEffect(() => { doSearch(); }, [doSearch]);

  // Sync URL params → filters when navigating here from another page (e.g. hero search)
  useEffect(() => {
    const qParam    = params.get('q')    || '';
    const cityParam = params.get('city') || '';
    setFilters(prev => {
      if (prev.q === qParam && prev.city === cityParam) return prev;
      return { ...prev, q: qParam, city: cityParam, page: 1 };
    });
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (params.get('country')) return;
    setFilters(prev => {
      if ((prev.country || '') === (countryCode || '')) return prev;
      const next = { ...prev, country: countryCode || '', page: 1 };
      const p = new URLSearchParams(params);
      if (countryCode) p.set('country', countryCode);
      else p.delete('country');
      setParams(p, { replace: true });
      return next;
    });
  }, [countryCode, params, setParams]);

  const update = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch, page: 1 };
    setFilters(next);
    const p = new URLSearchParams();
    if (next.q) p.set('q', next.q);
    if (next.country) p.set('country', next.country);
    if (next.city) p.set('city', next.city);
    if (next.category) p.set('category', next.category);
    if (next.type) p.set('type', next.type);
    if (aiMode) p.set('ai', '1');
    setParams(p);
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-10 py-4">
      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-xl border px-4 py-2.5 shadow-sm min-w-0">
          {aiMode ? <Sparkles size={16} className="text-purple-500 shrink-0" /> : <Search size={16} className="text-gray-400 shrink-0" />}
          <input
            className="flex-1 min-w-0 outline-none text-sm text-gray-800 placeholder-gray-400"
            placeholder={t('search.placeholder')}
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && update({ q: filters.q })}
          />
          {filters.q && (
            <button onClick={() => update({ q: '' })} className="shrink-0">
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
        <button
          className="shrink-0 px-5 rounded-xl font-semibold text-sm text-white hover:opacity-90"
          style={{ background: 'var(--cp, #008751)' }}
          onClick={() => update({ q: filters.q })}
        >
          {t('search.findBtn', { defaultValue: 'Find' })}
        </button>
        <button
          className="shrink-0 bg-white border px-3 rounded-xl hover:bg-gray-50"
          onClick={() => setShowFilters(v => !v)}
          title="More filters"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Category pills + actions row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => update({ category: '' })}
            className={clsx(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              !filters.category
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
            style={!filters.category ? { background: 'var(--cp, #008751)' } : {}}
          >
            {t('search.all')}
          </button>
          {CATEGORY_TABS.map(cat => {
            const active = filters.category === cat;
            return (
              <button
                key={cat}
                onClick={() => update({ category: cat })}
                className={clsx(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  active
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
                style={active ? { background: 'var(--cp, #008751)' } : {}}
              >
                {t(`categories.${cat}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI interpretation */}
      {aiMode && aiInterpretation && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-purple-700"><span className="font-semibold">AI:</span> {aiInterpretation}</p>
          {aiSuggestions.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {aiSuggestions.map(s => (
                <button key={s} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200"
                  onClick={() => update({ q: s })}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">{t('search.country')}</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={filters.country} onChange={e => update({ country: e.target.value })} placeholder="e.g. Nigeria" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">{t('search.city')}</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={filters.city} onChange={e => update({ city: e.target.value })} placeholder="e.g. Lagos" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">{t('search.category')}</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={filters.category} onChange={e => update({ category: e.target.value })} placeholder="e.g. health" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">{t('search.type')}</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={filters.type || ''} onChange={e => update({ type: (e.target.value as SearchFilters['type']) || undefined })}>
              <option value="">{t('search.all')}</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl h-32 animate-pulse border" />
              ))}
            </div>
          ) : listings.length ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{t('search.results', { count: total })}</p>
                <a
                  href="/add-listing"
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full text-white whitespace-nowrap"
                  style={{ background: 'var(--cp, #008751)' }}
                >
                  <Plus size={13} /> Add a Place
                </a>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {listings.map((l, i) => (
                  <React.Fragment key={l.id}>
                    <ListingCard listing={l} />
                    {(i + 1) % 8 === 0 && <div className="sm:col-span-2"><AdBanner tier="BANNER" country={filters.country} city={filters.city} /></div>}
                  </React.Fragment>
                ))}
              </div>
              {pages > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-6 flex-wrap">
                  {/* Prev */}
                  <button
                    disabled={filters.page === 1}
                    onClick={() => setFilters(f => ({ ...f, page: f.page! - 1 }))}
                    className="w-9 h-9 rounded-full text-sm font-medium bg-white border hover:bg-gray-50 disabled:opacity-30"
                  >‹</button>

                  {/* Smart page window: first, …, current±2, …, last */}
                  {(() => {
                    const cur = filters.page ?? 1;
                    const pageNums: (number | '…')[] = [];
                    const add = (n: number) => { if (!pageNums.includes(n)) pageNums.push(n); };
                    add(1);
                    if (cur - 2 > 2) pageNums.push('…');
                    for (let p = Math.max(2, cur - 2); p <= Math.min(pages - 1, cur + 2); p++) add(p);
                    if (cur + 2 < pages - 1) pageNums.push('…');
                    if (pages > 1) add(pages);
                    return pageNums.map((p, i) =>
                      p === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                      ) : (
                        <button key={p}
                          className={`w-9 h-9 rounded-full text-sm font-medium ${p === cur ? 'bg-green-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
                          onClick={() => setFilters(f => ({ ...f, page: p as number }))}>
                          {p}
                        </button>
                      )
                    );
                  })()}

                  {/* Next */}
                  <button
                    disabled={filters.page === pages}
                    onClick={() => setFilters(f => ({ ...f, page: f.page! + 1 }))}
                    className="w-9 h-9 rounded-full text-sm font-medium bg-white border hover:bg-gray-50 disabled:opacity-30"
                  >›</button>

                  <span className="text-xs text-gray-400 ml-1">of {pages.toLocaleString()} pages</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">{t('search.noResults')}</p>
              <p className="text-sm text-gray-400 mb-5">Be the first to add this place to Seshaa!</p>
              <a href="/add-listing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{ background: 'var(--cp, #008751)' }}>
                <Plus size={15} /> Add a Place
              </a>
            </div>
          )}
        </div>

        {/* Sidebar ads */}
        <div className="hidden lg:block w-64 space-y-4 shrink-0">
          <AdBanner tier="FEATURED" country={filters.country} city={filters.city} category={filters.category} />
          <AdBanner tier="SPONSORED" country={filters.country} />
          <div className="bg-gradient-to-b from-green-600 to-emerald-500 text-white rounded-xl p-4 text-sm">
            <p className="font-bold mb-1">📢 {t('ads.advertiseHere')}</p>
            <p className="text-green-100 text-xs mb-3">{t('ads.getStarted')}</p>
            <a href="/advertise" className="bg-white text-green-700 font-semibold px-4 py-1.5 rounded-full text-xs inline-block hover:bg-green-50">
              Start Advertising
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
