/**
 * seshaa.travels — Africa travel portal
 * Full viewport width. All strings via i18n.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plane, MapPin, Clock, Camera, Compass } from 'lucide-react';
import SeshaaTitle from '../components/brand/SeshaaTitle';
import { useThemeStore } from '../store/theme';
import api from '../services/api';

interface TravelArticle {
  id: string; title: string; link: string; summary?: string;
  image?: string; source: string; country: string; publishedAt: string;
}

const DESTINATIONS = [
  // ── Popular / hero destinations ─────────────────────────────────────────
  { code: 'MA', name: 'Morocco',                   emoji: '🇲🇦', tag: 'Medinas & Sahara',           color: '#C1292E' },
  { code: 'TZ', name: 'Tanzania',                  emoji: '🇹🇿', tag: 'Serengeti & Kilimanjaro',    color: '#1EB53A' },
  { code: 'EG', name: 'Egypt',                     emoji: '🇪🇬', tag: 'Pyramids & Nile',            color: '#CE1126' },
  { code: 'ZA', name: 'South Africa',              emoji: '🇿🇦', tag: 'Safari & Cape',              color: '#007A4D' },
  { code: 'KE', name: 'Kenya',                     emoji: '🇰🇪', tag: 'Masai Mara & Coast',         color: '#006600' },
  { code: 'GH', name: 'Ghana',                     emoji: '🇬🇭', tag: 'Heritage & Beaches',         color: '#FCD116' },
  { code: 'SN', name: 'Senegal',                   emoji: '🇸🇳', tag: 'Pink Lake & Gorée',          color: '#00853F' },
  { code: 'ET', name: 'Ethiopia',                  emoji: '🇪🇹', tag: 'Lalibela & Simien',          color: '#FCDD09' },
  { code: 'MG', name: 'Madagascar',                emoji: '🇲🇬', tag: 'Lemurs & Baobabs',           color: '#FC3D32' },
  { code: 'RW', name: 'Rwanda',                    emoji: '🇷🇼', tag: 'Gorillas & Lakes',           color: '#20603D' },
  { code: 'NG', name: 'Nigeria',                   emoji: '🇳🇬', tag: 'Culture & Cuisine',          color: '#008751' },
  { code: 'UG', name: 'Uganda',                    emoji: '🇺🇬', tag: 'Source of the Nile',         color: '#FCDC04' },
  { code: 'TN', name: 'Tunisia',                   emoji: '🇹🇳', tag: 'Carthage & Medinas',         color: '#E70013' },
  { code: 'MZ', name: 'Mozambique',                emoji: '🇲🇿', tag: 'Bazaruto & Dhow',            color: '#009A44' },
  { code: 'BW', name: 'Botswana',                  emoji: '🇧🇼', tag: 'Okavango & Kalahari',        color: '#75AADB' },
  { code: 'NA', name: 'Namibia',                   emoji: '🇳🇦', tag: 'Namib Desert',               color: '#003580' },
  // ── All remaining 38 African countries ─────────────────────────────────
  { code: 'DZ', name: 'Algeria',                   emoji: '🇩🇿', tag: 'Sahara & Casbah',            color: '#006233' },
  { code: 'AO', name: 'Angola',                    emoji: '🇦🇴', tag: 'Kalandula & Coast',          color: '#CC0000' },
  { code: 'BJ', name: 'Benin',                     emoji: '🇧🇯', tag: 'Voodoo Culture & Ouidah',    color: '#008751' },
  { code: 'BF', name: 'Burkina Faso',              emoji: '🇧🇫', tag: 'Mosques & Sahel',            color: '#EF2B2D' },
  { code: 'BI', name: 'Burundi',                   emoji: '🇧🇮', tag: 'Lake Tanganyika & Drums',    color: '#CE1126' },
  { code: 'CV', name: 'Cape Verde',                emoji: '🇨🇻', tag: 'Islands & Atlantic Beaches', color: '#003893' },
  { code: 'CM', name: 'Cameroon',                  emoji: '🇨🇲', tag: 'Wildlife & Volcano',         color: '#007A5E' },
  { code: 'CF', name: 'Central African Republic',  emoji: '🇨🇫', tag: 'Dzanga-Sangha Rainforest',   color: '#003082' },
  { code: 'TD', name: 'Chad',                      emoji: '🇹🇩', tag: 'Sahara & Ennedi Plateau',    color: '#002664' },
  { code: 'KM', name: 'Comoros',                   emoji: '🇰🇲', tag: 'Volcanic Islands & Reefs',   color: '#3A75C4' },
  { code: 'CD', name: 'DR Congo',                  emoji: '🇨🇩', tag: 'Virunga & Congo River',      color: '#007FFF' },
  { code: 'CG', name: 'Republic of Congo',         emoji: '🇨🇬', tag: 'Congo Basin & Gorillas',     color: '#009543' },
  { code: 'CI', name: "Côte d'Ivoire",             emoji: '🇨🇮', tag: 'Beaches & Rainforest',       color: '#F77F00' },
  { code: 'DJ', name: 'Djibouti',                  emoji: '🇩🇯', tag: 'Salt Lakes & Red Sea',       color: '#12AD2B' },
  { code: 'GQ', name: 'Equatorial Guinea',         emoji: '🇬🇶', tag: 'Rainforest & Islands',       color: '#3E9A00' },
  { code: 'ER', name: 'Eritrea',                   emoji: '🇪🇷', tag: 'Red Sea & Ancient Cities',   color: '#4189DD' },
  { code: 'SZ', name: 'Eswatini',                  emoji: '🇸🇿', tag: 'Safaris & Reed Dance',       color: '#3E5EB9' },
  { code: 'GA', name: 'Gabon',                     emoji: '🇬🇦', tag: 'Loango & Rainforest',        color: '#009E60' },
  { code: 'GM', name: 'Gambia',                    emoji: '🇬🇲', tag: 'River & Bird Watching',      color: '#3A7728' },
  { code: 'GN', name: 'Guinea',                    emoji: '🇬🇳', tag: 'Fouta Djallon Highlands',    color: '#CE1126' },
  { code: 'GW', name: 'Guinea-Bissau',             emoji: '🇬🇼', tag: 'Bijagós Archipelago',        color: '#CE1126' },
  { code: 'LS', name: 'Lesotho',                   emoji: '🇱🇸', tag: 'Mountain Kingdom & Skiing',  color: '#009A44' },
  { code: 'LR', name: 'Liberia',                   emoji: '🇱🇷', tag: 'Beaches & Rainforest',       color: '#BF0A30' },
  { code: 'LY', name: 'Libya',                     emoji: '🇱🇾', tag: 'Sahara & Roman Ruins',       color: '#239E46' },
  { code: 'ML', name: 'Mali',                      emoji: '🇲🇱', tag: 'Timbuktu & Niger River',     color: '#009A00' },
  { code: 'MR', name: 'Mauritania',                emoji: '🇲🇷', tag: 'Sahara & Ancient Cities',    color: '#006233' },
  { code: 'MU', name: 'Mauritius',                 emoji: '🇲🇺', tag: 'Beaches & Lagoons',          color: '#EA2839' },
  { code: 'MW', name: 'Malawi',                    emoji: '🇲🇼', tag: 'Lake Malawi & Wildlife',     color: '#339E35' },
  { code: 'NE', name: 'Niger',                     emoji: '🇳🇪', tag: 'Agadez & Sahara',            color: '#E05206' },
  { code: 'SC', name: 'Seychelles',                emoji: '🇸🇨', tag: 'Beaches & Coral Reefs',      color: '#003F87' },
  { code: 'SD', name: 'Sudan',                     emoji: '🇸🇩', tag: 'Nubian Pyramids & Nile',     color: '#D21034' },
  { code: 'SL', name: 'Sierra Leone',              emoji: '🇸🇱', tag: 'Beaches & Rainforest',       color: '#1EB53A' },
  { code: 'SO', name: 'Somalia',                   emoji: '🇸🇴', tag: 'Coastal Beauty & Heritage',  color: '#4189DD' },
  { code: 'SS', name: 'South Sudan',               emoji: '🇸🇸', tag: 'Sudd Wetlands & Wildlife',   color: '#078930' },
  { code: 'ST', name: 'São Tomé & Príncipe',       emoji: '🇸🇹', tag: 'Cocoa Islands & Beaches',    color: '#12AD2B' },
  { code: 'TG', name: 'Togo',                      emoji: '🇹🇬', tag: 'Beaches & Tamberma Castles', color: '#006A4E' },
  { code: 'ZM', name: 'Zambia',                    emoji: '🇿🇲', tag: 'Victoria Falls & Safaris',   color: '#198A00' },
  { code: 'ZW', name: 'Zimbabwe',                  emoji: '🇿🇼', tag: 'Victoria Falls & Ruins',     color: '#006400' },
];

const TRAVEL_TYPE_IDS = ['safari','beach','culture','adventure','food','wellness'];
const TRAVEL_TYPE_EMOJIS: Record<string,string> = {
  safari:'🦁', beach:'🏖️', culture:'🏛️', adventure:'🧗', food:'🍲', wellness:'🧘',
};

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
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
          <p className="text-white/70 text-sm mt-2 line-clamp-2">{article.summary}</p>
        )}
      </div>
    </a>
  );
}

function TravelCard({ article }: { article: TravelArticle }) {
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      className="group block bg-white border-b border-r border-gray-200 hover:bg-gray-50 overflow-hidden transition-colors">
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
  const { t } = useTranslation();
  const { countryCode } = useThemeStore();
  const [articles, setArticles] = useState<TravelArticle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);

  const fetchTravel = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/news?category=travel&limit=50');
      setArticles(r.data.items || []);
    } catch { setArticles([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTravel(); }, [fetchTravel]);

  const filtered = activeType
    ? articles.filter(a =>
        a.title.toLowerCase().includes(activeType) ||
        a.summary?.toLowerCase().includes(activeType) ||
        a.country.toLowerCase().includes(activeType))
    : articles;

  const hero     = filtered.filter(a => a.image)[0];
  const featured = filtered.filter(a => a.image && a !== hero).slice(0, 3);
  const rest     = filtered.filter(a => a !== hero && !featured.includes(a)).slice(0, 20);

  return (
    <div className="w-full min-h-screen bg-gray-50">

      {/* ── Masthead — full width ── */}
      <header className="w-full bg-white border-b-2 border-gray-900">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <SeshaaTitle countryCode={countryCode} staticSuffix="travels" size="lg" />
            <p className="text-xs text-gray-500 text-center sm:text-right max-w-sm">
              {t('travels.subtitle')}
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
            <button onClick={() => setActiveType(null)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full border transition-all ${
                !activeType ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
              }`}
              style={!activeType ? { backgroundColor: 'var(--cp)' } : {}}>
              🌍 {t('travels.all')}
            </button>
            {TRAVEL_TYPE_IDS.map(id => (
              <button key={id} onClick={() => setActiveType(activeType === id ? null : id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full border transition-all ${
                  activeType === id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
                }`}
                style={activeType === id ? { backgroundColor: 'var(--cp)' } : {}}>
                {TRAVEL_TYPE_EMOJIS[id]} {t(`travels.types.${id}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="w-full">

        {/* ── Destination guide strip — full width ── */}
        <section className="w-full bg-white border-b border-gray-200">
          <div className="w-full px-4 sm:px-6 lg:px-10 py-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
              <Compass size={12} className="inline mr-1 -mt-0.5" />{t('travels.destinations')}
            </h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {DESTINATIONS.map(dest => (
                <a key={dest.code} href={`/country/${dest.code}`}
                  className="shrink-0 group flex flex-col items-center gap-1.5 w-20">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-shadow border-2 border-white"
                    style={{ backgroundColor: dest.color + '20', borderColor: dest.color + '40' }}>
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
            <div className="lg:col-span-2 bg-gray-200 min-h-[380px]" />
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-200" />)}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Plane size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">{t('travels.noStories')}</p>
            <button onClick={fetchTravel}
              className="mt-3 px-4 py-2 text-sm font-bold rounded-full text-white" style={{ backgroundColor: 'var(--cp)' }}>
              {t('travels.refresh')}
            </button>
          </div>
        ) : (
          <>
            {/* Hero grid — full width */}
            <section className="w-full border-b-2 border-gray-900">
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-300">
                {hero && <div className="lg:col-span-7"><HeroTravel article={hero} /></div>}
                <div className="lg:col-span-5 bg-white divide-y divide-gray-200">
                  {featured.map(article => (
                    <a key={article.id} href={article.link} target="_blank" rel="noopener noreferrer"
                      className="group flex gap-3 p-4 hover:bg-gray-50 transition-colors">
                      {article.image && (
                        <div className="shrink-0 w-28 h-24 overflow-hidden bg-gray-100">
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

            {/* More stories — full width */}
            <section className="w-full bg-white border-b border-gray-200">
              <div className="w-full px-4 sm:px-6 lg:px-10 pt-4 pb-2 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">
                  <Camera size={12} className="inline mr-1 -mt-0.5" />{t('travels.moreStories')}
                </h2>
                <span className="text-xs text-gray-400">{t('travels.stories', { count: rest.length })}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 divide-x divide-y divide-gray-200">
                {rest.map(article => <TravelCard key={article.id} article={article} />)}
              </div>
            </section>

            {/* Book Africa CTA — full width, edge-to-edge */}
            <section className="w-full px-6 sm:px-8 lg:px-12 py-12 bg-gray-900 text-white text-center">
              <div className="text-4xl mb-3">✈️🌍</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-3">{t('travels.cta.title')}</h2>
              <p className="text-white/70 text-sm sm:text-base mb-6 max-w-2xl mx-auto">
                {t('travels.cta.body')}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="/search?category=hotel"
                  className="px-6 py-3 rounded-full font-bold text-sm"
                  style={{ backgroundColor: 'var(--ca,#FCD116)', color: 'var(--cp,#008751)' }}>
                  🏨 {t('travels.cta.hotels')}
                </a>
                <a href="/search?category=transport"
                  className="px-6 py-3 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">
                  🚗 {t('travels.cta.transport')}
                </a>
                <a href="/search?category=restaurant"
                  className="px-6 py-3 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 transition-colors">
                  🍽️ {t('travels.cta.food')}
                </a>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
