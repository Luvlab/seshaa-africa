/**
 * FavoriteButton — heart toggle that works everywhere.
 *
 * • Browsing: always visible, no login needed.
 * • Clicking: if not logged in, shows a small inline prompt to sign in.
 *   If logged in, immediately toggles the favourite.
 *
 * Usage:
 *   <FavoriteButton id={listing.id} type="listing" name={listing.name} />
 *   <FavoriteButton id={item.id} type="merch" name={item.title} size={18} />
 */
import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFavoritesStore, type FavItemType } from '../../store/favorites';
import { useAuthStore } from '../../store/auth';
import clsx from 'clsx';

interface Props {
  id: string;
  type: FavItemType;
  name: string;
  size?: number;
  className?: string;
  /** Show in a circular pill button (default) or inline link-style */
  variant?: 'pill' | 'inline';
}

export default function FavoriteButton({ id, type, name, size = 16, className, variant = 'pill' }: Props) {
  const { user } = useAuthStore();
  const { isFav, toggle } = useFavoritesStore();
  const [showLogin, setShowLogin] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close the tooltip when clicking outside
  useEffect(() => {
    if (!showLogin) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowLogin(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLogin]);

  const active = isFav(id, type);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setShowLogin(v => !v);
      return;
    }
    toggle({ id, type, name, addedAt: Date.now() });
  };

  if (variant === 'inline') {
    return (
      <span ref={ref} className="relative inline-flex items-center gap-1">
        <button
          onClick={handleClick}
          aria-label={active ? 'Remove from favourites' : 'Add to favourites'}
          className={clsx('inline-flex items-center gap-1 text-xs font-semibold transition-colors', active ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400', className)}
        >
          <Heart size={size} fill={active ? 'currentColor' : 'none'} strokeWidth={2} />
          {active ? 'Saved' : 'Save'}
        </button>
        {showLogin && (
          <span className="absolute top-7 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
            <Link to="/auth" className="font-semibold" style={{ color: 'var(--cp)' }}>Sign in</Link>
            {' '}to save favourites
          </span>
        )}
      </span>
    );
  }

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        onClick={handleClick}
        aria-label={active ? 'Remove from favourites' : 'Add to favourites'}
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center transition-all',
          active
            ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
            : 'bg-white/80 backdrop-blur-sm text-gray-400 hover:bg-rose-50 hover:text-rose-400 shadow-sm border border-gray-100',
          className
        )}
      >
        <Heart size={size} fill={active ? 'currentColor' : 'none'} strokeWidth={2} />
      </button>

      {showLogin && (
        <span className="absolute top-10 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
          <Link to="/auth" className="font-semibold" style={{ color: 'var(--cp)' }}>Sign in</Link>
          {' '}to save favourites
        </span>
      )}
    </span>
  );
}
