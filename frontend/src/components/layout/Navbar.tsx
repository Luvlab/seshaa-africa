import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Plus, Menu, X, MessageCircle, Bell, User, ChevronDown, Sparkles, Globe,
  Home, Newspaper, Tag, BarChart2, CalendarDays, Megaphone, PartyPopper,
  Star, Briefcase, Languages, Settings, Globe2,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import SeshaaTitle from '../brand/SeshaaTitle';
import CountryPicker from './CountryPicker';
import { LANGUAGES } from '../../i18n';
import clsx from 'clsx';
import type { PortalType } from '../../types';

const PORTAL_LABELS: Record<PortalType, string> = {
  consumer: 'Consumer',
  business: 'Business',
  advertiser: 'Advertiser',
  salesrep: 'Sales Rep',
  ambassador: 'Ambassador',
  admin: 'Admin',
};

interface Tab {
  id: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];  // if set, only show for these roles
}

const ALL_TABS: Tab[] = [
  { id: 'home',        path: '/',           label: 'Home',        icon: <Home         size={15} /> },
  { id: 'search',      path: '/search',     label: 'Directory',   icon: <Search       size={15} /> },
  { id: 'news',        path: '/news',       label: 'News',        icon: <Newspaper    size={15} /> },
  { id: 'classifieds', path: '/classifieds',label: 'Classifieds', icon: <Tag          size={15} /> },
  { id: 'prices',      path: '/prices',     label: 'Prices',      icon: <BarChart2    size={15} /> },
  { id: 'messages',    path: '/messages',   label: 'Messages',    icon: <MessageCircle size={15} /> },
  { id: 'bookings',    path: '/bookings',   label: 'Bookings',    icon: <CalendarDays size={15} /> },
  { id: 'advertise',   path: '/advertise',  label: 'Advertise',   icon: <Megaphone    size={15} /> },
  { id: 'events',      path: '/events',     label: 'Events',      icon: <PartyPopper  size={15} /> },
  { id: 'ambassador',  path: '/ambassador', label: 'Ambassador',  icon: <Star         size={15} />, roles: ['AMBASSADOR', 'ADMIN'] },
  { id: 'salesrep',    path: '/salesrep',   label: 'Sales',       icon: <Briefcase    size={15} />, roles: ['SALES_REP', 'ADMIN'] },
  { id: 'translate',   path: '/translate',  label: 'Translate',   icon: <Languages    size={15} /> },
  { id: 'admin',       path: '/admin',      label: 'Admin',       icon: <Settings     size={15} />, roles: ['ADMIN'] },
  { id: 'diaspora',    path: '/diaspora',   label: 'Diaspora',    icon: <Globe2       size={15} /> },
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

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

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
      navigate(`/search?q=${encodeURIComponent(searchQ)}`);
      setSearchQ('');
      setMobileOpen(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 shadow-md" style={{ backgroundColor: 'var(--cp)' }}>
      {/* ── Main header row — full viewport width, 56px fixed height ── */}
      <div className="w-full px-4 sm:px-6 h-14 flex items-center gap-3">

        {/* Seshaa animated title — min-width holds stable settled width; no clipping */}
        <Link
          to="/"
          className="shrink-0 flex items-center h-full"
          style={{ minWidth: 160 }}
        >
          <SeshaaTitle countryCode={countryCode} size="md" />
        </Link>

        {/* Country flag badge */}
        <button
          className="shrink-0 flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1.5 rounded-full transition-colors ml-3"
          onClick={() => setCountryPickerOpen(true)}
          title={`${theme.name} — tap to change`}
        >
          <span className="text-base leading-none">
            {countryCode
              ? countryCode.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')
              : '🌍'}
          </span>
          <span className="font-semibold hidden sm:inline">{countryCode ? theme.name : 'Africa'}</span>
          <ChevronDown size={10} />
        </button>

        {/* Search bar — grows to fill available space */}
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
            onClick={() => navigate('/search?ai=1&q=' + encodeURIComponent(searchQ))}
            title="AI Search"
          >
            <Sparkles size={14} />
          </button>
        </div>

        {/* Right controls — all vertically centered via parent items-center */}
        <div className="flex items-center gap-1.5 ms-auto">
          {/* Language */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 text-white/90 text-sm px-2 py-1 rounded-lg hover:bg-white/20"
              onClick={() => setLangOpen(v => !v)}
            >
              <Globe size={15} className="shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide">{currentLang.code.slice(0, 2)}</span>
              <ChevronDown size={10} className="hidden sm:block" />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white text-gray-800 rounded-xl shadow-2xl w-52 max-h-64 overflow-y-auto z-50">
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
            )}
          </div>

          {/* Portal switcher */}
          {user && availablePortals.length > 1 && (
            <div className="relative">
              <button
                className="flex items-center gap-1 text-white text-xs px-2 py-1 rounded-lg hover:bg-white/20 border border-white/30"
                onClick={() => setPortalOpen(v => !v)}
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
              <Link to="/messages" className="p-2 rounded-full hover:bg-white/20 text-white hidden sm:block" title="Messages">
                <MessageCircle size={18} />
              </Link>
              <Link to="/profile" className="p-2 rounded-full hover:bg-white/20 text-white" title="Profile">
                <User size={18} />
              </Link>
            </>
          ) : (
            <Link
              to="/auth"
              className="text-sm font-semibold px-3 py-1.5 rounded-full bg-white hover:bg-white/90"
              style={{ color: 'var(--cp)' }}
            >
              {t('auth.login')}
            </Link>
          )}

          <Link
            to="/add-listing"
            className="hidden lg:flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30"
          >
            <Plus size={13} /> Add Listing
          </Link>

          <button className="md:hidden p-2 text-white" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Tab strip — desktop, full width */}
      <div className="hidden md:block bg-black/15 border-t border-white/10">
        <div className="w-full px-4 sm:px-6 flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {visibleTabs.map(tab => {
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            const isDiaspora = tab.id === 'diaspora';
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
                <span className="leading-none">{tab.icon}</span>
                {tab.label}
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-black/30 backdrop-blur-sm px-4 pb-4 space-y-1 border-t border-white/10">
          <div className="flex items-center bg-white/20 rounded-full px-4 py-2 gap-2 mt-2">
            <Search size={15} className="text-white/70" />
            <input
              className="bg-transparent text-white placeholder-white/60 outline-none flex-1 text-sm"
              placeholder={t('search.placeholder')}
              onKeyDown={handleSearch}
            />
          </div>
          {visibleTabs.map(tab => (
            <Link
              key={tab.id}
              to={tab.path}
              className="flex items-center gap-3 py-2.5 px-2 text-white/90 hover:text-white rounded-lg hover:bg-white/10 text-sm"
              onClick={() => setMobileOpen(false)}
            >
              <span className="leading-none">{tab.icon}</span> {tab.label}
            </Link>
          ))}
          <hr className="border-white/20 my-2" />
          {user ? (
            <button className="block py-2 text-sm text-white/80 hover:text-white text-left" onClick={logout}>
              {t('auth.logout')} ({user.name})
            </button>
          ) : (
            <Link to="/auth" className="block py-2 text-sm text-white/90 hover:text-white" onClick={() => setMobileOpen(false)}>
              {t('auth.login')} / {t('auth.register')}
            </Link>
          )}
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
