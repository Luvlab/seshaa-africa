import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, PartyPopper, User } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import clsx from 'clsx';

const TABS = [
  { path: '/',       icon: Home,          label: 'Home',   exact: true },
  { path: '/search', icon: Search,        label: 'Find' },
  { path: '/messages', icon: MessageCircle, label: 'Chat' },
  { path: '/events', icon: PartyPopper,   label: 'Events' },
  { path: '/profile', icon: User,         label: 'Me' },
];

export default function MobileTabBar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { countryCode } = useThemeStore();

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
    const inactive = `rgba(${r},${g},${b},0.76)`;
    const activeBg = `rgba(${r},${g},${b},0.2)`;
    const border = `rgba(${r},${g},${b},0.3)`;
    return { active: ct, inactive, activeBg, border };
  }, [countryCode]);

  const tabs = TABS.map(t => ({
    ...t,
    isActive: t.exact ? location.pathname === t.path : location.pathname.startsWith(t.path),
  }));

  const openChatPanel = () => {
    window.dispatchEvent(new CustomEvent('seshaa:chat-toggle', { detail: { tab: 'messages' } }));
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 w-screen max-w-full overflow-hidden border-t"
      style={{ backgroundColor: 'var(--cp)', borderTopColor: colors.border, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex w-full items-stretch">
        {tabs.map(tab => (
          tab.path === '/messages' ? (
            <button
              key={tab.path}
              onClick={openChatPanel}
              className={clsx(
                'min-w-0 flex-1 flex flex-col items-center justify-center px-1 py-2.5 gap-1 transition-colors active:scale-95 rounded-lg'
              )}
              style={{ color: location.pathname.startsWith('/messages') ? colors.active : colors.inactive, backgroundColor: location.pathname.startsWith('/messages') ? colors.activeBg : 'transparent' }}
            >
              <tab.icon
                size={24}
                strokeWidth={location.pathname.startsWith('/messages') ? 2 : 1.5}
                className={clsx('transition-transform', location.pathname.startsWith('/messages') && 'scale-110')}
              />
              <span className={clsx(
                'max-w-full truncate text-[10px] leading-none',
                location.pathname.startsWith('/messages') ? 'font-bold' : 'font-medium'
              )}>
                {tab.label}
              </span>
            </button>
          ) : (
            <Link
              key={tab.path}
              to={tab.path === '/profile' && !user ? '/auth' : tab.path}
              className={clsx(
                'min-w-0 flex-1 flex flex-col items-center justify-center px-1 py-2.5 gap-1 transition-colors active:scale-95 rounded-lg'
              )}
              style={{ color: tab.isActive ? colors.active : colors.inactive, backgroundColor: tab.isActive ? colors.activeBg : 'transparent' }}
            >
              <tab.icon
                size={24}
                strokeWidth={tab.isActive ? 2 : 1.5}
                className={clsx('transition-transform', tab.isActive && 'scale-110')}
              />
              <span className={clsx(
                'max-w-full truncate text-[10px] leading-none',
                tab.isActive ? 'font-bold' : 'font-medium'
              )}>
                {tab.label}
              </span>
            </Link>
          )
        ))}
      </div>
    </nav>
  );
}
