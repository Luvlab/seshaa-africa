import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, Plus, Search, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { listingsApi, aiSearchApi } from '../services/api';
import ListingCard from '../components/directory/ListingCard';
import AdBanner from '../components/ads/AdBanner';
import { useThemeStore } from '../store/theme';
import { useCountriesStore } from '../store/countries';
import type { Listing, SearchFilters } from '../types';

const TYPES = ['PERSONAL', 'BUSINESS', 'GOVERNMENT', 'NGO'] as const;
const CATEGORY_TABS = ['restaurant', 'health', 'education', 'finance', 'transport', 'hotel', 'tech', 'beauty', 'auto', 'agriculture'] as const;

// Map 2-letter country codes → full names stored in the DB (OSM Nominatim format)
const CODE_TO_COUNTRY: Record<string, string> = {
  DZ:'Algeria', AO:'Angola', BJ:'Benin', BW:'Botswana', BF:'Burkina Faso',
  BI:'Burundi', CV:'Cape Verde', CM:'Cameroon', CF:'Central African Republic',
  TD:'Chad', KM:'Comoros', CD:'DR Congo', CG:'Republic of Congo',
  CI:"Côte d'Ivoire", DJ:'Djibouti', EG:'Egypt', GQ:'Equatorial Guinea',
  ER:'Eritrea', ET:'Ethiopia', GA:'Gabon', GM:'Gambia', GH:'Ghana',
  GN:'Guinea', GW:'Guinea-Bissau', KE:'Kenya', LS:'Lesotho', LR:'Liberia',
  LY:'Libya', MG:'Madagascar', MW:'Malawi', ML:'Mali', MR:'Mauritania',
  MU:'Mauritius', MA:'Morocco', MZ:'Mozambique', NA:'Namibia', NE:'Niger',
  NG:'Nigeria', RW:'Rwanda', ST:'São Tomé and Príncipe', SN:'Senegal',
  SC:'Seychelles', SL:'Sierra Leone', SO:'Somalia', ZA:'South Africa',
  SS:'South Sudan', SD:'Sudan', SZ:'Eswatini', TZ:'Tanzania', TG:'Togo',
  TN:'Tunisia', UG:'Uganda', ZM:'Zambia', ZW:'Zimbabwe',
};

/** Accept code ('NG') or full name ('Nigeria') — always returns a full name for DB matching */
function resolveCountry(val: string): string {
  if (!val) return '';
  const upper = val.trim().toUpperCase();
  return CODE_TO_COUNTRY[upper] ?? val.trim();
}

export default function SearchPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { countryCode } = useThemeStore();
  const { defaultCountry: storeDefault } = useCountriesStore();

  // If ?tag= is in URL, don't auto-apply country (diaspora tags cross all countries)
  const initialTag = params.get('tag') || '';
  const [filters, setFilters] = useState<SearchFilters>({
    q: params.get('q') || '',
    country: initialTag ? '' : resolveCountry(params.get('country') || countryCode || storeDefault),
    city: params.get('city') || '',
    category: params.get('category') || '',
    type: (params.get('type') as SearchFilters['type']) || undefined,
    tag: initialTag || undefined,
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

  // Sync URL params → filters when navigating here (e.g. hero search, country card)
  useEffect(() => {
    const qParam        = params.get('q')        || '';
    const cityParam     = params.get('city')     || '';
    const countryParam  = resolveCountry(params.get('country') || '');
    const categoryParam = params.get('category') || '';
    const tagParam      = params.get('tag')      || '';
    setFilters(prev => {
      const same =
        prev.q        === qParam &&
        prev.city     === cityParam &&
        (prev.country  || '') === countryParam &&
        (prev.category || '') === categoryParam &&
        (prev.tag      || '') === tagParam;
      if (same) return prev;
      return { ...prev, q: qParam, city: cityParam, country: countryParam, category: categoryParam, tag: tagParam || undefined, page: 1 };
    });
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  // Header country picker → always update search country, UNLESS we're filtering by tag
  useEffect(() => {
    if (filters.tag) return; // don't override when tag filter is active
    const name = resolveCountry(countryCode || '');
    setFilters(prev => {
      if ((prev.country || '') === name) return prev;
      const next = { ...prev, country: name, page: 1 };
      const p = new URLSearchParams(params);
      if (name) p.set('country', name);
      else p.delete('country');
      setParams(p, { replace: true });
      return next;
    });
  }, [countryCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<SearchFilters>) => {
    if (patch.country) patch.country = resolveCountry(patch.country);
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
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm min-w-0">
          {aiMode ? <Sparkles size={17} className="text-theme shrink-0" /> : <Search size={17} className="text-gray-400 shrink-0" />}
          <input
            className="flex-1 min-w-0 outline-none text-sm text-gray-800 placeholder-gray-400"
            placeholder={t('search.placeholder')}
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && update({ q: filters.q })}
          />
          {filters.q && (
            <button onClick={() => update({ q: '' })} className="shrink-0 p-1">
              <X size={15} className="text-gray-400" />
            </button>
          )}
        </div>
        <button
          className="shrink-0 px-5 rounded-2xl font-bold text-sm text-white hover:opacity-90 min-h-[48px]"
          style={{ background: 'var(--cp, #008751)' }}
          onClick={() => update({ q: filters.q })}
        >
          {t('search.findBtn', { defaultValue: 'Find' })}
        </button>
        <button
          className="shrink-0 bg-white border border-gray-200 px-3.5 rounded-2xl hover:bg-gray-50 min-h-[48px]"
          onClick={() => setShowFilters(v => !v)}
          title="More filters"
        >
          <SlidersHorizontal size={17} className="text-gray-500" />
        </button>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => update({ category: '' })}
            className={clsx(
              'shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors',
              !filters.category
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
            style={!filters.category ? { background: 'var(--cp)' } : {}}
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
                  'shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors',
                  active
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
                style={active ? { background: 'var(--cp)' } : {}}
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
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-semibold">{t('search.country')}</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm mt-1.5" value={filters.country} onChange={e => update({ country: e.target.value })} placeholder="e.g. Nigeria" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold">{t('search.city')}</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm mt-1.5" value={filters.city} onChange={e => update({ city: e.target.value })} placeholder="e.g. Lagos" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold">{t('search.category')}</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm mt-1.5" value={filters.category} onChange={e => update({ category: e.target.value })} placeholder="e.g. health" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold">{t('search.type')}</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm mt-1.5" value={filters.type || ''} onChange={e => update({ type: (e.target.value as SearchFilters['type']) || undefined })}>
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-0">
                {listings.map((l, i) => (
                  <React.Fragment key={l.id}>
                    <div className="min-w-0 overflow-hidden"><ListingCard listing={l} /></div>
                    {(i + 1) % 8 === 0 && <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4"><AdBanner tier="BANNER" country={filters.country} city={filters.city} /></div>}
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
