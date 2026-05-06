/**
 * FollowButton — Follow/unfollow a user or listing.
 * Usage:
 *   <FollowButton listingId="..." name="Business Name" />
 *   <FollowButton userId="..." name="User Name" />
 */
import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth';

interface Props {
  listingId?: string;
  userId?: string;
  name?: string;
  size?: number;
  className?: string;
}

export default function FollowButton({ listingId, userId, name, size = 14, className = '' }: Props) {
  const { user } = useAuthStore();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const params = listingId ? { listingId } : { userId };
    api.get('/follows/check', { params }).then(r => setFollowing(r.data.following)).catch(() => {});
  }, [user, listingId, userId]);

  if (!user) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        if (listingId) await api.delete(`/follows/listing/${listingId}`);
        else if (userId) await api.delete(`/follows/user/${userId}`);
        setFollowing(false);
      } else {
        if (listingId) await api.post(`/follows/listing/${listingId}`);
        else if (userId) await api.post(`/follows/user/${userId}`);
        setFollowing(true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={following ? `Unfollow ${name ?? ''}` : `Follow ${name ?? ''}`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all border ${
        following
          ? 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500'
          : 'text-white border-transparent hover:opacity-90'
      } ${className}`}
      style={!following ? { backgroundColor: 'var(--cp,#008751)' } : {}}
    >
      {following ? <BellOff size={size} /> : <Bell size={size} />}
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
