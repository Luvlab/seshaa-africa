import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Zap, Users, Building2, Landmark, Heart, Sparkles,
  Utensils, HeartPulse, GraduationCap, Banknote, Bus, BedDouble,
  Laptop, Scissors, Wrench, Wheat, Church, HardHat, Download,
} from 'lucide-react';
import { adminApi } from '../services/api';
import VisitorDashboard from '../components/home/VisitorDashboard';
import { useThemeStore } from '../store/theme';
import { useCountriesStore } from '../store/countries';
import { usePWAInstall } from '../hooks/usePWAInstall';

// ── Hero slide type ─────────────────────────────────────────────────────────
interface HeroSlide {
  id?: string;
  youtubeId?: string;
  mediaType?: 'youtube' | 'image' | 'video' | 'default' | string;
  mediaUrl?: string;
  imageUrl?: string;
  advertiser: string;
  overlayTitle?: string;
  overlaySubtitle?: string;
  ctaText?: string;
  targetUrl?: string;
  ctaUrl?: string;
  startTime?: number;   // video in-point (seconds)
  endTime?: number;     // video out-point (seconds)
}

// ── Fallback hardcoded slides (used when no DB slides configured) ──────────
const FALLBACK_SLIDES: HeroSlide[] = [
  { youtubeId: 'T2RpwsMIhRg', advertiser: 'Uganda Tourism Board',  ctaUrl: '/advertise', mediaType: 'youtube', startTime: 0, endTime: 9 },
  { youtubeId: 'mCEJBpBpX1s', advertiser: 'Pearl of Africa',       ctaUrl: '/advertise', mediaType: 'youtube', startTime: 0, endTime: 9 },
  { youtubeId: 'GCDJBaFKKyE', advertiser: 'Visit Uganda',          ctaUrl: '/advertise', mediaType: 'youtube', startTime: 0, endTime: 9 },
  { youtubeId: 'oCr_M7dQ3_Y', advertiser: 'Stanbic Bank Uganda',   ctaUrl: '/advertise', mediaType: 'youtube', startTime: 0, endTime: 9 },
  { youtubeId: 'h3yRY3OwJlc', advertiser: 'MTN Uganda',            ctaUrl: '/advertise', mediaType: 'youtube', startTime: 0, endTime: 9 },
];

// ── Per-slide display duration ──────────────────────────────────────────────
const DEFAULT_SLIDE_MS = 12_000;

/** Returns how many ms this slide should display.
 *  If both startTime and endTime are set, uses (endTime – startTime) × 1000.
 *  Falls back to DEFAULT_SLIDE_MS (12 s). */
function slideDurationMs(slide: HeroSlide): number {
  const start = slide?.startTime ?? 0;
  const end   = slide?.endTime   ?? 0;
  if (end > 0 && end > start) return (end - start) * 1_000;
  return DEFAULT_SLIDE_MS;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ytSrc(videoId: string, muted: boolean, startTime?: number, endTime?: number) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.seshaa.africa';
  const parts = [
    `https://www.youtube.com/embed/${videoId}`,
    `?autoplay=1`,
    `&mute=${muted ? 1 : 0}`,
    `&playsinline=1`,
    `&loop=1`,
    `&playlist=${videoId}`,
    `&controls=0`,
    `&fs=0`,
    `&disablekb=1`,
    `&modestbranding=1`,
    `&rel=0`,
    `&iv_load_policy=3`,
    `&cc_load_policy=0`,
    `&enablejsapi=1`,
    `&origin=${encodeURIComponent(origin)}`,
  ];
  if (startTime != null && startTime > 0) parts.push(`&start=${Math.round(startTime)}`);
  if (endTime != null && endTime > 0)   parts.push(`&end=${Math.round(endTime)}`);
  return parts.join('');
}

// Extract YouTube video ID from a full URL or embed URL or bare ID
function extractYoutubeId(url: string): string {
  if (!url) return '';
  const cleaned = url.trim();
  const embedMatch = cleaned.match(/embed\/([^?&"'>]+)/);
  if (embedMatch) return embedMatch[1];
  const watchMatch = cleaned.match(/[?&]v=([^&"'>]+)/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = cleaned.match(/youtu\.be\/([^?&"'>]+)/);
  if (shortMatch) return shortMatch[1];
  const shortsMatch = cleaned.match(/shorts\/([^?&"'>]+)/);
  if (shortsMatch) return shortsMatch[1];
  const liveMatch = cleaned.match(/live\/([^?&"'>]+)/);
  if (liveMatch) return liveMatch[1];
  // If it looks like a bare video ID (11 chars, no slashes)
  if (/^[\w-]{11}$/.test(cleaned)) return cleaned;
  const genericMatch = cleaned.match(/([\w-]{11})/);
  if (genericMatch) return genericMatch[1];
  return '';
}

function normalizeMediaType(raw: string | undefined, source: string): 'youtube' | 'image' | 'video' | 'default' {
  const kind = (raw || '').trim().toLowerCase();
  if (kind === 'youtube' || kind === 'image' || kind === 'video' || kind === 'default') return kind;
  if (extractYoutubeId(source)) return 'youtube';
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(source)) return 'video';
  if (/\.(png|jpg|jpeg|gif|webp|avif|svg)(\?|$)/i.test(source)) return 'image';
  return 'default';
}


// All categories now use the theme primary color (monochrome / country-themed)
const CATEGORY_COLORS: Record<string, string> = {
  restaurant: 'var(--cp)', health: 'var(--cp)', education: 'var(--cp)',
  finance: 'var(--cp)', transport: 'var(--cp)', hotel: 'var(--cp)',
  tech: 'var(--cp)', beauty: 'var(--cp)', auto: 'var(--cp)',
  agriculture: 'var(--cp)', church: 'var(--cp)', construction: 'var(--cp)',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  restaurant:   <Utensils      size={44} strokeWidth={1.5} />,
  health:       <HeartPulse    size={44} strokeWidth={1.5} />,
  education:    <GraduationCap size={44} strokeWidth={1.5} />,
  finance:      <Banknote      size={44} strokeWidth={1.5} />,
  transport:    <Bus           size={44} strokeWidth={1.5} />,
  hotel:        <BedDouble     size={44} strokeWidth={1.5} />,
  tech:         <Laptop        size={44} strokeWidth={1.5} />,
  beauty:       <Scissors      size={44} strokeWidth={1.5} />,
  auto:         <Wrench        size={44} strokeWidth={1.5} />,
  agriculture:  <Wheat         size={44} strokeWidth={1.5} />,
  church:       <Church        size={44} strokeWidth={1.5} />,
  construction: <HardHat       size={44} strokeWidth={1.5} />,
};

const CATEGORY_KEYS = [
  'restaurant', 'health', 'education', 'finance', 'transport', 'hotel',
  'tech', 'beauty', 'auto', 'agriculture', 'church', 'construction',
];

const AFRICAN_COUNTRIES = [
  { code: 'NG', name: 'Nigeria',           flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya',             flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa',      flag: '🇿🇦' },
  { code: 'GH', name: 'Ghana',             flag: '🇬🇭' },
  { code: 'ET', name: 'Ethiopia',          flag: '🇪🇹' },
  { code: 'TZ', name: 'Tanzania',          flag: '🇹🇿' },
  { code: 'EG', name: 'Egypt',             flag: '🇪🇬' },
  { code: 'CD', name: 'DR Congo',          flag: '🇨🇩' },
  { code: 'UG', name: 'Uganda',            flag: '🇺🇬' },
  { code: 'SN', name: 'Senegal',           flag: '🇸🇳' },
  { code: 'CI', name: "Côte d'Ivoire",     flag: '🇨🇮' },
  { code: 'CM', name: 'Cameroon',          flag: '🇨🇲' },
  { code: 'ML', name: 'Mali',              flag: '🇲🇱' },
  { code: 'GN', name: 'Guinea',            flag: '🇬🇳' },
  { code: 'RW', name: 'Rwanda',            flag: '🇷🇼' },
  { code: 'AO', name: 'Angola',            flag: '🇦🇴' },
  { code: 'MA', name: 'Morocco',           flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria',           flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisia',           flag: '🇹🇳' },
  { code: 'LY', name: 'Libya',             flag: '🇱🇾' },
  { code: 'SD', name: 'Sudan',             flag: '🇸🇩' },
  { code: 'MZ', name: 'Mozambique',        flag: '🇲🇿' },
  { code: 'ZW', name: 'Zimbabwe',          flag: '🇿🇼' },
  { code: 'ZM', name: 'Zambia',            flag: '🇿🇲' },
  { code: 'MG', name: 'Madagascar',        flag: '🇲🇬' },
  { code: 'BF', name: 'Burkina Faso',      flag: '🇧🇫' },
  { code: 'NE', name: 'Niger',             flag: '🇳🇪' },
  { code: 'BJ', name: 'Benin',             flag: '🇧🇯' },
  { code: 'TG', name: 'Togo',              flag: '🇹🇬' },
  { code: 'MW', name: 'Malawi',            flag: '🇲🇼' },
  { code: 'SL', name: 'Sierra Leone',      flag: '🇸🇱' },
  { code: 'LR', name: 'Liberia',           flag: '🇱🇷' },
  { code: 'GM', name: 'Gambia',            flag: '🇬🇲' },
  { code: 'GW', name: 'Guinea-Bissau',     flag: '🇬🇼' },
  { code: 'CV', name: 'Cape Verde',        flag: '🇨🇻' },
  { code: 'SO', name: 'Somalia',           flag: '🇸🇴' },
  { code: 'SS', name: 'South Sudan',       flag: '🇸🇸' },
  { code: 'BI', name: 'Burundi',           flag: '🇧🇮' },
  { code: 'DJ', name: 'Djibouti',          flag: '🇩🇯' },
  { code: 'ER', name: 'Eritrea',           flag: '🇪🇷' },
  { code: 'NA', name: 'Namibia',           flag: '🇳🇦' },
  { code: 'BW', name: 'Botswana',          flag: '🇧🇼' },
  { code: 'LS', name: 'Lesotho',           flag: '🇱🇸' },
  { code: 'SZ', name: 'Eswatini',          flag: '🇸🇿' },
  { code: 'MU', name: 'Mauritius',         flag: '🇲🇺' },
  { code: 'SC', name: 'Seychelles',        flag: '🇸🇨' },
  { code: 'KM', name: 'Comoros',           flag: '🇰🇲' },
  { code: 'ST', name: 'São Tomé',          flag: '🇸🇹' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
  { code: 'GA', name: 'Gabon',             flag: '🇬🇦' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'CG', name: 'Republic of Congo', flag: '🇨🇬' },
  { code: 'TD', name: 'Chad',              flag: '🇹🇩' },
  { code: 'MR', name: 'Mauritania',        flag: '🇲🇷' },
];


export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { countryCode } = useThemeStore();
  const { activeCountries } = useCountriesStore();
  const [query, setQuery]         = useState('');
  const [aiMode, setAiMode]       = useState(false);
  const [muted]                   = useState(true);
  const [slideIdx, setSlideIdx]   = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(() => shuffle(FALLBACK_SLIDES));
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const countriesScrollRef = useRef<HTMLDivElement>(null);
  const ugandaRef = useRef<HTMLButtonElement>(null);
  const { isInstallable, install } = usePWAInstall();

  // Load live hero slides from DB; pass country so geo-targeted slides are filtered correctly
  useEffect(() => {
    adminApi.getPublicHeroSlides(countryCode || undefined).then(r => {
      const slides: HeroSlide[] = ((r.data as HeroSlide[]) || []).map((s) => {
        const source = s.mediaUrl || s.youtubeId || s.imageUrl || '';
        const mediaType = normalizeMediaType(s.mediaType, source);
        const youtubeId = mediaType === 'youtube' ? extractYoutubeId(source) : s.youtubeId;
        return { ...s, mediaType, youtubeId, mediaUrl: source };
      }).filter((s) => s.mediaType !== 'youtube' || Boolean(s.youtubeId));
      if (slides.length > 0) setHeroSlides(shuffle(slides));
    }).catch(() => { /* keep fallback */ });
  }, []);

  // Auto-advance: each slide plays for exactly (endTime – startTime) seconds.
  // Resets whenever slideIdx or heroSlides changes (including manual dot clicks).
  useEffect(() => {
    const len = heroSlides.length;
    if (len <= 1) return;
    const ms = slideDurationMs(heroSlides[slideIdx]);
    const id = setTimeout(() => setSlideIdx(i => (i + 1) % len), ms);
    return () => clearTimeout(id);
  }, [heroSlides, slideIdx]);

  // Pre-position scroll at far right before first paint — no flash
  useLayoutEffect(() => {
    const el = countriesScrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  // On mount: sweep from far right → Uganda (first/active, centred), then switch theme after 2s
  useEffect(() => {
    let themeTimer: ReturnType<typeof setTimeout>;
    const timer = setTimeout(() => {
      const el  = countriesScrollRef.current;
      const uga = ugandaRef.current;
      if (!el || !uga) return;
      const scroller = el;
      const cRect = scroller.getBoundingClientRect();
      const uRect = uga.getBoundingClientRect();
      const target = scroller.scrollLeft + (uRect.left - cRect.left) - (cRect.width / 2 - uRect.width / 2);
      const from = scroller.scrollLeft;
      const duration = 2800;
      const t0 = performance.now();
      function ease(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
      function step(now: number) {
        const p = Math.min((now - t0) / duration, 1);
        scroller.scrollLeft = from + (target - from) * ease(p);
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          // Scroll done — wait 2s then switch to Uganda theme
          themeTimer = setTimeout(() => {
            useThemeStore.getState().applyTheme('UG');
          }, 2000);
        }
      }
      requestAnimationFrame(step);
    }, 900);
    return () => { clearTimeout(timer); clearTimeout(themeTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    if (!query.trim()) return;
    const p = new URLSearchParams({ q: query.trim() });
    if (aiMode) p.set('ai', '1');
    if (countryCode) p.set('country', countryCode);
    navigate(`/search?${p.toString()}`);
  };

  return (
    <div className="bg-gray-50">

      {/* ── HERO ── */}
      {(() => {
        const slide = heroSlides[slideIdx] ?? heroSlides[0];
        const rawUrl = slide?.mediaUrl ?? slide?.youtubeId ?? slide?.imageUrl ?? '';
        const mediaType = normalizeMediaType(slide?.mediaType, rawUrl);
        const ytId = mediaType === 'youtube' ? (slide?.youtubeId || extractYoutubeId(rawUrl)) : '';

        return (
          <div className="relative w-full overflow-hidden" style={{ height: 'calc(100svh - 86px - var(--player-bar-h, 0px))', minHeight: 360 }}>

            {/* Background media */}
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
              {mediaType === 'image' ? (
                <img key={`${slideIdx}-${rawUrl}`} src={rawUrl} alt={slide?.advertiser} className="absolute inset-0 w-full h-full object-cover" />
              ) : mediaType === 'video' ? (
                <video key={`${slideIdx}-${rawUrl}`} src={rawUrl} autoPlay muted loop playsInline
                  className="absolute inset-0 w-full h-full object-cover" />
              ) : mediaType === 'default' ? (
                <div className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(135deg, var(--cp,#008751) 0%, #1a1a2e 100%)' }} />
              ) : (
                <iframe
                  key={`${slideIdx}-${ytId}-${muted}`}
                  src={ytSrc(ytId, muted, slide?.startTime, slide?.endTime)}
                  title={`Hero Ad - ${slide?.advertiser}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="eager"
                  referrerPolicy="strict-origin-when-cross-origin"
                  style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '177.78vh', height: '100%',
                    minWidth: '100%', minHeight: '56.25vw',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
            {/* no darkening overlay — keep background fully visible */}

            {/* ── Hero content overlay — search pinned at top on all viewports ── */}
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-start pt-3 px-4 text-center text-white"
            >
              <div className="w-full">
                {/* Slogan — always visible, no slide subtitles */}
                <p className="text-white font-black drop-shadow-lg mb-3 tracking-tight"
                  style={{ fontSize: 'clamp(1.1rem, 3.5vw, 2.4rem)', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                  {t('app.tagline')}
                </p>
                <div ref={searchBoxRef} className="bg-white/75 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden max-w-3xl mx-auto border border-white/60">
                  <div className="flex flex-col md:flex-row items-stretch">
                    <div className="flex items-center gap-2 px-4 py-1 flex-1">
                      {aiMode ? <Sparkles size={22} className="text-purple-500 shrink-0" /> : <Search size={22} className="text-gray-500 shrink-0" />}
                      <input className="flex-1 outline-none text-gray-800 text-lg py-3 placeholder-gray-400 min-w-0 bg-transparent"
                        placeholder={t('search.placeholder')}
                        value={query} onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                      <button className={`flex items-center gap-1 text-sm px-3 py-2 rounded-xl font-bold transition-colors shrink-0 ${aiMode ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}
                        onClick={() => setAiMode(v => !v)}>
                        <Zap size={16} /> AI
                      </button>
                    </div>
                    <button className="py-3.5 md:py-0 md:px-8 font-bold text-white text-lg md:text-base shrink-0" style={{ backgroundColor: 'var(--cp)' }} onClick={handleSearch}>
                      {t('search.findBtn')} →
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  {[
                    { type: 'PERSONAL',   icon: <Users size={16} />,    label: t('listing.personal') },
                    { type: 'BUSINESS',   icon: <Building2 size={16} />, label: t('listing.business') },
                    { type: 'GOVERNMENT', icon: <Landmark size={16} />,  label: t('listing.government') },
                    { type: 'NGO',        icon: <Heart size={16} />,     label: t('listing.ngo') },
                  ].map(({ type, icon, label }) => (
                    <button key={type}
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40 px-4 py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm"
                      onClick={() => navigate(`/search?type=${type}`)}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom bar: dots + CTA only — no advertiser name */}
            <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-end px-4 gap-3">
              {heroSlides.length > 1 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {heroSlides.map((_, i) => (
                    <button key={i}
                      className={`rounded-full transition-all duration-300 ${i === slideIdx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`}
                      onClick={() => setSlideIdx(i)} aria-label={`Slide ${i + 1}`} />
                  ))}
                </div>
              )}
              {/* PWA install button — appears bottom-right when installable */}
              {isInstallable && (
                <button
                  onClick={install}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/90 hover:bg-white text-gray-900 rounded-full text-xs font-bold backdrop-blur-sm shadow-lg transition-all active:scale-95 shrink-0"
                  title="Install Seshaa app"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Install App</span>
                  <span className="sm:hidden">Install</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── CATEGORIES — full viewport width ── */}
      <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
        <h2 className="text-xl font-black text-gray-800 mb-4">{t('home.browseCategory')}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-3">
          {CATEGORY_KEYS.map(key => (
            <button key={key}
              className="flex flex-col items-center gap-2.5 py-5 px-2 bg-white rounded-2xl border border-gray-100 hover:shadow-md active:scale-95 transition-all group"
              onClick={() => navigate(`/search?category=${key}${countryCode ? `&country=${encodeURIComponent(countryCode)}` : ''}`)}>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center group-hover:opacity-90 transition-opacity"
                style={{ backgroundColor: CATEGORY_COLORS[key] }}>
                <span className="text-white [&>svg]:w-7 [&>svg]:h-7 sm:[&>svg]:w-9 sm:[&>svg]:h-9">{CATEGORY_ICONS[key]}</span>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-gray-700 text-center leading-tight">
                {t(`categories.${key}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── COUNTRIES — horizontal scroll, A→Z, auto-scrolls to Uganda on load ── */}
      <div className="w-full pb-6">
        <h2 className="text-xl font-black text-gray-800 mb-3 px-4 sm:px-6 lg:px-10">🌍 {t('home.browseCountry')}</h2>
        <div
          ref={countriesScrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto px-4 sm:px-6 lg:px-10 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[...AFRICAN_COUNTRIES].sort((a, b) => {
              const aA = activeCountries.includes(a.code);
              const bA = activeCountries.includes(b.code);
              if (aA !== bA) return aA ? -1 : 1;
              return a.name.localeCompare(b.name);
            }).map(c => {
            const isActive = activeCountries.includes(c.code);
            return (
              <button
                key={c.code}
                ref={c.code === 'UG' ? ugandaRef : undefined}
                className={`country-flag-btn flex-shrink-0 flex flex-col items-center gap-1 py-3 px-2 w-16 sm:w-20 bg-white rounded-2xl border-2 transition-all ${
                  isActive
                    ? 'border-[color:var(--cp)] shadow-md ring-2 ring-[color:var(--cp)] ring-offset-1'
                    : 'border-gray-100 opacity-30 grayscale cursor-not-allowed pointer-events-none'
                }`}
                onClick={isActive ? () => navigate(`/search?country=${encodeURIComponent(c.name)}`) : undefined}
                disabled={!isActive}>
                <span className="flag-emoji text-3xl sm:text-4xl leading-none select-none">
                  {c.flag}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-gray-900 text-center leading-tight w-full truncate px-0.5">
                  {t(`countries.${c.code}`, c.name)}
                </span>
                {!isActive && <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wide">Soon</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ADVERTISE — full viewport width, edge-to-edge ── */}
      <section className="w-full py-14 px-6 sm:px-8 lg:px-12"
        style={{ background: 'linear-gradient(135deg, #f97316, #eab308)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="text-white">
            <p className="text-sm font-bold uppercase tracking-widest text-white/70 mb-2">
              📢 {t('home.ad.slot')}
            </p>
            <h2 className="text-2xl md:text-4xl xl:text-5xl font-black leading-tight mb-4">
              {t('home.ad.title')}
            </h2>
            <p className="text-white/85 text-lg mb-6 leading-relaxed">
              {t('home.ad.body')}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/advertise"
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-black px-7 py-3.5 rounded-2xl text-base hover:bg-orange-50 transition-colors shadow-lg">
                📢 {t('home.ad.cta1')}
              </a>
              <a href="/advertise"
                className="inline-flex items-center gap-2 border-2 border-white/40 text-white font-bold px-6 py-3.5 rounded-2xl text-base hover:bg-white/10 transition-colors">
                {t('home.ad.cta2')}
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '54',   label: t('home.ad.countries'), icon: '🌍' },
              { value: '36',   label: t('home.ad.languages'), icon: '🗣️' },
              { value: '50K+', label: t('home.ad.users'),     icon: '👥' },
              { value: '20%',  label: t('home.ad.commission'),icon: '💰' },
            ].map(s => (
              <div key={s.label} className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 text-white text-center">
                <p className="text-3xl mb-1">{s.icon}</p>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs text-white/80 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: t('home.ad.banner'),   price: '$20/mo', desc: t('home.ad.bannerDesc'),   color: 'bg-white/10', popular: false },
            { name: t('home.ad.featured'), price: '$60/mo', desc: t('home.ad.featuredDesc'), color: 'bg-white/20', popular: true  },
            { name: t('home.ad.premium'),  price: '$150/mo',desc: t('home.ad.premiumDesc'),  color: 'bg-white/10', popular: false },
          ].map(p => (
            <a key={p.name} href="/advertise"
              className={`${p.color} border border-white/30 rounded-2xl p-5 text-white hover:bg-white/30 transition-colors relative`}>
              {p.popular && (
                <span className="absolute -top-2.5 left-4 bg-white text-orange-600 text-xs font-black px-3 py-0.5 rounded-full">
                  {t('home.ad.popular')}
                </span>
              )}
              <p className="font-black text-lg">{p.name}</p>
              <p className="text-2xl font-black text-white mt-1">{p.price}</p>
              <p className="text-sm text-white/75 mt-1">{p.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ── SALES REP — full viewport width, edge-to-edge ── */}
      <section className="w-full py-14 px-6 sm:px-8 lg:px-12"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #3730a3)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
          <div className="text-white">
            <p className="text-sm font-bold uppercase tracking-widest text-purple-300 mb-2">
              💼 {t('home.rep.badge')}
            </p>
            <h2 className="text-2xl md:text-4xl xl:text-5xl font-black leading-tight mb-4">
              {t('home.rep.title')}
            </h2>
            <p className="text-purple-100 text-lg mb-5 leading-relaxed">
              {t('home.rep.body')}
            </p>
            <ul className="space-y-3 mb-8">
              {[
                t('home.rep.perk1'), t('home.rep.perk2'), t('home.rep.perk3'),
                t('home.rep.perk4'), t('home.rep.perk5'), t('home.rep.perk6'),
              ].map((perk, i) => (
                <li key={i} className="flex items-start gap-3 text-purple-100">
                  <span className="text-xl shrink-0 mt-0.5">
                    {['💸','📱','🏦','📊','🌍','🤝'][i]}
                  </span>
                  <span className="text-base">{perk}</span>
                </li>
              ))}
            </ul>
            <a href="/salesrep"
              className="inline-flex items-center gap-2 bg-white text-purple-700 font-black px-8 py-4 rounded-2xl text-lg hover:bg-purple-50 transition-colors shadow-xl">
              {t('home.rep.cta')}
            </a>
          </div>
          <div className="space-y-4">
            <h3 className="text-white font-black text-xl mb-2">{t('home.rep.how')}</h3>
            {[
              { step: '01', title: t('home.rep.step1'), desc: t('home.rep.step1desc') },
              { step: '02', title: t('home.rep.step2'), desc: t('home.rep.step2desc') },
              { step: '03', title: t('home.rep.step3'), desc: t('home.rep.step3desc') },
              { step: '04', title: t('home.rep.step4'), desc: t('home.rep.step4desc') },
              { step: '05', title: t('home.rep.step5'), desc: t('home.rep.step5desc') },
            ].map(s => (
              <div key={s.step} className="flex gap-4 bg-white/10 border border-white/20 rounded-2xl p-4">
                <span className="text-purple-300 font-black text-lg shrink-0 w-8">{s.step}</span>
                <div>
                  <p className="font-bold text-white">{s.title}</p>
                  <p className="text-sm text-purple-200 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
            {/* Commission breakdown */}
            <div className="bg-white/15 border border-white/30 rounded-2xl p-5 mt-2">
              <p className="font-black text-white mb-3">💰 Commission Structure</p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white font-bold text-sm">Monthly Subscriptions</p>
                    <p className="text-purple-300 text-xs mt-0.5">Every plan you sign up — recurring every month</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-green-300 font-black text-xl">70%</p>
                    <p className="text-purple-300 text-xs">to you · 30% Seshaa</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white font-bold text-sm">Physical &amp; Digital Sales</p>
                    <p className="text-purple-300 text-xs mt-0.5">Items sold through Seshaa marketplace</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-green-300 font-black text-xl">π%</p>
                    <p className="text-purple-300 text-xs">3.14159… Seshaa fee only</p>
                  </div>
                </div>
              </div>
              <p className="font-black text-white mb-2 text-sm">💡 {t('home.rep.earnings')}</p>
              {[
                { deals: '5 subs/month',  avg: '$60 avg',  earn: '$210/mo'  },
                { deals: '10 subs/month', avg: '$100 avg', earn: '$700/mo' },
                { deals: '20 subs/month', avg: '$150 avg', earn: '$2,100/mo' },
              ].map(e => (
                <div key={e.deals} className="flex justify-between text-sm py-2 border-b border-white/10 last:border-0">
                  <span className="text-purple-200">{e.deals} · {e.avg}</span>
                  <span className="font-black text-green-300">{e.earn}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── VISITOR DASHBOARD — before footer ── */}
      <VisitorDashboard />

    </div>
  );
}
