import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { bookingsApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import { Link } from 'react-router-dom';
import type { Booking, BookingStatus } from '../types';

const STATUS_CONFIG: Record<BookingStatus, { icon: React.ReactNode; color: string; label: string }> = {
  PENDING: { icon: <AlertCircle size={14} />, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Pending' },
  CONFIRMED: { icon: <CheckCircle size={14} />, color: 'text-green-600 bg-green-50 border-green-200', label: 'Confirmed' },
  CANCELLED: { icon: <XCircle size={14} />, color: 'text-red-500 bg-red-50 border-red-200', label: 'Cancelled' },
  COMPLETED: { icon: <CheckCircle size={14} />, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Completed' },
  NO_SHOW: { icon: <XCircle size={14} />, color: 'text-gray-500 bg-gray-50 border-gray-200', label: 'No-show' },
};

export default function BookingsPage() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  useEffect(() => {
    if (!user) return;
    bookingsApi.my()
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = bookings.filter(b => {
    const date = new Date(b.date);
    const now = new Date();
    if (filter === 'upcoming') return date >= now && b.status !== 'CANCELLED';
    if (filter === 'past') return date < now || b.status === 'COMPLETED';
    return true;
  });

  const cancel = async (id: string) => {
    await bookingsApi.updateStatus(id, 'CANCELLED');
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' as BookingStatus } : b));
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Bookings</h2>
        <p className="text-gray-500 mb-6">Log in to see your bookings</p>
        <Link to="/auth" className="inline-block px-6 py-3 rounded-xl text-white font-semibold" style={{ backgroundColor: 'var(--cp)' }}>
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <Link to="/search?bookable=true"
          className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
          style={{ backgroundColor: 'var(--cp)' }}>
          Book a Service
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 bg-gray-100 rounded-xl p-1">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-600">No {filter} bookings</p>
          {filter === 'upcoming' && (
            <Link to="/search?bookable=true" className="text-sm mt-2 inline-block hover:underline" style={{ color: 'var(--cp)' }}>
              Browse bookable services →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => {
            const config = STATUS_CONFIG[booking.status];
            const date = new Date(booking.date);
            return (
              <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{booking.listing?.name}</h3>
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${config.color}`}>
                        {config.icon} {config.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{booking.service}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {booking.listing?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {booking.listing.city}
                        </span>
                      )}
                    </div>
                    {booking.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">"{booking.notes}"</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Link to={`/listing/${booking.listingId}`}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                      <ChevronRight size={16} />
                    </Link>
                    {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? (
                      <button
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                        onClick={() => cancel(booking.id)}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA: bookable businesses info */}
      <div className="mt-6 rounded-2xl p-4 border" style={{ borderColor: 'var(--cp)', backgroundColor: 'var(--cp-light)' }}>
        <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--cp)' }}>🌟 Book with Seshaa Pro businesses</h3>
        <p className="text-xs text-gray-600">
          Chauffeurs, catering, beauty salons, garages and more — look for the "Bookable" badge.
          All bookings are confirmed within 24 hours.
        </p>
      </div>
    </div>
  );
}
