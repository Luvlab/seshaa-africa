import { Link, useLocation } from 'react-router-dom';
import { Home, Search, CalendarDays, PartyPopper, User } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import clsx from 'clsx';

const TABS = [
  { path: '/',       icon: Home,          label: 'Home',   exact: true },
  { path: '/search', icon: Search,        label: 'Find' },
  { path: '/events', icon: PartyPopper,   label: 'Events' },
  { path: '/bookings', icon: CalendarDays, label: 'Book' },
  { path: '/profile', icon: User,         label: 'Me' },
];

export default function MobileTabBar() {
  const location = useLocation();
  const { user } = useAuthStore();

  const tabs = TABS.map(t => ({
    ...t,
    isActive: t.exact ? location.pathname === t.path : location.pathname.startsWith(t.path),
  }));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-stretch">
        {tabs.map(tab => (
          <Link
            key={tab.path}
            to={tab.path === '/profile' && !user ? '/auth' : tab.path}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors active:scale-95',
              tab.isActive ? 'text-[var(--cp)]' : 'text-gray-400'
            )}
          >
            <tab.icon
              size={28}
              strokeWidth={tab.isActive ? 2 : 1.5}
              className={clsx('transition-transform', tab.isActive && 'scale-110')}
            />
            <span className={clsx(
              'text-xs leading-none',
              tab.isActive ? 'font-bold' : 'font-medium'
            )}>
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
