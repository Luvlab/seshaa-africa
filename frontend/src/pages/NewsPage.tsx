import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw, Clock, Globe, Newspaper, TrendingUp } from 'lucide-react';
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

interface Category {
  id: string;
  label: string;
  emoji: string;
}

const CATEGORIES: Category[] = [
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
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl border hover:shadow-md transition-all group overflow-hidden"
    >
      {item.image && (
        <div className="h-40 overflow-hidden">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-4">
        <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-3 group-hover:text-[var(--cp)] transition-colors">
          {item.title}
        </p>
        {item.summary && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.summary}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {item.source}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Globe size={10}/> {item.country}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={10}/>
            <span>{timeAgo(item.publishedAt)}</span>
            <ExternalLink size={10} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </div>
      </div>
    </a>
  );
}

function FeaturedCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative rounded-2xl overflow-hidden group h-64 bg-gray-900"
    >
      {item.image && (
        <img
          src={item.image}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-60 group-hover:scale-105 transition-all duration-300"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
            {item.source}
          </span>
          <span className="text-xs text-white/60 flex items-center gap-0.5">
            <Clock size={10}/> {timeAgo(item.publishedAt)}
          </span>
        </div>
        <p className="font-bold text-white text-base leading-snug line-clamp-3">
          {item.title}
        </p>
      </div>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink size={16} className="text-white/80"/>
      </div>
    </a>
  );
}

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<{ name: string; country: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const fetchNews = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const r = await api.get(`/news?category=${cat}&limit=30`);
      setItems(r.data.items || []);
      setSources(r.data.sources || []);
      setLastFetch(r.data.cachedAt);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNews(activeCategory); }, [activeCategory]);

  const featured = items.filter(i => i.image).slice(0, 2);
  const rest = items.filter(i => !featured.includes(i));
  const cat = CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--cp-light,#e6f4ec)' }}>
            <Newspaper size={20} style={{ color: 'var(--cp)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Seshaa News</h1>
            <p className="text-xs text-gray-500">Africa's news, aggregated from trusted sources</p>
          </div>
        </div>
        <button
          onClick={() => fetchNews(activeCategory)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              activeCategory === c.id ? 'text-white border-[var(--cp)]' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            }`}
            style={activeCategory === c.id ? { backgroundColor: 'var(--cp)' } : {}}
          >
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-2xl border overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-200"/>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"/>
                <div className="h-4 bg-gray-200 rounded w-3/4"/>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-3"/>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Newspaper size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium">No news loaded</p>
          <p className="text-sm mt-1">Some news sources may be temporarily unavailable</p>
          <button onClick={() => fetchNews(activeCategory)} className="mt-3 text-sm font-semibold" style={{ color: 'var(--cp)' }}>
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Featured row */}
          {featured.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {featured.slice(0, 2).map(item => <FeaturedCard key={item.id} item={item}/>)}
            </div>
          )}

          {/* Category headline */}
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-gray-400"/>
            <span className="text-sm font-semibold text-gray-600">{cat.emoji} {cat.label} — Latest</span>
            {lastFetch && (
              <span className="text-xs text-gray-400 ml-auto">Updated {timeAgo(lastFetch)}</span>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rest.map(item => <NewsCard key={item.id} item={item}/>)}
          </div>
        </>
      )}

      {/* Sources footer */}
      {sources.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-gray-400 font-medium mb-2">Sources for this category:</p>
          <div className="flex flex-wrap gap-2">
            {sources.map(s => (
              <span key={s.name} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                {s.name} · {s.country}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-3">
            Seshaa aggregates publicly available RSS feeds. All articles link to original publishers. © respective publishers.
          </p>
        </div>
      )}
    </div>
  );
}
