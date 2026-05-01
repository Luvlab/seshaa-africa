/**
 * Seshaa News — newspaper mosaic splash page.
 * Desktop: classic broadsheet grid (hero + 2 secondary + columns of cards)
 * Mobile: vertical stream with category pills
 * Auto-refreshes every 15 minutes; manual refresh button.
 * Full credits + external links to all sources.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { ExternalLink, RefreshCw, Clock, Newspaper, Search, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/theme';
import SeshaaTitle from '../components/brand/SeshaaTitle';
import api from '../services/api';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary?: string;
  image?: string;
  source: string;
  country: string;
  category: string;
  publishedAt: string;
}

const CATEGORIES = [
  { id: 'general',       label: 'Top Stories',    emoji: '🌍' },
  { id: 'politics',      label: 'Politics',        emoji: '🏛️' },
  { id: 'business',      label: 'Business',        emoji: '📈' },
  { id: 'technology',    label: 'Technology',      emoji: '💻' },
  { id: 'health',        label: 'Health',          emoji: '🏥' },
  { id: 'sports',        label: 'Sports',          emoji: '⚽' },
  { id: 'entertainment', label: 'Entertainment',   emoji: '🎭' },
  { id: 'agriculture',   label: 'Agriculture',     emoji: '🌾' },
  { id: 'finance',       label: 'Finance',         emoji: '💰' },
];

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ── Hero card: big image, fills left column ──────────────────────────────────
function HeroCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link} target="_blank" rel="noopener noreferrer"
      className="group block relative rounded-none overflow-hidden bg-gray-900 h-full min-h-[340px]"
    >
      {item.image ? (
        <img
          src={item.image} alt={item.title}
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ backgroundColor: 'var(--ca,#FCD116)', color: 'var(--cp,#008751)' }}>
            {item.source}
          </span>
          <span className="text-xs text-white/60 flex items-center gap-1">
            <Clock size={10} /> {timeAgo(item.publishedAt)}
          </span>
        </div>
        <h2 className="font-black text-white text-2xl sm:text-3xl leading-tight line-clamp-4 group-hover:underline underline-offset-2">
          {item.title}
        </h2>
        {item.summary && (
          <p className="text-white/70 text-sm mt-2 line-clamp-2">{item.summary}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-white/50 uppercase tracking-wide">{item.country}</span>
          <ExternalLink size={12} className="text-white/40 group-hover:text-white/80 transition-colors" />
        </div>
      </div>
    </a>
  );
}

// ── Secondary card: medium image, stacked ────────────────────────────────────
function SecondaryCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link} target="_blank" rel="noopener noreferrer"
      className="group flex gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0"
    >
      {item.image && (
        <div className="shrink-0 w-24 h-20 rounded overflow-hidden bg-gray-100">
          <img src={item.image} alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-3 group-hover:text-[var(--cp)] transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--cp)' }}>{item.source}</span>
          <span className="text-xs text-gray-400">{timeAgo(item.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}

// ── Grid card: standard tile ──────────────────────────────────────────────────
function GridCard({ item, size = 'md' }: { item: NewsItem; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <a
      href={item.link} target="_blank" rel="noopener noreferrer"
      className="group block border border-gray-200 hover:border-[var(--cp)] bg-white rounded-sm overflow-hidden transition-all hover:shadow-md"
    >
      {item.image && (
        <div className={`overflow-hidden bg-gray-100 ${size === 'lg' ? 'h-48' : size === 'md' ? 'h-32' : 'h-24'}`}>
          <img src={item.image} alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-3">
        <p className={`font-bold text-gray-900 leading-snug ${size === 'lg' ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'} group-hover:text-[var(--cp)] transition-colors`}>
          {item.title}
        </p>
        {size !== 'sm' && item.summary && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-semibold text-gray-600 truncate">{item.source}</span>
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Clock size={9} /> {timeAgo(item.publishedAt)}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.country}</p>
      </div>
    </a>
  );
}

// ── Ticker / scrolling headline bar ──────────────────────────────────────────
function TickerBar({ items }: { items: NewsItem[] }) {
  const titles = items.slice(0, 20).map(i => i.title);
  return (
    <div className="w-full overflow-hidden bg-gray-900 text-white flex items-center h-9 shrink-0">
      <div className="shrink-0 px-3 py-1 font-black text-xs uppercase tracking-widest mr-3"
        style={{ backgroundColor: 'var(--ca,#FCD116)', color: 'var(--cp,#008751)' }}>
        LIVE
      </div>
      <div className="overflow-hidden flex-1">
        <div
          className="flex gap-0 whitespace-nowrap"
          style={{ animation: 'ticker 60s linear infinite' }}
        >
          {[...titles, ...titles].map((t, i) => (
            <span key={i} className="text-xs mr-10 text-white/80">
              <span className="text-white/40 mr-2">◆</span>{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Source badges ─────────────────────────────────────────────────────────────
function SourcesBar({ sources }: { sources: { name: string; country: string }[] }) {
  if (!sources.length) return null;
  return (
    <div className="border-t border-gray-200 pt-4 mt-6">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Sources & Credits</p>
      <div className="flex flex-wrap gap-2">
        {sources.map(s => (
          <span key={s.name}
            className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            {s.name} <span className="text-gray-400">· {s.country}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function NewsSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-gray-200">
        <div className="lg:col-span-5 bg-gray-200 min-h-[340px]" />
        <div className="lg:col-span-4 border-l border-gray-200 p-4 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3 border-b border-gray-100 pb-4">
              <div className="w-24 h-20 bg-gray-200 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-3 border-l border-gray-200 p-4 space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-3 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-px bg-gray-200 mt-px">
        {[1,2,3,4,5,6,7,8,9,10].map(i => (
          <div key={i} className="bg-white p-3 space-y-2">
            <div className="h-24 bg-gray-200 rounded-sm" />
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewsPage() {
  const { t } = useTranslation();
  const { countryCode } = useThemeStore();
  const [activeCategory, setActiveCategory] = useState('general');
  const [items, setItems]   = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<{ name: string; country: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNews = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const r = await api.get(`/news?category=${cat}&limit=60`);
      setItems(r.data.items || []);
      setSources(r.data.sources || []);
      setLastFetch(r.data.cachedAt || new Date().toISOString());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(activeCategory);
    // Auto-refresh every 15 minutes
    autoRefreshRef.current = setInterval(() => fetchNews(activeCategory), 15 * 60 * 1000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [activeCategory, fetchNews]);

  const filtered = searchQ
    ? items.filter(i =>
        i.title.toLowerCase().includes(searchQ.toLowerCase()) ||
        i.source.toLowerCase().includes(searchQ.toLowerCase()) ||
        i.country.toLowerCase().includes(searchQ.toLowerCase())
      )
    : items;

  const withImage = filtered.filter(i => i.image);
  const hero      = withImage[0];
  const secondary = withImage.slice(1, 5);
  const briefs    = filtered.filter(i => !i.image).slice(0, 8);
  const grid      = filtered.slice(hero ? 5 : 0, hero ? 35 : 40);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const cat = CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* ── Masthead ───────────────────────────────────────────────── */}
      <header className="w-full bg-white border-b-2 border-gray-900">
        <div className="w-full px-4 sm:px-6 py-4">
          {/* Top bar: date + controls */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span className="font-medium hidden sm:block">{today}</span>
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
                <Search size={12} className="text-gray-400" />
                <input
                  className="bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400 w-32 sm:w-48"
                  placeholder="Search headlines..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                />
              </div>
              <button
                onClick={() => fetchNews(activeCategory)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Masthead title */}
          <div className="text-center border-y-2 border-gray-900 py-4 mb-3">
            <div className="flex items-center justify-center gap-3 mb-1">
              <SeshaaTitle countryCode={countryCode} size="lg" />
              <span className="text-4xl font-black tracking-tighter text-gray-900 hidden sm:block" style={{ fontFamily: '"Georgia","Times New Roman",serif' }}>
                NEWS
              </span>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              Africa's Voice · Aggregated from 50+ Publications · Full Credits to Sources
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap ${
                  activeCategory === c.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-400'
                }`}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Ticker ──────────────────────────────────────────────────── */}
      {filtered.length > 0 && <TickerBar items={filtered} />}

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="w-full">
        {loading ? (
          <div className="px-4 sm:px-6 py-4"><NewsSkeleton /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400 px-4">
            <Newspaper size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-gray-600 mb-1">No stories found</h3>
            <p className="text-sm">Sources may be refreshing. Try again in a moment.</p>
            <button onClick={() => fetchNews(activeCategory)}
              className="mt-4 px-4 py-2 text-sm font-bold rounded-full text-white"
              style={{ backgroundColor: 'var(--cp)' }}>
              Reload
            </button>
          </div>
        ) : (
          <>
            {/* ── FRONT PAGE: Hero + Secondary + Briefs ─────────────── */}
            <section className="w-full border-b-2 border-gray-900">
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-300">

                {/* Hero — large left column */}
                {hero && (
                  <div className="lg:col-span-5 xl:col-span-6">
                    <HeroCard item={hero} />
                  </div>
                )}

                {/* Secondary stories — middle column */}
                <div className="lg:col-span-4 xl:col-span-4 bg-white p-4 flex flex-col gap-3">
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-2 mb-1">
                    {cat.emoji} {cat.label}
                  </h2>
                  {secondary.map(item => (
                    <SecondaryCard key={item.id} item={item} />
                  ))}
                </div>

                {/* Briefs — right column */}
                <div className="lg:col-span-3 xl:col-span-2 bg-white p-4">
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-2 mb-3">
                    In Brief
                  </h2>
                  <div className="space-y-3">
                    {briefs.map(item => (
                      <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
                        className="group block border-b border-gray-100 pb-3 last:border-0">
                        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-3 group-hover:text-[var(--cp)] transition-colors">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold" style={{ color: 'var(--cp)' }}>{item.source}</span>
                          <span className="text-[10px] text-gray-400">{timeAgo(item.publishedAt)}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── SECTION LABEL ─────────────────────────────────────── */}
            <div className="w-full px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between bg-white border-b border-gray-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">
                More {cat.label}
              </h2>
              <span className="text-xs text-gray-400">{grid.length} stories</span>
            </div>

            {/* ── GRID MOSAIC ───────────────────────────────────────── */}
            <section className="w-full bg-white">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 divide-x divide-y divide-gray-200">
                {grid.map((item, idx) => (
                  <GridCard
                    key={item.id}
                    item={item}
                    size={idx < 2 ? 'lg' : idx < 6 ? 'md' : 'sm'}
                  />
                ))}
              </div>
            </section>

            {/* ── ALL SOURCES ───────────────────────────────────────── */}
            <section className="w-full bg-white border-t-2 border-gray-900 px-4 sm:px-6 py-6">
              <SourcesBar sources={sources} />
              <p className="text-xs text-gray-400 mt-4">
                Seshaa News aggregates headlines from African publications. All articles remain the intellectual property of their respective publishers. Click any headline to read the full story at the source.
              </p>
            </section>
          </>
        )}
      </main>

      {/* Ticker animation */}
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
