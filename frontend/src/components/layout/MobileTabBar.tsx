import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, PartyPopper, User } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
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

  const tabs = TABS.map(t => ({
    ...t,
    isActive: t.exact ? location.pathname === t.path : location.pathname.startsWith(t.path),
  }));

  const openChatPanel = () => {
    window.dispatchEvent(new CustomEvent('seshaa:chat-toggle', { detail: { tab: 'messages' } }));
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 w-screen max-w-full overflow-hidden bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex w-full items-stretch">
        {tabs.map(tab => (
          tab.path === '/messages' ? (
            <button
              key={tab.path}
              onClick={openChatPanel}
              className={clsx(
                'min-w-0 flex-1 flex flex-col items-center justify-center px-1 py-2.5 gap-1 transition-colors active:scale-95',
                location.pathname.startsWith('/messages') ? 'text-[var(--cp)]' : 'text-gray-400'
              )}
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
                'min-w-0 flex-1 flex flex-col items-center justify-center px-1 py-2.5 gap-1 transition-colors active:scale-95',
                tab.isActive ? 'text-[var(--cp)]' : 'text-gray-400'
              )}
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
