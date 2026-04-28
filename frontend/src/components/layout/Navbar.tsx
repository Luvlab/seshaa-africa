import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Menu, X, Globe, MessageCircle, Bell, User, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { LANGUAGES } from '../../i18n';
import clsx from 'clsx';
import type { PortalType } from '../../types';

const PORTAL_COLORS: Record<PortalType, string> = {
  consumer: 'bg-green-600',
  business: 'bg-blue-600',
  advertiser: 'bg-orange-600',
  salesrep: 'bg-purple-600',
  admin: 'bg-red-700',
};

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, portal, setPortal, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('seshaa-lang', code);
    const dir = LANGUAGES.find(l => l.code === code)?.dir || 'ltr';
    document.documentElement.dir = dir;
    setLangOpen(false);
  };

  const availablePortals: PortalType[] = user
    ? user.role === 'ADMIN'
      ? ['consumer', 'business', 'advertiser', 'salesrep', 'admin']
      : user.role === 'SALES_REP'
      ? ['consumer', 'salesrep']
      : user.role === 'BUSINESS_OWNER'
      ? ['consumer', 'business', 'advertiser']
      : ['consumer']
    : [];

  return (
    <nav className={clsx('text-white shadow-lg sticky top-0 z-50 transition-colors', PORTAL_COLORS[portal])}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <span className="text-2xl">🌍</span>
          <span className="hidden sm:inline">{t('app.name')}</span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-xl hidden md:flex items-center bg-white/20 rounded-full px-4 py-2 gap-2">
          <Search size={16} />
          <input
            className="bg-transparent text-white placeholder-white/70 outline-none flex-1 text-sm"
            placeholder={t('search.placeholder')}
            onKeyDown={e => e.key === 'Enter' && navigate(`/search?q=${(e.target as HTMLInputElement).value}`)}
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ms-auto">
          {/* Language picker */}
          <div className="relative">
            <button
              className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-white/20"
              onClick={() => setLangOpen(v => !v)}
            >
              <Globe size={15} />
              <span className="hidden sm:inline">{currentLang.nativeName}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white text-gray-800 rounded-lg shadow-xl w-52 max-h-72 overflow-y-auto z-50">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    className={clsx('w-full text-left px-4 py-2 text-sm hover:bg-green-50 flex justify-between',
                      lang.code === i18n.language && 'bg-green-100 font-semibold')}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    <span>{lang.nativeName}</span>
                    <span className="text-gray-400">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Portal switcher */}
          {user && availablePortals.length > 1 && (
            <div className="relative">
              <button
                className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-white/20 capitalize"
                onClick={() => setPortalOpen(v => !v)}
              >
                {portal} <ChevronDown size={14} />
              </button>
              {portalOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white text-gray-800 rounded-lg shadow-xl w-40 z-50">
                  {availablePortals.map(p => (
                    <button
                      key={p}
                      className={clsx('w-full text-left px-4 py-2 text-sm hover:bg-gray-50 capitalize',
                        p === portal && 'font-bold')}
                      onClick={() => { setPortal(p); setPortalOpen(false); navigate(`/${p}`); }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {user ? (
            <>
              <Link to="/messages" className="p-2 rounded-full hover:bg-white/20">
                <MessageCircle size={20} />
              </Link>
              <Link to="/notifications" className="p-2 rounded-full hover:bg-white/20">
                <Bell size={20} />
              </Link>
              <Link to="/profile" className="p-2 rounded-full hover:bg-white/20">
                <User size={20} />
              </Link>
            </>
          ) : (
            <Link to="/auth" className="bg-white text-green-700 font-semibold px-4 py-1.5 rounded-full text-sm hover:bg-green-50">
              {t('auth.login')}
            </Link>
          )}

          <Link
            to="/add"
            className="hidden md:flex items-center gap-1 bg-yellow-400 text-gray-900 font-semibold px-3 py-1.5 rounded-full text-sm hover:bg-yellow-300"
          >
            <Plus size={16} /> {t('listing.addNew')}
          </Link>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-black/20 px-4 pb-4 space-y-2">
          <div className="flex items-center bg-white/20 rounded-full px-4 py-2 gap-2">
            <Search size={16} />
            <input
              className="bg-transparent text-white placeholder-white/70 outline-none flex-1 text-sm"
              placeholder={t('search.placeholder')}
              onKeyDown={e => e.key === 'Enter' && navigate(`/search?q=${(e.target as HTMLInputElement).value}`)}
            />
          </div>
          <Link to="/add" className="flex items-center gap-2 py-2 text-sm" onClick={() => setMobileOpen(false)}>
            <Plus size={16} /> {t('listing.addNew')}
          </Link>
          {!user && (
            <Link to="/auth" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>
              {t('auth.login')} / {t('auth.register')}
            </Link>
          )}
          {user && (
            <button className="block py-2 text-sm text-left" onClick={logout}>
              {t('auth.logout')}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
