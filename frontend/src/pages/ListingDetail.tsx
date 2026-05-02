import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, MapPin, Globe, MessageCircle, BadgeCheck, Star, Calendar, Award, ArrowLeft, Share2 } from 'lucide-react';
import { listingsApi, reviewsApi } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import StarRating from '../components/ui/StarRating';
import BookingModal from '../components/directory/BookingModal';
import type { Listing, Review } from '../types';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    // Reviews are now embedded in the listing response — single API call
    listingsApi.get(id)
      .then(lr => {
        const data = lr.data as Listing & { reviews?: Review[] };
        setListing(data);
        setReviews(data.reviews ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const submitReview = async () => {
    if (!myRating || !id) return;
    setSubmitting(true);
    try {
      const r = await reviewsApi.submit(id, myRating, myComment);
      setReviews(prev => [{ ...r.data, user: { id: user!.id, name: user!.name } }, ...prev.filter(r => r.userId !== user!.id)]);
      setReviewMsg('Review submitted! Thank you.');
      setMyComment('');
    } catch { setReviewMsg('Could not submit review. Try again.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cp) transparent var(--cp) var(--cp)' }} />
    </div>
  );

  if (!listing) return (
    <div className="text-center py-16">
      <p className="text-gray-500">Listing not found.</p>
      <Link to="/" className="text-sm mt-2 inline-block" style={{ color: 'var(--cp)' }}>← Back home</Link>
    </div>
  );

  const certLevel = listing.certification?.level;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Back */}
      <Link to="/search" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={14} /> Back to results
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border shadow-sm p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-bold text-white overflow-hidden shrink-0"
            style={{ backgroundColor: 'var(--cp)' }}>
            {listing.logoUrl ? <img src={listing.logoUrl} alt={listing.name} className="w-full h-full object-cover" /> : listing.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{listing.name}</h1>
              {listing.verified && <BadgeCheck size={20} className="text-blue-500" />}
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-1">
              {listing.isPro && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">⭐ Pro</span>
              )}
              {certLevel && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {certLevel === 'PLATINUM' ? '💎' : certLevel === 'GOLD' ? '🥇' : '⭐'} Seshaa {certLevel}
                </span>
              )}
              {listing.bookable && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">📅 Bookable</span>
              )}
              {listing.category && (
                <span className="text-xs text-gray-500 capitalize">{listing.category}</span>
              )}
            </div>

            {listing.avgRating > 0 && (
              <div className="mt-2">
                <StarRating value={listing.avgRating} count={listing.reviewCount} size={16} />
              </div>
            )}
          </div>

          <button
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 shrink-0"
            onClick={() => {
              navigator.share?.({ title: listing.name, url: window.location.href })
                .catch(() => navigator.clipboard.writeText(window.location.href));
            }}
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Details */}
        <div className="mt-4 space-y-2">
          {listing.phone && (
            <a href={`tel:${listing.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:underline">
              <Phone size={15} className="text-green-500 shrink-0" /> {listing.phone}
            </a>
          )}
          {(listing.address || listing.city) && (
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin size={15} className="text-red-400 shrink-0 mt-0.5" />
              <span>{[listing.address, listing.city, listing.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {listing.website && (
            <a href={listing.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <Globe size={15} className="shrink-0" /> {listing.website.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
          {listing.whatsapp && (
            <a href={`https://wa.me/${listing.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-emerald-600 hover:underline">
              <MessageCircle size={15} className="shrink-0" /> WhatsApp
            </a>
          )}
        </div>

        {listing.description && (
          <p className="mt-4 text-sm text-gray-600 leading-relaxed">{listing.description}</p>
        )}

        {/* Awards */}
        {listing.awards && listing.awards.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {listing.awards.map((a, i) => (
              <div key={i} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                <Award size={11} />
                {a.rank === 1 ? '🥇' : a.rank === 2 ? '🥈' : '🥉'}
                {a.year} · {a.category}
                {a.city && ` · ${a.city}`}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-5 flex gap-3 flex-wrap">
          {listing.phone && (
            <a href={`tel:${listing.phone}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: 'var(--cp)' }}>
              <Phone size={15} /> {t('listing.callNow')}
            </a>
          )}
          {listing.whatsapp && (
            <a href={`https://wa.me/${listing.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-emerald-500">
              <MessageCircle size={15} /> WhatsApp
            </a>
          )}
          {listing.latitude && listing.longitude && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2"
              style={{ borderColor: 'var(--cp)', color: 'var(--cp)' }}>
              <MapPin size={15} /> {t('listing.directions')}
            </a>
          )}
          {listing.bookable && listing.isPro && (
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-blue-500 text-blue-600"
              onClick={() => setShowBooking(true)}>
              <Calendar size={15} /> Book Now
            </button>
          )}
        </div>
      </div>

      {/* Reviews section */}
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-900">
            Reviews
            {listing.reviewCount > 0 && (
              <span className="ml-2 text-base font-normal text-gray-500">
                {listing.avgRating.toFixed(1)} ★ ({listing.reviewCount})
              </span>
            )}
          </h2>
        </div>

        {/* Leave a review */}
        {user && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm font-semibold text-gray-700 mb-2">Leave a review</p>
            <StarRating value={myRating} interactive onChange={v => setMyRating(v)} size={24} showCount={false} />
            <textarea
              className="w-full mt-3 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)] resize-none"
              rows={2} value={myComment} onChange={e => setMyComment(e.target.value)}
              placeholder="Share your experience (optional)..." />
            {reviewMsg && <p className="text-xs text-green-600 mt-1">{reviewMsg}</p>}
            <button
              onClick={submitReview}
              disabled={!myRating || submitting}
              className="mt-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
              style={{ backgroundColor: 'var(--cp)' }}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        )}

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Star size={40} className="mx-auto mb-2 opacity-20" />
            <p>No reviews yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{review.user.name}</p>
                    <StarRating value={review.rating} size={12} showCount={false} />
                  </div>
                  <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
                {review.comment && <p className="text-sm text-gray-600 mt-1.5">{review.comment}</p>}
                {review.ownerReply && (
                  <div className="mt-2 ml-3 pl-3 border-l-2 text-sm text-gray-500" style={{ borderColor: 'var(--cp)' }}>
                    <span className="font-semibold text-xs" style={{ color: 'var(--cp)' }}>Owner reply:</span>
                    <p>{review.ownerReply}</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">{review.helpfulCount} found helpful</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBooking && <BookingModal listing={listing} onClose={() => setShowBooking(false)} />}
    </div>
  );
}
