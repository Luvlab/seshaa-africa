/**
 * seshaa.travels — Africa travel portal
 * Scraped travel articles + destination guides + user-submitted tips
 * Newspaper-style mosaic layout, full-viewport
 */
import { useState, useEffect, useCallback } from 'react';
import { Plane, MapPin, ExternalLink, Clock, Camera, Star, ChevronRight, Compass } from 'lucide-react';
import SeshaaTitle from '../components/brand/SeshaaTitle';
import { useThemeStore } from '../store/theme';
import api from '../services/api';

interface TravelArticle {
  id: string;
  title: string;
  link: string;
  summary?: string;
  image?: string;
  source: string;
  country: string;
  publishedAt: string;
}

const DESTINATIONS = [
  { code: 'MA', name: 'Morocco',       emoji: '🇲🇦', tag: 'Medinas & Sahara',    color: '#C1292E' },
  { code: 'TZ', name: 'Tanzania',      emoji: '🇹🇿', tag: 'Serengeti & Kilimanjaro', color: '#1EB53A' },
  { code: 'EG', name: 'Egypt',         emoji: '🇪🇬', tag: 'Pyramids & Nile',     color: '#CE1126' },
  { code: 'ZA', name: 'South Africa',  emoji: '🇿🇦', tag: 'Safari & Cape',       color: '#007A4D' },
  { code: 'KE', name: 'Kenya',         emoji: '🇰🇪', tag: 'Masai Mara & Coast',  color: '#006600' },
  { code: 'GH', name: 'Ghana',         emoji: '🇬🇭', tag: 'Heritage & Beaches',  color: '#FCD116' },
  { code: 'SN', name: 'Senegal',       emoji: '🇸🇳', tag: 'Pink Lake & Gorée',   color: '#00853F' },
  { code: 'ET', name: 'Ethiopia',      emoji: '🇪🇹', tag: 'Lalibela & Simien',   color: '#FCDD09' },
  { code: 'MG', name: 'Madagascar',    emoji: '🇲🇬', tag: 'Lemurs & Baobabs',    color: '#FC3D32' },
  { code: 'RW', name: 'Rwanda',        emoji: '🇷🇼', tag: 'Gorillas & Lakes',    color: '#20603D' },
  { code: 'NG', name: 'Nigeria',       emoji: '🇳🇬', tag: 'Culture & Cuisine',   color: '#008751' },
  { code: 'UG', name: 'Uganda',        emoji: '🇺🇬', tag: 'Source of the Nile',  color: '#FCDC04' },
  { code: 'TN', name: 'Tunisia',       emoji: '🇹🇳', tag: 'Carthage & Medinas',  color: '#E70013' },
  { code: 'MZ', name: 'Mozambique',    emoji: '🇲🇿', tag: 'Bazaruto & Dhow',     color: '#009A44' },
  { code: 'BW', name: 'Botswana',      emoji: '🇧🇼', tag: 'Okavango & Kalahari', color: '#75AADB' },
  { code: 'NA', name: 'Namibia',       emoji: '🇳🇦', tag: 'Namib Desert & Fish River', color: '#003580' },
];

const TRAVEL_TYPES = [
  { id: 'safari',    label: 'Safari',       emoji: '🦁', desc: 'Wildlife & game reserves' },
  { id: 'beach',     label: 'Beach',        emoji: '🏖️', desc: 'Zanzibar, Seychelles & more' },
  { id: 'culture',   label: 'Culture',      emoji: '🏛️', desc: 'History, heritage & art' },
  { id: 'adventure', label: 'Adventure',    emoji: '🧗', desc: 'Hiking, diving, trekking' },
  { id: 'food',      label: 'Food & Drink', emoji: '🍲', desc: 'African cuisine & flavours' },
  { id: 'wellness',  label: 'Wellness',     emoji: '🧘', desc: 'Retreats & eco-lodges' },
];

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function HeroTravel({ article }: { article: TravelArticle }) {
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      className="group relative block overflow-hidden bg-gray-900 h-full min-h-[380px]">
      {article.image && (
        <img src={article.image} alt={article.title}
          className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:opacity-65 group-hover:scale-105 transition-all duration-500"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute top-4 left-4">
        <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
          style={{ backgroundColor: 'var(--ca,#FCD116)', color: 'var(--cp,#008751)' }}>
          ✈️ seshaa.travels
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-white/60 font-semibold">{article.source}</span>
          <span className="text-white/30">·</span>
          <span className="text-xs text-white/50">{timeAgo(article.publishedAt)}</span>
        </div>
        <h2 className="font-black text-white text-2xl sm:text-3xl leading-tight line-clamp-3 group-hover:underline underline-offset-2">
          {article.title}
        </h2>
        {article.summary && (
          <p className="text-white/70 text-sm mt-2 line-clamp-2 max-w-xl">{article.summary}</p>
        )}
      </div>
    </a>
  );
}

function TravelCard({ article }: { article: TravelArticle }) {
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      className="group block bg-white border border-gray-200 hover:border-[var(--cp)] hover:shadow-md transition-all overflow-hidden rounded-sm">
      {article.image && (
        <div className="h-36 overflow-hidden bg-gray-100">
          <img src={article.image} alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="p-3">
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-[var(--cp)] transition-colors">
          {article.title}
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <MapPin size={10} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 truncate">{article.country}</span>
          <span className="text-[10px] text-gray-400 ml-auto shrink-0 flex items-center gap-0.5">
            <Clock size={9} /> {timeAgo(article.publishedAt)}
          </span>
        </div>
        <p className="text-xs font-semibold mt-1" style={{ color: 'var(--cp)' }}>{article.source}</p>
      </div>
    </a>
  );
}

export default function TravelsPage() {
  const { countryCode } = useThemeStore();
  const [articles, setArticles] = useState<TravelArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);

  const fetchTravel = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/news?category=travel&limit=50');
      setArticles(r.data.items || []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTravel(); }, [fetchTravel]);

  const filtered = activeType
    ? articles.filter(a =>
        a.title.toLowerCase().includes(activeType) ||
        a.summary?.toLowerCase().includes(activeType) ||
        a.country.toLowerCase().includes(activeType)
      )
    : articles;

  const hero = filtered.filter(a => a.image)[0];
  const featured = filtered.filter(a => a.image && a !== hero).slice(0, 3);
  const rest = filtered.filter(a => a !== hero && !featured.includes(a)).slice(0, 20);

  return (
    <div className="w-full min-h-screen bg-gray-50">

      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <header className="w-full bg-white border-b-2 border-gray-900">
        <div className="w-full px-4 sm:px-6 py-5">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <SeshaaTitle countryCode={countryCode} staticSuffix="travels" size="lg" />
            </div>
            <p className="text-xs text-gray-500 text-center sm:text-right max-w-xs">
              Discover Africa's wonders · Travel stories, guides & tips from across the continent
            </p>
          </div>

          {/* Travel type pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => setActiveType(null)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full border transition-all ${
                !activeType ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
              }`}
              style={!activeType ? { backgroundColor: 'var(--cp)' } : {}}
            >
              🌍 All
            </button>
            {TRAVEL_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveType(activeType === t.id ? null : t.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full border transition-all ${
                  activeType === t.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
                }`}
                style={activeType === t.id ? { backgroundColor: 'var(--cp)' } : {}}
                title={t.desc}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="w-full">

        {/* ── Destination guide strip ──────────────────────────────── */}
        <section className="w-full bg-white border-b border-gray-200">
          <div className="w-full px-4 sm:px-6 py-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
              <Compass size={12} className="inline mr-1 -mt-0.5" />Destination Guides
            </h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {DESTINATIONS.map(dest => (
                <a
                  key={dest.code}
                  href={`/country/${dest.code}`}
                  className="shrink-0 group flex flex-col items-center gap-1.5 w-20"
                >
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-shadow border-2 border-white"
                    style={{ backgroundColor: dest.color + '20', borderColor: dest.color + '40' }}
                  >
                    {dest.emoji}
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">{dest.name}</span>
                  <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2">{dest.tag}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 animate-pulse">
            <div className="lg:col-span-2 bg-gray-200 rounded-sm min-h-[380px]" />
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-sm" />)}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Plane size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No travel stories right now</p>
            <button onClick={fetchTravel} className="mt-3 px-4 py-2 text-sm font-bold rounded-full text-white" style={{ backgroundColor: 'var(--cp)' }}>Refresh</button>
          </div>
        ) : (
          <>
            {/* ── Front page hero grid ─────────────────────────── */}
            <section className="w-full border-b-2 border-gray-900">
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-300">
                {/* Hero */}
                {hero && (
                  <div className="lg:col-span-7">
                    <HeroTravel article={hero} />
                  </div>
                )}
                {/* Featured column */}
                <div className="lg:col-span-5 bg-white divide-y divide-gray-200">
                  {featured.map(article => (
                    <a key={article.id} href={article.link} target="_blank" rel="noopener noreferrer"
                      className="group flex gap-3 p-4 hover:bg-gray-50 transition-colors">
                      {article.image && (
                        <div className="shrink-0 w-28 h-24 rounded overflow-hidden bg-gray-100">
                          <img src={article.image} alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-3 group-hover:text-[var(--cp)] transition-colors">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <MapPin size={10} className="text-gray-400" />
                          <span className="text-xs text-gray-500">{article.country}</span>
                          <span className="text-xs font-semibold ml-auto" style={{ color: 'var(--cp)' }}>{article.source}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </section>

            {/* ── More stories mosaic ───────────────────────────── */}
            <section className="w-full bg-white border-b border-gray-200">
              <div className="w-full px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">
                  <Camera size={12} className="inline mr-1 -mt-0.5" />More Travel Stories
                </h2>
                <span className="text-xs text-gray-400">{rest.length} stories</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 divide-x divide-y divide-gray-200">
                {rest.map(article => (
                  <TravelCard key={article.id} article={article} />
                ))}
              </div>
            </section>

            {/* ── Book Africa CTA ──────────────────────────────── */}
            <section className="w-full px-4 sm:px-6 py-8 bg-gray-900 text-white text-center">
              <div className="max-w-xl mx-auto">
                <div className="text-4xl mb-3">✈️🌍</div>
                <h2 className="text-2xl font-black mb-2">Ready to explore Africa?</h2>
                <p className="text-white/70 text-sm mb-5">
                  Find hotels, restaurants, tour guides and services across 54 African countries on Seshaa.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a href="/search?category=hotel" className="px-5 py-2.5 rounded-full font-bold text-sm"
                    style={{ backgroundColor: 'var(--ca,#FCD116)', color: 'var(--cp,#008751)' }}>
                    🏨 Find Hotels
                  </a>
                  <a href="/search?category=transport" className="px-5 py-2.5 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">
                    🚗 Book Transport
                  </a>
                  <a href="/search?category=restaurant" className="px-5 py-2.5 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">
                    🍽️ Local Food
                  </a>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
