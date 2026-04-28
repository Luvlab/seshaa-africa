import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, Calendar, User } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import clsx from 'clsx';

const TABS = [
  { path: '/', icon: Home, label: 'Home', exact: true },
  { path: '/search', icon: Search, label: 'Find' },
  { path: '/messages', icon: MessageCircle, label: 'Chat' },
  { path: '/bookings', icon: Calendar, label: 'Bookings' },
  { path: '/profile', icon: User, label: 'Me' },
];

export default function MobileTabBar() {
  const location = useLocation();
  const { user } = useAuthStore();

  const tabs = TABS.map(t => ({
    ...t,
    isActive: t.exact ? location.pathname === t.path : location.pathname.startsWith(t.path),
  }));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 mobile-tab-bar border-t border-gray-200 bg-white">
      <div className="flex items-stretch">
        {tabs.map(tab => (
          <Link
            key={tab.path}
            to={tab.path === '/profile' && !user ? '/auth' : tab.path}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors',
              tab.isActive ? 'text-[var(--cp)]' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <tab.icon
              size={22}
              className={clsx(tab.isActive && 'scale-110 transition-transform')}
              strokeWidth={tab.isActive ? 2.5 : 1.5}
            />
            <span className={clsx('text-[10px]', tab.isActive && 'font-semibold')}>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
