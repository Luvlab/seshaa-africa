/**
 * Seshaa News — newspaper mosaic splash page.
 * Desktop: classic broadsheet grid (hero + secondary + brief columns)
 * Mobile: vertical stream with category pills
 * All strings translated via i18next. Full viewport width everywhere.
 * No horizontal dividers — spacing and background contrast only.
 *
 * All article links go to /news/article (internal reader) first.
 * Ticker items are clickable links.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Clock, Newspaper, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/theme';
import { COUNTRIES } from '../components/layout/CountryPicker';
import api from '../services/api';
import FavoriteButton from '../components/ui/FavoriteButton';

interface NewsItem {
  id: string; title: string; link: string; summary?: string;
  image?: string; source: string; country: string; category: string; publishedAt: string;
}

const CATEGORY_IDS = [
  'general','politics','business','technology','health',
  'sports','entertainment','agriculture','finance',
];
const CATEGORY_EMOJIS: Record<string,string> = {
  general:'🌍', politics:'🏛️', business:'📈', technology:'💻', health:'🏥',
  sports:'⚽', entertainment:'🎭', agriculture:'🌾', finance:'💰', travel:'✈️',
};

/* Build the internal reader URL for a NewsItem */
function articlePath(item: NewsItem): string {
  const p = new URLSearchParams();
  p.set('link',        item.link);
  p.set('title',       item.title);
  p.set('source',      item.source);
  p.set('country',     item.country);
  p.set('publishedAt', item.publishedAt);
  if (item.summary) p.set('summary', item.summary);
  if (item.image)   p.set('image',   item.image);
  return `/news/article?${p.toString()}`;
}

function timeAgo(d: string, t: (k: string) => string) {
  const ms = Date.now() - new Date(d).getTime();
  const m  = Math.floor(ms / 60000);
  if (m < 2)   return t('news.live').toLowerCase() === 'live' ? 'just now' : t('news.live');
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* ── Hero — large image card ─────────────────────────────────────────────── */
function HeroCard({ item, t }: { item: NewsItem; t: (k: string, opts?: Record<string, unknown>) => string }) {
  return (
    <a href={articlePath(item)}
      className="group block relative overflow-hidden bg-gray-900 h-full min-h-[320px]">
      {item.image ? (
        <img src={item.image} alt={item.title}
          className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:opacity-65 group-hover:scale-105 transition-all duration-500"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ backgroundColor: 'var(--ca,#FCD116)', color: 'var(--cp,#008751)' }}>
            {item.source}
          </span>
          <span className="text-xs text-white/60 flex items-center gap-1">
            <Clock size={10} /> {timeAgo(item.publishedAt, t)}
          </span>
          <span className="text-xs text-white/40 uppercase">{item.country}</span>
        </div>
        <h2 className="font-black text-white text-xl sm:text-2xl leading-tight line-clamp-4 group-hover:underline underline-offset-2">
          {item.title}
        </h2>
        {item.summary && <p className="text-white/65 text-sm mt-1.5 line-clamp-2">{item.summary}</p>}
      </div>
    </a>
  );
}

/* ── Secondary — image + text row ───────────────────────────────────────── */
function SecondaryCard({ item }: { item: NewsItem }) {
  return (
    <a href={articlePath(item)}
      className="group flex gap-3 py-3 last:pb-0 hover:bg-gray-50 rounded transition-colors">
      {item.image && (
        <div className="shrink-0 w-24 aspect-[4/3] overflow-hidden bg-gray-100 rounded">
          <img src={item.image} alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-3 group-hover:text-[var(--cp)] transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--cp)' }}>{item.source}</span>
          <span className="text-xs text-gray-400">{item.country}</span>
        </div>
      </div>
    </a>
  );
}

/* ── Grid card — compact ────────────────────────────────────────────────── */
function GridCard({ item, size = 'md' }: { item: NewsItem; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton id={item.id} type="news" name={item.title} size={13} />
      </div>
    <a href={articlePath(item)}
      className="group block bg-white hover:bg-gray-50 overflow-hidden transition-colors rounded">
      {item.image && (
        <div className="aspect-[4/3] overflow-hidden bg-gray-100">
          <img src={item.image} alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="p-3">
        <p className={`font-bold text-gray-900 leading-snug group-hover:text-[var(--cp)] transition-colors ${size === 'lg' ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'}`}>
          {item.title}
        </p>
        {size !== 'sm' && item.summary && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-semibold text-[var(--cp)] truncate">{item.source}</span>
          <span className="text-xs text-gray-400 shrink-0">{item.country}</span>
        </div>
        <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <Clock size={9} /> {new Date(item.publishedAt).toLocaleDateString()}
        </span>
      </div>
    </a>
    </div>
  );
}

/* ── Breaking-news ticker ───────────────────────────────────────────────── */
function TickerBar({ items, liveLabel, speed }: { items: NewsItem[]; liveLabel: string; speed: number }) {
  const headlines = items.slice(0, 20);
  // speed: seconds for a full loop (60 default; admin can change via localStorage)
  return (
    <div className="w-full overflow-hidden bg-gray-900 text-white flex items-center h-9 shrink-0">
      <div className="shrink-0 px-3 py-1 font-black text-xs uppercase tracking-widest mr-3"
        style={{ backgroundColor: 'var(--ca,#FCD116)', color: 'var(--cp,#008751)' }}>
        {liveLabel}
      </div>
      <div className="overflow-hidden flex-1">
        <div className="flex gap-0 whitespace-nowrap"
          style={{ animation: `ticker ${speed}s linear infinite` }}>
          {[...headlines, ...headlines].map((item, i) => (
            <a key={i} href={articlePath(item)}
              className="text-xs mr-10 text-white/80 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5">
              <span className="text-white/40">◆</span>
              {item.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Sources attribution bar ────────────────────────────────────────────── */
function SourcesBar({ sources, label }: { sources: { name: string; country: string }[]; label: string }) {
  if (!sources.length) return null;
  return (
    <div className="pt-4 mt-2">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {sources.map(s => (
          <span key={s.name} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            {s.name} <span className="text-gray-400">· {s.country}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Loading skeleton ───────────────────────────────────────────────────── */
function NewsSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-4 px-4 sm:px-6 lg:px-8 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-gray-200 rounded min-h-[320px]" />
        <div className="lg:col-span-4 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-24 aspect-[4/3] bg-gray-200 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-200 rounded w-1/3 mt-1" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-3 space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded w-4/5" />
              <div className="h-2 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded p-3 space-y-2">
            <div className="h-24 bg-gray-300 rounded" />
            <div className="h-3 bg-gray-300 rounded" />
            <div className="h-3 bg-gray-300 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function NewsPage() {
  const { t } = useTranslation();
  const { countryCode } = useThemeStore();
  const [activeCategory, setActiveCategory] = useState('general');
  const [items, setItems]     = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<{ name: string; country: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ticker speed — stored in localStorage; admin can set it
  const [tickerSpeed] = useState<number>(() => {
    const stored = localStorage.getItem('seshaa_ticker_speed');
    return stored ? Math.max(20, Math.min(200, parseInt(stored))) : 60;
  });

  const selectedCountry = countryCode ? (COUNTRIES.find(c => c.code === countryCode)?.name || countryCode) : '';

  const fetchNews = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: cat, limit: '60' });
      if (selectedCountry) params.set('country', selectedCountry);
      const r = await api.get(`/news?${params.toString()}`);
      setItems(r.data.items || []);
      setSources(r.data.sources || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [selectedCountry]);

  useEffect(() => {
    fetchNews(activeCategory);
    autoRefreshRef.current = setInterval(() => fetchNews(activeCategory), 15 * 60 * 1000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [activeCategory, fetchNews]);

  const filtered = searchQ
    ? items.filter(i =>
        i.title.toLowerCase().includes(searchQ.toLowerCase()) ||
        i.source.toLowerCase().includes(searchQ.toLowerCase()) ||
        i.country.toLowerCase().includes(searchQ.toLowerCase()))
    : items;

  const withImage = filtered.filter(i => i.image);
  const hero      = withImage[0];
  const secondary = withImage.slice(1, 5);
  const briefs    = filtered.filter(i => !i.image).slice(0, 8);
  const grid      = filtered.slice(hero ? 5 : 0, hero ? 35 : 40);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const catLabel = t(`news.categories.${activeCategory}`, activeCategory);

  return (
    <div className="w-full min-h-screen bg-gray-50">

      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <header className="w-full bg-white shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">

          {/* Top row: date + search + refresh */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-gray-600 font-semibold hidden sm:block tracking-wide">{today}</span>
            <div className="flex items-center gap-2 flex-1 bg-white border border-gray-300 rounded-full px-3 py-2 focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-400 transition-all ml-auto">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input className="bg-transparent text-sm text-gray-800 placeholder-gray-400 flex-1 outline-none min-w-0"
                placeholder={t('news.searchPlaceholder')}
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={() => fetchNews(activeCategory)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-full transition-colors shrink-0 border border-gray-200">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{t('news.refresh')}</span>
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-0.5 overflow-x-auto scrollbar-none -mb-px">
            {CATEGORY_IDS.map(id => (
              <button key={id} onClick={() => setActiveCategory(id)}
                className={`shrink-0 flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap rounded-t ${
                  activeCategory === id
                    ? 'text-gray-900 bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}>
                <span>{CATEGORY_EMOJIS[id]}</span> {t(`news.categories.${id}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Ticker */}
      {filtered.length > 0 && (
        <TickerBar items={filtered} liveLabel={t('news.live')} speed={tickerSpeed} />
      )}

      <main className="w-full">
        {loading ? (
          <NewsSkeleton />
        ) : filtered.length === 0 ? (
          <div className="py-24 text-gray-400 px-4 sm:px-6 lg:px-8">
            <Newspaper size={48} className="mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-gray-600 mb-1">{t('news.noStories')}</h3>
            <p className="text-sm">{t('news.noStoriesBody')}</p>
            <button onClick={() => fetchNews(activeCategory)}
              className="mt-4 px-4 py-2 text-sm font-bold rounded-full text-white" style={{ backgroundColor: 'var(--cp)' }}>
              {t('news.reload')}
            </button>
          </div>
        ) : (
          <>
            {/* ── Front page: 3-column newspaper layout ────────────────── */}
            <section className="w-full bg-white py-4">
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                  {/* Hero */}
                  {hero && (
                    <div className="lg:col-span-5 xl:col-span-6 rounded overflow-hidden">
                      <HeroCard item={hero} t={t} />
                    </div>
                  )}

                  {/* Secondary stories */}
                  <div className="lg:col-span-4 xl:col-span-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                      {CATEGORY_EMOJIS[activeCategory]} {catLabel}
                    </p>
                    <div className="space-y-0">
                      {secondary.map(item => <SecondaryCard key={item.id} item={item} />)}
                    </div>
                  </div>

                  {/* Briefs column */}
                  <div className="lg:col-span-3 xl:col-span-2">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                      {t('news.inBrief')}
                    </p>
                    <div className="space-y-3">
                      {briefs.map(item => (
                        <a key={item.id} href={articlePath(item)}
                          className="group block py-2 rounded hover:bg-gray-50 transition-colors">
                          <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-3 group-hover:text-[var(--cp)] transition-colors">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold" style={{ color: 'var(--cp)' }}>{item.source}</span>
                            <span className="text-[10px] text-gray-400">{item.country}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── More stories section label ────────────────────────────── */}
            <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-3 flex items-center gap-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">
                {t('news.more', { cat: catLabel })}
              </h2>
              <span className="text-xs text-gray-400">{t('news.stories', { count: grid.length })}</span>
            </div>

            {/* ── Grid mosaic ───────────────────────────────────────────── */}
            <section className="w-full px-4 sm:px-6 lg:px-8 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {grid.map((item, idx) => (
                  <GridCard key={item.id} item={item} size={idx < 2 ? 'lg' : idx < 6 ? 'md' : 'sm'} />
                ))}
              </div>
            </section>

            {/* ── Sources & attribution ─────────────────────────────────── */}
            <section className="w-full bg-white px-4 sm:px-6 lg:px-8 py-6">
              <SourcesBar sources={sources} label={t('news.sources')} />
              <p className="text-xs text-gray-400 mt-4">{t('news.disclaimer')}</p>
            </section>
          </>
        )}
      </main>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
