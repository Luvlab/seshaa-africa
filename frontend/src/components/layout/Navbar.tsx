import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Menu, X, MessageCircle, Bell, User, ChevronDown, Sparkles, Globe,
  Home, Newspaper, Tag, BarChart2, Megaphone, PartyPopper,
  Star, Briefcase, Languages, Settings, Globe2, Archive,
  ShoppingBag, Radio, Car, Package, Truck, Plus,
  Wifi, Monitor, Smartphone, Tablet,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { adminApi } from '../../services/api';
import SeshaaTitle from '../brand/SeshaaTitle';
import CountryPicker from './CountryPicker';
import { LANGUAGES } from '../../i18n';
import clsx from 'clsx';
import type { PortalType } from '../../types';

// ── Helpers used in the mobile menu stats panel ────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K';
  return String(n);
}

interface MenuDevice {
  os: string; browser: string; device: string;
  screenW: number; screenH: number;
  connection: string; timezone: string; language: string;
}

function gatherMenuDevice(): MenuDevice {
  const ua  = navigator.userAgent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  let os = 'Unknown', browser = 'Browser', device = 'desktop';
  if (/Windows NT 10/.test(ua))  os = 'Windows 10/11';
  else if (/Mac OS X/.test(ua))  os = 'macOS';
  else if (/Android/.test(ua))   os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua))     os = 'Linux';
  if (/Edg\//.test(ua))          browser = 'Edge';
  else if (/Chrome\//.test(ua))  browser = 'Chrome';
  else if (/Safari\//.test(ua))  browser = 'Safari';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  if (/Mobi|Android.*Mobile/.test(ua)) device = 'mobile';
  else if (/Tablet|iPad|Android/.test(ua)) device = 'tablet';
  return {
    os, browser, device,
    screenW: screen.width, screenH: screen.height,
    connection: conn?.effectiveType ?? (conn?.type ?? '—'),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || '—',
  };
}

function MenuDevRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-white/10 last:border-0">
      <span className="text-[10px] text-white/50 shrink-0 w-16">{label}</span>
      <span className="text-[10px] text-white font-semibold truncate text-right">{value}</span>
    </div>
  );
}

// Maps route prefixes → the suffix shown in the navbar title logo
const PAGE_SUFFIX_MAP: [string, string][] = [
  ['/news',        'news'],
  ['/search',      'search'],
  ['/classifieds', 'classifieds'],
  ['/prices',      'prices'],
  ['/market',      'market'],
  ['/radio',       'radio'],
  ['/events',      'events'],
  ['/advertise',   'advertise'],
  ['/ambassador',  'ambassador'],
  ['/salesrep',    'salesrep'],
  ['/translate',   'translate'],
  ['/diaspora',    'diaspora'],
  ['/archive',     'archive'],
  ['/admin',       'admin'],
  ['/profile',     'profile'],
  ['/auth',        'auth'],
  ['/add-listing', 'add'],
  ['/listings',    'directory'],
  ['/bookings',    'bookings'],
  ['/ride',        'ride'],
  ['/delivery',    'delivery'],
  ['/transport',   'transport'],
];

const PORTAL_LABELS: Record<PortalType, string> = {
  consumer: 'Consumer',
  business: 'Business',
  advertiser: 'Advertiser',
  salesrep: 'Sales Rep',
  ambassador: 'Ambassador',
  admin: 'Admin',
};

// Icon component type — lets us render at any size (desktop vs mobile grid)
type IconComp = React.ComponentType<{ size?: number; className?: string }>;

interface Tab {
  id: string;
  path: string;
  tKey: string;
  Icon: IconComp;
  roles?: string[];
}

const ALL_TABS: Tab[] = [
  { id: 'home',        path: '/',           tKey: 'nav.home',        Icon: Home },
  { id: 'search',      path: '/search',     tKey: 'nav.search',      Icon: Search },
  { id: 'news',        path: '/news',       tKey: 'nav.news',        Icon: Newspaper },
  { id: 'classifieds', path: '/classifieds',tKey: 'nav.classifieds', Icon: Tag },
  { id: 'prices',      path: '/prices',     tKey: 'nav.prices',      Icon: BarChart2 },
  { id: 'market',      path: '/market',     tKey: 'nav.market',      Icon: ShoppingBag },
  { id: 'radio',       path: '/radio',      tKey: 'nav.radio',       Icon: Radio },
  { id: 'events',      path: '/events',     tKey: 'nav.events',      Icon: PartyPopper },
  { id: 'translate',   path: '/translate',  tKey: 'nav.translate',   Icon: Languages },
  { id: 'diaspora',    path: '/diaspora',   tKey: 'nav.diaspora',    Icon: Globe2 },
  { id: 'ride',        path: '/ride',       tKey: 'nav.ride',        Icon: Car },
  { id: 'delivery',    path: '/delivery',   tKey: 'nav.delivery',    Icon: Package },
  { id: 'transport',   path: '/transport',  tKey: 'nav.transport',   Icon: Truck },
  { id: 'archive',     path: '/archive',    tKey: 'nav.archive',     Icon: Archive },
  { id: 'advertise',   path: '/advertise',  tKey: 'nav.advertise',   Icon: Megaphone },
  { id: 'ambassador',  path: '/ambassador', tKey: 'nav.ambassador',  Icon: Star,     roles: ['AMBASSADOR', 'ADMIN'] },
  { id: 'salesrep',    path: '/salesrep',   tKey: 'nav.sales',       Icon: Briefcase, roles: ['SALES_REP', 'ADMIN'] },
  { id: 'admin',       path: '/admin',      tKey: 'nav.admin',       Icon: Settings,  roles: ['ADMIN'] },
];

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, portal, setPortal, logout } = useAuthStore();
  const { theme, countryCode, applyTheme } = useThemeStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Mobile menu stats panel state
  const [menuStats, setMenuStats] = useState<{ listings: number; users: number; countries: number; classifieds: number } | null>(null);
  const [menuDevice, setMenuDevice] = useState<MenuDevice | null>(null);
  const [menuIp, setMenuIp] = useState<string>('');

  // Keep --nav-h in sync with actual navbar height.
  // useLayoutEffect fires synchronously before browser paint → no flicker.
  useLayoutEffect(() => {
    const update = () => {
      if (navRef.current) {
        document.documentElement.style.setProperty('--nav-h', navRef.current.offsetHeight + 'px');
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [mobileOpen]);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  // Derive page-specific suffix from current route
  const pageSuffix = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return undefined;
    const match = PAGE_SUFFIX_MAP.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'));
    return match ? match[1] : undefined;
  }, [location.pathname]);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('seshaa-lang', code);
    const dir = LANGUAGES.find(l => l.code === code)?.dir || 'ltr';
    document.documentElement.dir = dir;
    setLangOpen(false);
  };

  const visibleTabs = ALL_TABS.filter(tab => {
    if (!tab.roles) return true;
    if (!user) return false;
    return tab.roles.includes(user.role);
  });

  const availablePortals = useMemo<PortalType[]>(() => {
    if (!user) return [];
    switch (user.role) {
      case 'ADMIN':         return ['consumer', 'business', 'advertiser', 'salesrep', 'ambassador', 'admin'];
      case 'SALES_REP':     return ['consumer', 'salesrep'];
      case 'AMBASSADOR':    return ['consumer', 'ambassador'];
      case 'BUSINESS_OWNER':return ['consumer', 'business', 'advertiser'];
      default:              return ['consumer'];
    }
  }, [user]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQ.trim()) {
      const q = new URLSearchParams({ q: searchQ.trim() });
      if (countryCode) q.set('country', countryCode);
      navigate(`/search?${q.toString()}`);
      setSearchQ('');
      setMobileOpen(false);
    }
  };

  const openChatPanel = () => {
    window.dispatchEvent(new CustomEvent('seshaa:chat-toggle', { detail: { tab: 'messages' } }));
  };

  const closeChatPanel = () => {
    window.dispatchEvent(new Event('seshaa:chat-close'));
  };

  const closeMenu = () => setMobileOpen(false);

  // Close mobile menu when chat is opened from bottom bar or anywhere
  useEffect(() => {
    const handler = () => setMobileOpen(false);
    window.addEventListener('seshaa:mobile-menu-close', handler);
    window.addEventListener('seshaa:chat-open', handler);
    return () => {
      window.removeEventListener('seshaa:mobile-menu-close', handler);
      window.removeEventListener('seshaa:chat-open', handler);
    };
  }, []);

  // Load stats + device info when the mobile menu opens
  useEffect(() => {
    if (!mobileOpen) return;
    adminApi.getPublicStats().then(r => setMenuStats(r.data)).catch(() => {});
    setMenuDevice(gatherMenuDevice());
    if (!menuIp) {
      fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then((d: { ip: string }) => setMenuIp(d.ip))
        .catch(() => {});
    }
  }, [mobileOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav ref={navRef} className={clsx('fixed top-0 left-0 right-0 z-50', !mobileOpen && 'shadow-md')} style={{ backgroundColor: 'var(--cp)' }}>
      {/* ── Main header row — full viewport width, 56px fixed height ── */}
      <div className="w-full px-4 sm:px-6 h-14 flex items-center gap-2">

        {/* Seshaa animated title
            mobile: flex-1 so the layout box is fixed — animating text inside doesn't shift siblings
            desktop: shrink-0 / natural width, search bar fills the gap instead */}
        <Link
          to="/"
          className="flex-1 md:flex-none md:shrink-0 min-w-0 flex h-full items-center self-stretch origin-left scale-[0.84] -translate-y-[1px] sm:scale-100 sm:translate-y-0"
          style={{ minWidth: 112 }}
        >
          <SeshaaTitle countryCode={countryCode} size="md" staticSuffix={pageSuffix} />
        </Link>

        {/* Country flag badge — desktop only in this position (between title and search) */}
        <button
          className="shrink-0 hidden md:flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1.5 rounded-full transition-colors ml-1"
          onClick={() => { closeChatPanel(); setCountryPickerOpen(true); }}
          title={`${theme.name} — tap to change`}
        >
          <span className="text-base leading-none">
            {countryCode
              ? countryCode.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')
              : '🌍'}
          </span>
          <span className="font-semibold">{countryCode ? theme.name : 'Africa'}</span>
          <ChevronDown size={10} />
        </button>

        {/* Search bar — grows to fill available space (desktop only) */}
        <div className="flex-1 hidden md:flex items-center bg-white/15 hover:bg-white/25 rounded-full px-3.5 py-1.5 gap-2 transition-colors h-9">
          <Search size={15} className="text-white/70 shrink-0" />
          <input
            className="bg-transparent text-white placeholder-white/60 outline-none flex-1 text-sm"
            placeholder={t('search.placeholder')}
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={handleSearch}
          />
          <button
            className="text-white/60 hover:text-white shrink-0"
            onClick={() => {
              const q = new URLSearchParams({ ai: '1', q: searchQ.trim() });
              if (countryCode) q.set('country', countryCode);
              navigate('/search?' + q.toString());
            }}
            title="AI Search"
          >
            <Sparkles size={14} />
          </button>
        </div>

        {/* Right controls — on mobile this is the entire right cluster: country + lang + menu */}
        <div className="flex items-center gap-1.5 ms-auto md:ms-0">

          {/* Country flag badge — mobile only (anchored here so it never shifts) */}
          <button
            className="md:hidden shrink-0 flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1.5 rounded-full transition-colors"
            onClick={() => { closeChatPanel(); setCountryPickerOpen(true); }}
            title={`${theme.name} — tap to change`}
          >
            <span className="text-base leading-none">
              {countryCode
                ? countryCode.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')
                : '🌍'}
            </span>
            <ChevronDown size={10} />
          </button>

          {/* Language */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 text-white/90 text-sm px-2 py-1 rounded-lg hover:bg-white/20"
              onClick={() => { closeChatPanel(); setLangOpen(v => !v); }}
            >
              <Globe size={15} className="shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide">{currentLang.code.slice(0, 2)}</span>
              <ChevronDown size={10} className="hidden sm:block" />
            </button>
            {langOpen && (
              <>
                {/* Mobile: full-screen panel between header and tab bar */}
                <div
                  className="md:hidden fixed left-0 right-0 z-[60] bg-white text-gray-800 flex flex-col overflow-hidden"
                  style={{ top: 'var(--nav-h, 56px)', bottom: 'var(--tab-h, 60px)' }}
                >
                  <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
                    <span className="text-sm font-semibold text-gray-800">Select Language</span>
                    <button onClick={() => setLangOpen(false)}><X size={16} className="text-gray-500" /></button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        className={clsx('w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex justify-between border-b border-gray-100',
                          lang.code === i18n.language && 'font-bold')}
                        style={lang.code === i18n.language ? { color: 'var(--cp)' } : {}}
                        onClick={() => changeLanguage(lang.code)}
                      >
                        <span>{lang.nativeName}</span>
                        <span className="text-gray-400 text-xs">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Desktop: dropdown */}
                <div className="hidden md:block absolute right-0 top-full mt-1 bg-white text-gray-800 rounded-xl shadow-2xl w-52 max-h-64 overflow-y-auto z-50">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      className={clsx('w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex justify-between',
                        lang.code === i18n.language && 'font-bold')}
                      style={lang.code === i18n.language ? { color: 'var(--cp)' } : {}}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      <span>{lang.nativeName}</span>
                      <span className="text-gray-400 text-xs">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Portal switcher */}
          {user && user.role !== 'ADMIN' && availablePortals.length > 1 && (
            <div className="relative">
              <button
                className="flex items-center gap-1 text-white text-xs px-2 py-1 rounded-lg hover:bg-white/20 border border-white/30"
                onClick={() => { closeChatPanel(); setPortalOpen(v => !v); }}
              >
                {PORTAL_LABELS[portal]} <ChevronDown size={11} />
              </button>
              {portalOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white text-gray-800 rounded-xl shadow-2xl w-40 z-50">
                  {availablePortals.map(p => (
                    <button
                      key={p}
                      className={clsx('w-full text-left px-4 py-2 text-sm hover:bg-gray-50', p === portal && 'font-bold')}
                      style={p === portal ? { color: 'var(--cp)' } : {}}
                      onClick={() => {
                        setPortal(p);
                        setPortalOpen(false);
                        const route = p === 'consumer' ? '/' : `/${p}`;
                        navigate(route);
                      }}
                    >
                      {PORTAL_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {user ? (
            <>
              <button onClick={openChatPanel} className="p-2 rounded-full hover:bg-white/20 text-white hidden sm:block" title="Messages">
                <MessageCircle size={18} />
              </button>
              <Link to="/profile" className="hidden md:block p-2 rounded-full hover:bg-white/20 text-white" title="Profile">
                <User size={18} />
              </Link>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden sm:inline-flex text-sm font-semibold px-3 py-1.5 rounded-full bg-white hover:bg-white/90"
              style={{ color: 'var(--cp)' }}
            >
              {t('auth.login')}
            </Link>
          )}

          {!user && (
            <button
              onClick={openChatPanel}
              className="hidden md:flex items-center gap-1.5 p-2 rounded-full hover:bg-white/20 text-white"
              title="Open chat"
            >
              <MessageCircle size={18} />
            </button>
          )}

          <button className="md:hidden p-2 text-white" onClick={() => { closeChatPanel(); setMobileOpen(v => !v); }}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Desktop tab strip ── full width, h-9 = 36px ── */}
      <div className="hidden md:flex items-center bg-black/15 border-t border-white/10 h-9">
        <div className="w-full h-full px-4 sm:px-6 flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {visibleTabs.map(tab => {
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            const isDiaspora = tab.id === 'diaspora';
            const { Icon } = tab;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative',
                  isDiaspora
                    ? isActive
                      ? 'text-yellow-300 bg-white/15 rounded-t-lg'
                      : 'text-yellow-400/80 hover:text-yellow-300 hover:bg-white/10 rounded-t-lg'
                    : isActive
                      ? 'text-white bg-white/20 rounded-t-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10 rounded-t-lg'
                )}
              >
                {isDiaspora && !isActive && (
                  <span className="absolute inset-0 rounded-t-lg border border-yellow-400/20 pointer-events-none" />
                )}
                <Icon size={15} />
                {t(tab.tKey)}
                {isActive && (
                  <span className={clsx(
                    'absolute bottom-0 left-2 right-2 h-0.5 rounded-t',
                    isDiaspora ? 'bg-yellow-400' : 'bg-white'
                  )} />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Mobile full-screen menu overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden mobile-menu-overlay fixed left-0 right-0 z-40 overflow-y-auto overscroll-contain"
          style={{
            top: 'calc(var(--nav-h, 56px) - 1px)',   /* -1px overlaps nav to kill sub-pixel gap */
            bottom: 0,
            background: 'var(--cp)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Inner: pb-24 clears the 64px tab bar + safe area */}
          <div className="px-4 pt-4 pb-24 space-y-4">

            {/* Search */}
            <div className="flex items-center bg-black/20 rounded-xl px-4 py-2.5 gap-2">
              <Search size={15} className="text-white/60 shrink-0" />
              <input
                className="bg-transparent text-white placeholder-white/50 outline-none flex-1 text-sm"
                placeholder={t('search.placeholder')}
                onKeyDown={handleSearch}
              />
            </div>

            {/* Add Listing CTA */}
            <Link
              to="/add-listing"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm shadow-md active:opacity-80 transition-opacity"
              style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: 'var(--cp)' }}
              onClick={closeMenu}
            >
              <Plus size={16} />
              List Your Business — Free
            </Link>

            {/* Nav grid — 4 columns of square icon tiles */}
            <div className="grid grid-cols-4 gap-2">
              {visibleTabs.map(tab => {
                const isActive = tab.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(tab.path);
                const { Icon } = tab;
                return (
                  <Link
                    key={tab.id}
                    to={tab.path}
                    onClick={closeMenu}
                    className={clsx(
                      'aspect-square flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-150 active:scale-95',
                      isActive
                        ? 'bg-white/30 text-white'
                        : 'bg-black/20 text-white/80 hover:bg-black/30'
                    )}
                  >
                    <Icon size={40} />
                    <span className="text-[10px] font-semibold leading-none text-center px-1 line-clamp-1">
                      {t(tab.tKey)}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Divider + Auth section */}
            <div className="border-t border-white/20 pt-4">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <User size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-white/60 truncate">{user.email}</p>
                      <p className="text-[10px] text-white/40 truncate capitalize">{user.role?.toLowerCase().replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      to="/profile"
                      onClick={closeMenu}
                      className="text-xs text-white/80 hover:text-white px-3 py-2 rounded-xl bg-white/10 font-semibold"
                    >
                      Profile
                    </Link>
                    <button
                      className="text-xs text-white/80 hover:text-white px-3 py-2 rounded-xl bg-white/10 font-semibold"
                      onClick={() => { logout(); closeMenu(); }}
                    >
                      {t('auth.logout')}
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm bg-white/15 text-white hover:bg-white/25 transition-colors"
                  onClick={closeMenu}
                >
                  <User size={16} />
                  {t('auth.login')} / {t('auth.register')}
                </Link>
              )}
            </div>

            {/* ── App Stats ─────────────────────────────────────────────── */}
            <div className="border-t border-white/20 pt-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Seshaa by the numbers
              </p>
              {menuStats ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: fmtNum(menuStats.listings),    l: 'Listings',    c: 'text-emerald-300' },
                      { v: String(menuStats.countries),   l: 'Countries',   c: 'text-sky-300' },
                      { v: fmtNum(menuStats.users),       l: 'Members',     c: 'text-violet-300' },
                      { v: fmtNum(menuStats.classifieds), l: 'Classifieds', c: 'text-amber-300' },
                    ].map(s => (
                      <div key={s.l} className="bg-black/25 rounded-xl p-3 text-center">
                        <p className={`text-2xl font-black leading-none ${s.c}`}>{s.v}</p>
                        <p className="text-[10px] text-white/55 font-medium mt-1">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  {/* Activity bar chart — decorative 7-bar sparkline */}
                  <div>
                    <p className="text-[10px] text-white/35 mb-1.5">Activity (last 7 days)</p>
                    <div className="flex items-end gap-1 h-10">
                      {[0.38, 0.55, 0.47, 0.82, 0.68, 0.79, 1].map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-t-sm transition-all ${i === 6 ? 'bg-white/70' : 'bg-white/25'}`}
                          style={{ height: `${h * 100}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-0.5">
                      {['M','T','W','T','F','S','S'].map((d,i) => (
                        <span key={i} className="flex-1 text-center text-[8px] text-white/25">{d}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="bg-black/25 rounded-xl p-3 h-14 animate-pulse" />
                  ))}
                </div>
              )}
            </div>

            {/* ── Your Session / Visitor Data ──────────────────────────── */}
            <div className="border-t border-white/20 pt-4 pb-2 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Your session
              </p>
              {menuDevice ? (
                <div className="bg-black/25 rounded-xl p-3 space-y-0.5">
                  {/* Device type icon row */}
                  <div className="flex items-center gap-2 mb-2">
                    {menuDevice.device === 'mobile'  && <Smartphone size={14} className="text-emerald-300 shrink-0" />}
                    {menuDevice.device === 'tablet'  && <Tablet     size={14} className="text-sky-300 shrink-0" />}
                    {menuDevice.device === 'desktop' && <Monitor    size={14} className="text-violet-300 shrink-0" />}
                    <span className="text-xs font-bold text-white capitalize">{menuDevice.device}</span>
                    <span className="text-xs text-white/50">·</span>
                    <span className="text-xs text-white/70">{menuDevice.browser}</span>
                    <Wifi size={12} className={`ml-auto shrink-0 ${menuDevice.connection !== '—' ? 'text-emerald-400' : 'text-white/30'}`} />
                  </div>
                  {menuIp && <MenuDevRow label="IP" value={menuIp} />}
                  <MenuDevRow label="OS" value={menuDevice.os} />
                  <MenuDevRow label="Screen" value={`${menuDevice.screenW}×${menuDevice.screenH}`} />
                  <MenuDevRow label="Network" value={menuDevice.connection !== '—' ? menuDevice.connection.toUpperCase() : 'Unknown'} />
                  <MenuDevRow label="Language" value={menuDevice.language} />
                  <MenuDevRow label="Timezone" value={menuDevice.timezone} />
                </div>
              ) : (
                <div className="bg-black/25 rounded-xl p-3 h-28 animate-pulse" />
              )}
            </div>

          </div>
        </div>
      )}

      {/* Bell notification placeholder — hidden on mobile */}
      {user && (
        <div className="hidden">
          <Bell size={18} />
        </div>
      )}

      {/* Country picker modal */}
      {countryPickerOpen && (
        <CountryPicker
          currentCode={countryCode}
          onSelect={code => applyTheme(code)}
          onClose={() => setCountryPickerOpen(false)}
        />
      )}
    </nav>
  );
}
