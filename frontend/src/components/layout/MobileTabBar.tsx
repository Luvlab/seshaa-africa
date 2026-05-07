import { useMemo, useRef, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Search, MessageCircle, PartyPopper, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import clsx from 'clsx';

interface TabDef {
  path: string;
  icon: LucideIcon;
  tKey: string;
  exact?: boolean;
}

const TABS: TabDef[] = [
  { path: '/',         icon: Home,          tKey: 'nav.home',      exact: true },
  { path: '/search',   icon: Search,        tKey: 'search.findBtn' },
  { path: '/messages', icon: MessageCircle, tKey: 'nav.chat' },
  { path: '/events',   icon: PartyPopper,   tKey: 'nav.events' },
  { path: '/profile',  icon: User,          tKey: 'nav.me' },
];

export default function MobileTabBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuthStore();
  const { countryCode } = useThemeStore();
  const tabBarRef = useRef<HTMLElement>(null);

  // Keep --tab-h in sync with actual tab bar height (including safe-area padding).
  useLayoutEffect(() => {
    const update = () => {
      if (tabBarRef.current) {
        document.documentElement.style.setProperty('--tab-h', tabBarRef.current.offsetHeight + 'px');
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const colors = useMemo(() => {
    if (typeof window === 'undefined') {
      return { active: '#FFFFFF', inactive: 'rgba(255,255,255,0.75)', activeBg: 'rgba(255,255,255,0.2)', border: 'rgba(255,255,255,0.25)' };
    }
    const root = getComputedStyle(document.documentElement);
    const ct = root.getPropertyValue('--ct').trim() || '#FFFFFF';
    const hex = ct.startsWith('#') ? ct.slice(1) : 'FFFFFF';
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return {
      active: ct,
      inactive: `rgba(${r},${g},${b},0.76)`,
      activeBg: `rgba(${r},${g},${b},0.2)`,
      border: `rgba(${r},${g},${b},0.3)`,
    };
  }, [countryCode]);

  const dismissAll = () => {
    window.dispatchEvent(new Event('seshaa:close-all-panels'));
    window.dispatchEvent(new Event('seshaa:chat-close'));
  };

  return (
    <nav
      ref={tabBarRef}
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 w-screen max-w-full overflow-hidden border-t"
      style={{ backgroundColor: 'var(--cp)', borderTopColor: colors.border, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex w-full items-stretch">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.exact ? location.pathname === tab.path : location.pathname.startsWith(tab.path);
          const dest = tab.path === '/profile' && !user ? '/auth' : tab.path;
          return (
            <Link
              key={tab.path}
              to={dest}
              onClick={dismissAll}
              className="min-w-0 flex-1 flex flex-col items-center justify-center px-1 py-2.5 gap-1 transition-colors active:scale-95 rounded-lg"
              style={{
                color: isActive ? colors.active : colors.inactive,
                backgroundColor: isActive ? colors.activeBg : 'transparent',
              }}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2 : 1.5}
                className={clsx('transition-transform', isActive && 'scale-110')}
              />
              <span className={clsx(
                'max-w-full truncate text-[10px] leading-none',
                isActive ? 'font-bold' : 'font-medium',
              )}>
                {t(tab.tKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
