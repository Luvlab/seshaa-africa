import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import FavoriteButton from '../components/ui/FavoriteButton';
import FollowButton from '../components/ui/FollowButton';
import {
  Phone, MapPin, Globe, MessageCircle, BadgeCheck, Star, Calendar,
  Award, ArrowLeft, Share2, Clock, Hash, Building2, User, Mail,
  Navigation, ExternalLink, Tag, Layers, Map, ChevronDown, ChevronUp,
} from 'lucide-react';
import { listingsApi, reviewsApi } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import StarRating from '../components/ui/StarRating';
import BookingModal from '../components/directory/BookingModal';
import type { Listing, Review } from '../types';

// ── OSM map embed (iframe, no extra deps) ────────────────────────────────────
function OsmMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const zoom = 16;
  // OpenStreetMap embed URL
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.004},${lng + 0.005},${lat + 0.004}&layer=mapnik&marker=${lat},${lng}`;
  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
  const gmapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <iframe
        title={`Map — ${name}`}
        src={src}
        className="w-full"
        style={{ height: 260, border: 'none' }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="bg-white px-4 py-2.5 flex items-center gap-3 border-t border-gray-100">
        <Map size={13} className="text-gray-400 shrink-0" />
        <span className="text-xs text-gray-500 flex-1 tabular-nums">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
        <a href={osmLink} target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline">
          OSM <ExternalLink size={10} />
        </a>
        <a href={gmapsLink} target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold text-emerald-600 flex items-center gap-1 hover:underline">
          Google <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

// ── OSM metadata panel ────────────────────────────────────────────────────────
function MetaRow({ icon, label, value, mono = false, href }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean; href?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-400 shrink-0 mt-0.5">{icon}</span>
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer"
            className={`text-xs text-blue-600 hover:underline font-medium truncate flex-1 ${mono ? 'font-mono' : ''}`}>
            {value} <ExternalLink size={9} className="inline" />
          </a>
        : <span className={`text-xs text-gray-800 font-medium flex-1 ${mono ? 'font-mono' : ''}`}>{value}</span>
      }
    </div>
  );
}

function OsmMetadata({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(true);

  const rows: { icon: React.ReactNode; label: string; value: string; mono?: boolean; href?: string }[] = [];

  if (listing.type)        rows.push({ icon: <Building2 size={13} />, label: 'Type', value: listing.type });
  if (listing.category)    rows.push({ icon: <Tag size={13} />, label: 'Category', value: listing.category });
  if (listing.subcategory) rows.push({ icon: <Layers size={13} />, label: 'Sub-category', value: listing.subcategory });
  if (listing.address)     rows.push({ icon: <MapPin size={13} />, label: 'Address', value: listing.address });
  if (listing.city)        rows.push({ icon: <MapPin size={13} />, label: 'City', value: listing.city });
  if (listing.region)      rows.push({ icon: <MapPin size={13} />, label: 'Region', value: listing.region });
  if (listing.zipCode)     rows.push({ icon: <MapPin size={13} />, label: 'Postal code', value: listing.zipCode });
  if (listing.country)     rows.push({ icon: <Globe size={13} />, label: 'Country', value: listing.country });
  if (listing.latitude && listing.longitude)
    rows.push({ icon: <Navigation size={13} />, label: 'Coordinates', value: `${listing.latitude.toFixed(6)}, ${listing.longitude.toFixed(6)}`, mono: true });
  if (listing.osmId)
    rows.push({ icon: <Hash size={13} />, label: 'OSM ID', value: listing.osmId, mono: true,
      href: `https://www.openstreetmap.org/node/${listing.osmId.replace(/\D/g, '')}` });
  if (listing.openingHours) rows.push({ icon: <Clock size={13} />, label: 'Opening hours', value: listing.openingHours });
  if (listing.phone)       rows.push({ icon: <Phone size={13} />, label: 'Phone', value: listing.phone });
  if (listing.phone2)      rows.push({ icon: <Phone size={13} />, label: 'Phone 2', value: listing.phone2 });
  if (listing.email)       rows.push({ icon: <Mail size={13} />, label: 'Email', value: listing.email });
  if (listing.website)     rows.push({ icon: <Globe size={13} />, label: 'Website', value: listing.website, href: listing.website });
  if (listing.tier)        rows.push({ icon: <Star size={13} />, label: 'Listing tier', value: listing.tier });
  if (listing.tags && listing.tags.length > 0)
    rows.push({ icon: <Tag size={13} />, label: 'Tags', value: listing.tags.map(t => t.name).join(', ') });

  if (rows.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <span className="font-bold text-sm text-gray-800 flex items-center gap-2">
          <Hash size={14} className="text-gray-400" /> Open Data (OpenStreetMap)
        </span>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 py-1">
          {rows.map((r, i) => <MetaRow key={i} {...r} />)}
          <p className="text-[11px] text-gray-400 py-2 flex items-center gap-1">
            <ExternalLink size={10} />
            Data from{' '}
            <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a>
            {' '}contributors, licensed under{' '}
            <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer" className="underline">ODbL</a>
          </p>
        </div>
      )}
    </div>
  );
}

// ── Photo gallery ─────────────────────────────────────────────────────────────
function PhotoGallery({ photos }: { photos: string[] }) {
  const [active, setActive] = useState(0);
  if (!photos.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <img src={photos[active]} alt="" className="w-full aspect-video object-cover" />
      {photos.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto scrollbar-none">
          {photos.map((p, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === active ? 'border-[var(--cp)]' : 'border-transparent'}`}>
              <img src={p} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
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
      await reviewsApi.submit(id, myRating, myComment || undefined);
      setReviewMsg('Review submitted! Thank you.');
      setMyRating(0); setMyComment('');
      const lr = await listingsApi.get(id);
      const data = lr.data as Listing & { reviews?: Review[] };
      setListing(data);
      setReviews(data.reviews ?? []);
    } catch { setReviewMsg('Could not submit review.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cp, #008751) transparent var(--cp, #008751) var(--cp, #008751)' }} />
    </div>
  );

  if (!listing) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-5xl mb-3">🏢</p>
      <p className="font-semibold text-gray-600">{t('common.notFound')}</p>
      <Link to="/search" className="mt-3 inline-block font-semibold hover:underline" style={{ color: 'var(--cp, #008751)' }}>← {t('nav.search')}</Link>
    </div>
  );

  const certLevel = listing.certification?.level;
  const hasMap    = !!(listing.latitude && listing.longitude);
  const photos    = listing.photos?.filter(Boolean) ?? [];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
      {/* Back */}
      <Link to="/search" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={14} /> {t('nav.search')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left column (main info) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Header card */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <div className="flex items-start gap-4">
              {/* Logo / avatar */}
              <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-bold text-white overflow-hidden shrink-0"
                style={{ backgroundColor: 'var(--cp, #008751)' }}>
                {listing.logoUrl
                  ? <img src={listing.logoUrl} alt={listing.name} className="w-full h-full object-cover" />
                  : listing.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{listing.name}</h1>
                  {listing.verified && <BadgeCheck size={20} className="text-blue-500 shrink-0" />}
                  <FavoriteButton id={listing.id} type="listing" name={listing.name} size={16} variant="inline" className="ml-1" />
                  <FollowButton listingId={listing.id} name={listing.name} />
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-1.5">
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
                    <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded-full">{listing.category}</span>
                  )}
                  {listing.subcategory && (
                    <span className="text-xs text-gray-400 capitalize">{listing.subcategory}</span>
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
                onClick={() => navigator.share?.({ title: listing.name, url: window.location.href })
                  .catch(() => navigator.clipboard.writeText(window.location.href))}
              >
                <Share2 size={18} />
              </button>
            </div>

            {/* Quick contact links */}
            <div className="mt-4 space-y-2">
              {(listing.address || listing.city) && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <span>{[listing.address, listing.city, listing.region, listing.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {listing.openingHours && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock size={15} className="text-amber-400 shrink-0" />
                  <span>{listing.openingHours}</span>
                </div>
              )}
              {listing.website && (
                <a href={listing.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <Globe size={15} className="shrink-0" /> {listing.website.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              )}
            </div>

            {listing.description && (
              <p className="mt-4 text-sm text-gray-600 leading-relaxed">{listing.description}</p>
            )}

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {listing.tags.map(tag => (
                  <span key={tag.id} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{tag.name}</span>
                ))}
              </div>
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
                  style={{ backgroundColor: 'var(--cp, #008751)' }}>
                  <Phone size={15} /> {t('listing.callNow')}
                </a>
              )}
              {listing.whatsapp && (
                <a href={`https://wa.me/${listing.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-emerald-500">
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}
              {hasMap && (
                <a href={`https://www.openstreetmap.org/?mlat=${listing.latitude}&mlon=${listing.longitude}#map=16/${listing.latitude}/${listing.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2"
                  style={{ borderColor: 'var(--cp, #008751)', color: 'var(--cp, #008751)' }}>
                  <MapPin size={15} /> {t('listing.directions')}
                </a>
              )}
              {listing.bookable && listing.isPro && (
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-blue-500 text-blue-600"
                  onClick={() => setShowBooking(true)}>
                  <Calendar size={15} /> {t('bookings.bookNow')}
                </button>
              )}
            </div>
          </div>

          {/* Photo gallery */}
          {photos.length > 0 && <PhotoGallery photos={photos} />}

          {/* Reviews */}
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

            {user && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-semibold text-gray-700 mb-2">{/* TODO: translate */ }Leave a review</p>
                <StarRating value={myRating} interactive onChange={v => setMyRating(v)} size={24} showCount={false} />
                <textarea
                  className="w-full mt-3 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)] resize-none"
                  rows={2} value={myComment} onChange={e => setMyComment(e.target.value)}
                  placeholder="Share your experience (optional)..." />
                {reviewMsg && <p className="text-xs text-green-600 mt-1">{reviewMsg}</p>}
                <button
                  onClick={submitReview} disabled={!myRating || submitting}
                  className="mt-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
                  style={{ backgroundColor: 'var(--cp, #008751)' }}>
                  {submitting ? t('common.loading') : t('listing.submit')}
                </button>
              </div>
            )}

            {reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Star size={40} className="mx-auto mb-2 opacity-20" />
                <p>{t('search.noResults')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <User size={13} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{review.user.name}</p>
                          <StarRating value={review.rating} size={12} showCount={false} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600 mt-2 ml-9">{review.comment}</p>}
                    {review.ownerReply && (
                      <div className="mt-2 ml-9 pl-3 border-l-2 text-sm text-gray-500" style={{ borderColor: 'var(--cp, #008751)' }}>
                        <span className="font-semibold text-xs" style={{ color: 'var(--cp, #008751)' }}>Owner reply:</span>
                        <p>{review.ownerReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column (map + OSM metadata) ── */}
        <div className="space-y-4">
          {hasMap && (
            <OsmMap lat={listing.latitude!} lng={listing.longitude!} name={listing.name} />
          )}
          <OsmMetadata listing={listing} />

          {/* Nearby / view more */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Find nearby</p>
            <Link
              to={`/search?city=${encodeURIComponent(listing.city)}&country=${encodeURIComponent(listing.country)}`}
              className="flex items-center justify-between text-sm text-gray-700 hover:text-gray-900 py-1"
            >
              <span>More in {listing.city}</span>
              <Navigation size={13} className="text-gray-400" />
            </Link>
            {listing.category && (
              <Link
                to={`/search?category=${encodeURIComponent(listing.category)}&city=${encodeURIComponent(listing.city)}`}
                className="flex items-center justify-between text-sm text-gray-700 hover:text-gray-900 py-1 border-t border-gray-50 mt-1"
              >
                <span>{listing.category} in {listing.city}</span>
                <Navigation size={13} className="text-gray-400" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {showBooking && <BookingModal listing={listing} onClose={() => setShowBooking(false)} />}
    </div>
  );
}
