import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Zap, Users, Building2, Landmark, Heart, Sparkles, TrendingUp, Volume2, VolumeX,
  Utensils, HeartPulse, GraduationCap, Banknote, Bus, BedDouble,
  Laptop, Scissors, Wrench, Wheat, Church, HardHat,
} from 'lucide-react';
import { listingsApi, adminApi } from '../services/api';
import ListingCard from '../components/directory/ListingCard';
import type { Listing } from '../types';

// ── Uganda YouTube ad rotation (admin can override via CMS) ──────────────────
// Random Ugandan brand / tourism videos for the hero ad slot
const UGANDA_VIDEOS = [
  'T2RpwsMIhRg',   // Uganda (default demo)
  'mCEJBpBpX1s',   // Uganda Pearl of Africa tourism
  'GCDJBaFKKyE',   // Visit Uganda
  'oCr_M7dQ3_Y',   // Stanbic Bank Uganda
  'h3yRY3OwJlc',   // MTN Uganda
];

function randomUgandaVideo() {
  return UGANDA_VIDEOS[Math.floor(Math.random() * UGANDA_VIDEOS.length)];
}

const CATEGORIES: { key: string; icon: React.ReactNode; color: string }[] = [
  { key: 'restaurant',   icon: <Utensils      size={44} strokeWidth={1.5} />, color: '#e67e22' },
  { key: 'health',       icon: <HeartPulse    size={44} strokeWidth={1.5} />, color: '#e74c3c' },
  { key: 'education',    icon: <GraduationCap size={44} strokeWidth={1.5} />, color: '#3498db' },
  { key: 'finance',      icon: <Banknote      size={44} strokeWidth={1.5} />, color: '#27ae60' },
  { key: 'transport',    icon: <Bus           size={44} strokeWidth={1.5} />, color: '#9b59b6' },
  { key: 'hotel',        icon: <BedDouble     size={44} strokeWidth={1.5} />, color: '#1abc9c' },
  { key: 'tech',         icon: <Laptop        size={44} strokeWidth={1.5} />, color: '#2980b9' },
  { key: 'beauty',       icon: <Scissors      size={44} strokeWidth={1.5} />, color: '#e91e8c' },
  { key: 'auto',         icon: <Wrench        size={44} strokeWidth={1.5} />, color: '#7f8c8d' },
  { key: 'agriculture',  icon: <Wheat         size={44} strokeWidth={1.5} />, color: '#f39c12' },
  { key: 'church',       icon: <Church        size={44} strokeWidth={1.5} />, color: '#8e44ad' },
  { key: 'construction', icon: <HardHat       size={44} strokeWidth={1.5} />, color: '#d35400' },
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

interface HeroConfig {
  mediaType: 'youtube' | 'image' | 'video' | 'default';
  mediaUrl: string;
  overlayTitle: string;
  overlaySubtitle: string;
  ctaText: string;
  ctaUrl: string;
  advertiser: string;
}

const DEFAULT_HERO: HeroConfig = {
  mediaType: 'youtube',
  mediaUrl: `https://www.youtube.com/embed/${randomUgandaVideo()}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0&showinfo=0&playlist=${randomUgandaVideo()}`,
  overlayTitle: 'Seshaa and you will find.',
  overlaySubtitle: 'Africa\'s business directory — all 54 countries',
  ctaText: 'Book this ad spot →',
  ctaUrl: '/advertise',
  advertiser: 'Demo — Uganda Tourism',
};

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery]     = useState('');
  const [aiMode, setAiMode]   = useState(false);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [hero, setHero]       = useState<HeroConfig>(DEFAULT_HERO);
  const [muted, setMuted]     = useState(true);
  const [slideIdx, setSlideIdx] = useState(0);

  // Paid ad slides — admin can override the first one via hero CMS
  const adSlides = UGANDA_VIDEOS.map((vid, i) => ({
    mediaType: 'youtube' as const,
    mediaUrl:  `https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0&showinfo=0&playlist=${vid}`,
    advertiser: i === 0 ? 'Uganda Tourism Board' : i === 1 ? 'Pearl of Africa' : i === 2 ? 'Visit Uganda' : i === 3 ? 'Stanbic Bank' : 'MTN Uganda',
    ctaText: 'Book this ad spot →',
    ctaUrl: '/advertise',
  }));

  // Auto-rotate slides every 12 seconds
  useEffect(() => {
    const id = setInterval(() => setSlideIdx(i => (i + 1) % adSlides.length), 12000);
    return () => clearInterval(id);
  }, [adSlides.length]);

  useEffect(() => {
    listingsApi.search({ limit: 6 }).then(r => setFeatured(r.data.listings)).catch(() => {});
    // Load admin-configured hero
    adminApi.getHero().then(r => {
      if (r.data?.description) {
        try {
          const d = JSON.parse(r.data.description) as HeroConfig;
          if (d.mediaType) setHero(d);
        } catch { /* keep default */ }
      }
    }).catch(() => {});
  }, []);

  const handleSearch = () => {
    if (!query.trim()) return;
    if (aiMode) navigate(`/search?ai=1&q=${encodeURIComponent(query)}`);
    else navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  // Build YouTube src with mute toggle
  const ytSrc = hero.mediaType === 'youtube' && hero.mediaUrl
    ? hero.mediaUrl.replace(/[?&]mute=\d/, '') +
      (hero.mediaUrl.includes('?') ? '&' : '?') + `mute=${muted ? 1 : 0}`
    : '';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO — full viewport height minus navbar, paid ad slideshow ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 'calc(100svh - 86px)', minHeight: 360 }}
      >
        {/* Ad slideshow media layers — render all, show active via opacity */}
        {adSlides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden transition-opacity duration-1000"
            style={{ opacity: i === slideIdx ? 1 : 0, zIndex: i === slideIdx ? 1 : 0 }}
          >
            <iframe
              src={slide.mediaUrl.replace('mute=1', `mute=${muted ? 1 : 0}`)}
              title={`Hero Ad ${i + 1}`}
              frameBorder="0"
              allow="autoplay; fullscreen"
              allowFullScreen
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '177.78vh',
                height: '100%',
                minWidth: '100%',
                minHeight: '56.25vw',
                pointerEvents: 'none',
              }}
            />
          </div>
        ))}

        {/* Admin-configured hero override replaces slide 0 when set */}
        {hero.mediaType !== 'default' && slideIdx === 0 && (
          hero.mediaType === 'youtube' && ytSrc ? (
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
              <iframe
                src={ytSrc}
                title="Seshaa Hero Ad"
                frameBorder="0"
                allow="autoplay; fullscreen"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '177.78vh',
                  height: '100%',
                  minWidth: '100%',
                  minHeight: '56.25vw',
                  pointerEvents: 'none',
                }}
              />
            </div>
          ) : hero.mediaType === 'image' && hero.mediaUrl ? (
            <img src={hero.mediaUrl} alt="Hero banner" className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 2 }} />
          ) : hero.mediaType === 'video' && hero.mediaUrl ? (
            <video src={hero.mediaUrl} autoPlay muted={muted} loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 2 }} />
          ) : null
        )}

        {/* Dark scrim over video for text readability */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 3,
            background: hero.mediaType === 'default'
              ? 'linear-gradient(135deg, var(--cp-dark, #004d2b), var(--cp, #008751))'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.72) 100%)',
          }}
        />

        {/* Content overlay — vertically centred in full-height hero */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 pb-20 text-center text-white">
          <div className="max-w-4xl w-full">
            <h1
              className="font-black mb-2 drop-shadow-lg whitespace-nowrap"
              style={{ fontSize: 'clamp(1.15rem, 4.5vw, 3.2rem)', lineHeight: 1.15 }}
            >
              {t('app.tagline')}
            </h1>
            <p className="text-white/85 text-base md:text-lg mb-6 leading-relaxed drop-shadow">
              {t('app.description')}
            </p>

            {/* Search bar */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl mx-auto">
              <div className="flex items-center gap-2 px-4 py-1">
                {aiMode
                  ? <Sparkles size={22} className="text-purple-500 shrink-0" />
                  : <Search size={22} className="text-gray-400 shrink-0" />
                }
                <input
                  className="flex-1 outline-none text-gray-800 text-lg py-3 placeholder-gray-400 min-w-0"
                  placeholder={aiMode ? 'Ask anything… "find a hospital in Kampala"' : t('search.placeholder')}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button
                  className={`flex items-center gap-1 text-sm px-3 py-2 rounded-xl font-bold transition-colors shrink-0 ${
                    aiMode ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                  }`}
                  onClick={() => setAiMode(v => !v)}
                >
                  <Zap size={16} /> AI
                </button>
              </div>
              <button
                className="w-full py-3.5 font-bold text-white text-lg"
                style={{ backgroundColor: 'var(--cp)' }}
                onClick={handleSearch}
              >
                {t('search.searchBtn')} →
              </button>
            </div>

            {/* Type filters */}
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {[
                { type: 'PERSONAL',   icon: <Users size={16} />,    label: t('listing.personal') },
                { type: 'BUSINESS',   icon: <Building2 size={16} />, label: t('listing.business') },
                { type: 'GOVERNMENT', icon: <Landmark size={16} />,  label: t('listing.government') },
                { type: 'NGO',        icon: <Heart size={16} />,     label: t('listing.ngo') },
              ].map(({ type, icon, label }) => (
                <button
                  key={type}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40 px-4 py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm"
                  onClick={() => navigate(`/search?type=${type}`)}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Slide controls bar: advertiser · dot nav · mute */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-between px-4 gap-3">
          {/* Advertiser badge + CTA */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs bg-black/50 text-white/70 px-2.5 py-1 rounded-full backdrop-blur-sm truncate">
              📢 {adSlides[slideIdx].advertiser}
            </span>
            <a
              href={adSlides[slideIdx].ctaUrl}
              className="text-xs bg-white/90 text-gray-900 font-bold px-3 py-1.5 rounded-full hover:bg-white whitespace-nowrap"
            >
              {adSlides[slideIdx].ctaText}
            </a>
          </div>

          {/* Slide dot navigation */}
          <div className="flex items-center gap-1.5 shrink-0">
            {adSlides.map((_, i) => (
              <button
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === slideIdx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
                onClick={() => setSlideIdx(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Mute toggle */}
          <button
            className="p-2 bg-black/40 text-white rounded-full backdrop-blur-sm hover:bg-black/60 shrink-0"
            onClick={() => setMuted(v => !v)}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* ── COUNTRIES — flag fills button, text below ── */}
      <div className="w-full px-4 sm:px-6 py-6">
        <h2 className="text-xl font-black text-gray-800 mb-3">🌍 Browse by Country</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-11 xl:grid-cols-14 gap-2 sm:gap-3">
          {AFRICAN_COUNTRIES.map(c => (
            <button
              key={c.code}
              className="relative overflow-hidden rounded-2xl hover:ring-2 hover:ring-[var(--cp)] hover:shadow-lg active:scale-95 transition-all aspect-square"
              onClick={() => navigate(`/search?country=${c.code}`)}
            >
              {/* Flag emoji scaled up to fill the card */}
              <span
                className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
                style={{ fontSize: 'clamp(60px, 12vw, 96px)', lineHeight: 1 }}
              >
                {c.flag}
              </span>
              {/* Country name overlaid on a bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pb-1.5 pt-6 px-1 text-center">
                <span className="text-[10px] sm:text-[11px] font-bold text-white drop-shadow-sm leading-tight block truncate">
                  {c.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <div className="w-full px-4 sm:px-6 pb-6">
        <h2 className="text-xl font-black text-gray-800 mb-3">📂 Browse by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-12 gap-3">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              className="flex flex-col items-center gap-3 py-5 px-2 bg-white rounded-2xl border border-gray-100 hover:shadow-lg active:scale-95 transition-all group"
              onClick={() => navigate(`/search?category=${c.key}`)}
            >
              {/* Monster-style icon: solid colour pill with white icon */}
              <div
                className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"
                style={{ backgroundColor: c.color }}
              >
                <span className="text-white">{c.icon}</span>
              </div>
              <span className="text-xs font-bold text-gray-700 text-center leading-tight">
                {t(`categories.${c.key}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── FEATURED LISTINGS ── */}
      <div className="w-full px-4 sm:px-6 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-green-600" />
          <h2 className="text-xl font-bold text-gray-800">Featured Listings</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {featured.map(l => <ListingCard key={l.id} listing={l} />)}
        </div>
      </div>

      {/* ── ADVERTISE HERE — full viewport width ── */}
      <section className="w-full py-14 px-4"
        style={{ background: 'linear-gradient(135deg, #f97316, #eab308)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
            {/* Left: pitch */}
            <div className="text-white">
              <p className="text-sm font-bold uppercase tracking-widest text-white/70 mb-2">📢 Sponsored Slot Available</p>
              <h2 className="text-2xl md:text-4xl font-black leading-tight mb-4">
                Reach Thousands of Africans Daily
              </h2>
              <p className="text-white/85 text-lg mb-6 leading-relaxed">
                Seshaa is Africa's fastest-growing business directory — used across all 54 countries.
                Put your brand in front of exactly the right audience: by country, city, category, and language.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/advertise"
                  className="inline-flex items-center gap-2 bg-white text-orange-600 font-black px-7 py-3.5 rounded-2xl text-base hover:bg-orange-50 transition-colors shadow-lg"
                >
                  📢 Buy Advertising Now
                </a>
                <a
                  href="/advertise"
                  className="inline-flex items-center gap-2 border-2 border-white/40 text-white font-bold px-6 py-3.5 rounded-2xl text-base hover:bg-white/10 transition-colors"
                >
                  View Packages →
                </a>
              </div>
            </div>
            {/* Right: stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '54',      label: 'African Countries',       icon: '🌍' },
                { value: '14',      label: 'Local Languages',          icon: '🗣️' },
                { value: '50K+',    label: 'Daily Active Users',       icon: '👥' },
                { value: '20%',     label: 'Sales Rep Commission',     icon: '💰' },
              ].map(s => (
                <div key={s.label} className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 text-white text-center">
                  <p className="text-3xl mb-1">{s.icon}</p>
                  <p className="text-2xl font-black">{s.value}</p>
                  <p className="text-xs text-white/80 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ad packages preview */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: 'Banner',    price: '$20/mo',  desc: 'Sidebar banner, city-targeted',         color: 'bg-white/10' },
              { name: 'Featured',  price: '$60/mo',  desc: 'Top of search results, highlighted',    color: 'bg-white/20', popular: true },
              { name: 'Premium',   price: '$150/mo', desc: 'Hero homepage placement + video slot',  color: 'bg-white/10' },
            ].map(p => (
              <a key={p.name} href="/advertise"
                className={`${p.color} border border-white/30 rounded-2xl p-5 text-white hover:bg-white/30 transition-colors relative`}>
                {p.popular && (
                  <span className="absolute -top-2.5 left-4 bg-white text-orange-600 text-xs font-black px-3 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}
                <p className="font-black text-lg">{p.name}</p>
                <p className="text-2xl font-black text-white mt-1">{p.price}</p>
                <p className="text-sm text-white/75 mt-1">{p.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── BECOME A SALES REP — full viewport width ── */}
      <section className="w-full py-14 px-4"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #3730a3)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Left: job pitch */}
            <div className="text-white">
              <p className="text-sm font-bold uppercase tracking-widest text-purple-300 mb-2">💼 Work From Anywhere in Africa</p>
              <h2 className="text-2xl md:text-4xl font-black leading-tight mb-4">
                Become a Seshaa Sales Rep
              </h2>
              <p className="text-purple-100 text-lg mb-5 leading-relaxed">
                Earn <strong className="text-white">20% commission</strong> on every ad deal you close —
                no ceiling, no upfront costs. Sell to local businesses in your city and get paid weekly.
              </p>

              {/* Perks */}
              <ul className="space-y-3 mb-8">
                {[
                  { icon: '💸', text: '20% commission — avg deal is $60–$500' },
                  { icon: '📱', text: 'Work from your phone, anywhere in Africa' },
                  { icon: '🏦', text: 'Get paid via M-Pesa, MTN MoMo, Airtel Money or bank transfer' },
                  { icon: '📊', text: 'Your own dashboard to track sales and commissions' },
                  { icon: '🌍', text: 'Sell in your own territory — country or city' },
                  { icon: '🤝', text: 'Seshaa provides training materials and pitch decks' },
                ].map(p => (
                  <li key={p.icon} className="flex items-start gap-3 text-purple-100">
                    <span className="text-xl shrink-0 mt-0.5">{p.icon}</span>
                    <span className="text-base">{p.text}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/salesrep"
                className="inline-flex items-center gap-2 bg-white text-purple-700 font-black px-8 py-4 rounded-2xl text-lg hover:bg-purple-50 transition-colors shadow-xl"
              >
                Apply Now — It's Free →
              </a>
            </div>

            {/* Right: how it works */}
            <div className="space-y-4">
              <h3 className="text-white font-black text-xl mb-2">How It Works</h3>
              {[
                { step: '01', title: 'Apply in 2 minutes', desc: 'Fill in your name, country, and city. No qualifications needed — just hustle.' },
                { step: '02', title: 'Get your rep code', desc: 'You\'ll receive a unique referral code and access to sales materials.' },
                { step: '03', title: 'Find local businesses', desc: 'Visit restaurants, clinics, hotels, shops — anyone who wants more customers.' },
                { step: '04', title: 'Close the deal', desc: 'Show them Seshaa. Packages start at just $20/month — easy sell.' },
                { step: '05', title: 'Earn your commission', desc: 'We track everything automatically. Get paid weekly, no chasing.' },
              ].map(s => (
                <div key={s.step} className="flex gap-4 bg-white/10 border border-white/20 rounded-2xl p-4">
                  <span className="text-purple-300 font-black text-lg shrink-0 w-8">{s.step}</span>
                  <div>
                    <p className="font-bold text-white">{s.title}</p>
                    <p className="text-sm text-purple-200 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}

              {/* Earnings calculator */}
              <div className="bg-white/15 border border-white/30 rounded-2xl p-5 mt-2">
                <p className="font-black text-white mb-3">💡 Example Earnings</p>
                {[
                  { deals: '5 deals/month', avg: '$60 avg', earn: '$60/mo' },
                  { deals: '10 deals/month', avg: '$100 avg', earn: '$200/mo' },
                  { deals: '20 deals/month', avg: '$150 avg', earn: '$600/mo' },
                ].map(e => (
                  <div key={e.deals} className="flex justify-between text-sm py-2 border-b border-white/10 last:border-0">
                    <span className="text-purple-200">{e.deals} · {e.avg}</span>
                    <span className="font-black text-green-300">{e.earn}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
