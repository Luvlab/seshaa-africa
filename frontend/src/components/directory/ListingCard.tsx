import { useState } from 'react';
import { Phone, MapPin, Globe, MessageCircle, BadgeCheck, ExternalLink, Calendar, Award, Ribbon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { Listing } from '../../types';
import StarRating from '../ui/StarRating';
import BookingModal from './BookingModal';

const TYPE_COLORS = {
  PERSONAL: 'bg-blue-100 text-blue-700',
  BUSINESS: 'bg-green-100 text-green-700',
  GOVERNMENT: 'bg-gray-100 text-gray-700',
  NGO: 'bg-orange-100 text-orange-700',
};

const CERT_COLORS = {
  STANDARD: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  GOLD: 'bg-amber-50 text-amber-700 border-amber-300',
  PLATINUM: 'bg-purple-50 text-purple-700 border-purple-200',
};

interface Props {
  listing: Listing;
  compact?: boolean;
}

export default function ListingCard({ listing, compact }: Props) {
  const { t } = useTranslation();
  const [showBooking, setShowBooking] = useState(false);

  const certLevel = listing.certification?.level;
  const topAward = listing.awards?.[0];

  return (
    <>
      <div
        className={clsx(
          'bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-opacity-60 transition-all',
          compact ? 'p-3' : 'p-4',
          listing.isPro && 'border-l-4',
          certLevel === 'PLATINUM' ? 'border-l-purple-400' :
          certLevel === 'GOLD' ? 'border-l-amber-400' :
          listing.isPro ? 'border-l-yellow-400' : ''
        )}
        style={listing.isPro ? {} : {}}
      >
        <Link to={`/listing/${listing.id}`} className="block">
          <div className="flex items-start gap-3">
            {/* Avatar / Logo */}
            <div className={clsx(
              'rounded-xl flex items-center justify-center shrink-0 text-white font-bold overflow-hidden',
              compact ? 'w-10 h-10 text-base' : 'w-14 h-14 text-xl',
              !listing.logoUrl && (
                listing.type === 'BUSINESS' ? 'bg-green-500' :
                listing.type === 'GOVERNMENT' ? 'bg-gray-500' :
                listing.type === 'NGO' ? 'bg-orange-500' : 'bg-blue-500'
              )
            )}>
              {listing.logoUrl
                ? <img src={listing.logoUrl} alt={listing.name} className="w-full h-full object-cover" />
                : listing.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className={clsx('font-semibold text-gray-900 truncate', compact ? 'text-sm' : 'text-base')}>
                  {listing.name}
                </h3>
                {listing.verified && (
                  <BadgeCheck size={15} className="text-blue-500 shrink-0" />
                )}
                {certLevel && (
                  <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded border', CERT_COLORS[certLevel])}>
                    {certLevel === 'PLATINUM' ? '💎' : certLevel === 'GOLD' ? '🥇' : '⭐'} Seshaa {certLevel}
                  </span>
                )}
                {topAward && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                    <Award size={9} /> {topAward.year} Award
                  </span>
                )}
              </div>

              {/* Type + category */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[listing.type])}>
                  {t(`listing.${listing.type.toLowerCase()}`)}
                </span>
                {listing.category && (
                  <span className="text-xs text-gray-500">{listing.category}</span>
                )}
                {listing.bookable && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 flex items-center gap-1">
                    <Calendar size={9} /> Bookable
                  </span>
                )}
              </div>

              {/* Rating */}
              {listing.avgRating > 0 && (
                <div className="mt-1">
                  <StarRating value={listing.avgRating} count={listing.reviewCount} size={12} compact={compact} />
                </div>
              )}

              {!compact && (
                <div className="mt-2 space-y-1">
                  {listing.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Phone size={13} className="text-green-500 shrink-0" />
                      <a href={`tel:${listing.phone}`} className="hover:underline" style={{ color: 'var(--cp)' }} onClick={e => e.stopPropagation()}>
                        {listing.phone}
                      </a>
                    </div>
                  )}
                  {(listing.address || listing.city) && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <MapPin size={13} className="text-red-400 shrink-0" />
                      <span className="truncate">{[listing.address, listing.city, listing.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {listing.website && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Globe size={13} className="text-blue-400 shrink-0" />
                      <a href={listing.website} target="_blank" rel="noopener noreferrer"
                        className="hover:underline text-blue-500 truncate" onClick={e => e.stopPropagation()}>
                        {listing.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {compact && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {[listing.city, listing.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            {/* Quick actions */}
            {!compact && (
              <div className="flex flex-col gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                {listing.phone && (
                  <a href={`tel:${listing.phone}`}
                    className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100"
                    title="Call now">
                    <Phone size={15} />
                  </a>
                )}
                {listing.whatsapp && (
                  <a href={`https://wa.me/${listing.whatsapp.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"
                    title="WhatsApp">
                    <MessageCircle size={15} />
                  </a>
                )}
                {listing.website && (
                  <a href={listing.website} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100"
                    title="Website">
                    <ExternalLink size={15} />
                  </a>
                )}
                {listing.isPro && (
                  <Link to={`/listing/${listing.id}`}
                    className="w-9 h-9 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center hover:bg-yellow-100"
                    title="Seshaa Pro Verified"
                    onClick={e => e.stopPropagation()}>
                    <Ribbon size={15} />
                  </Link>
                )}
              </div>
            )}
          </div>

          {listing.description && !compact && (
            <p className="mt-2.5 text-sm text-gray-500 line-clamp-2 leading-relaxed">{listing.description}</p>
          )}
        </Link>

        {/* Book Now button — Pro bookable businesses */}
        {!compact && listing.bookable && listing.isPro && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--cp)' }}
              onClick={() => setShowBooking(true)}
            >
              <Calendar size={14} className="inline mr-1.5 -mt-0.5" />
              Book Now
            </button>
          </div>
        )}
      </div>

      {showBooking && (
        <BookingModal listing={listing} onClose={() => setShowBooking(false)} />
      )}
    </>
  );
}
