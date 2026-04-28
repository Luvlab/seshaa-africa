import { Phone, MapPin, Globe, MessageCircle, BadgeCheck, Star, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { Listing } from '../../types';

const TYPE_COLORS = {
  PERSONAL: 'bg-blue-100 text-blue-700',
  BUSINESS: 'bg-green-100 text-green-700',
  GOVERNMENT: 'bg-gray-100 text-gray-700',
  NGO: 'bg-orange-100 text-orange-700',
};

interface Props {
  listing: Listing;
  compact?: boolean;
}

export default function ListingCard({ listing, compact }: Props) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/listing/${listing.id}`}
      className={clsx(
        'block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all',
        compact ? 'p-3' : 'p-4',
        listing.isPro && 'border-l-4 border-l-yellow-400'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar / Logo */}
        <div className={clsx(
          'rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg',
          compact ? 'w-10 h-10' : 'w-14 h-14',
          listing.type === 'BUSINESS' ? 'bg-green-500' :
          listing.type === 'GOVERNMENT' ? 'bg-gray-500' :
          listing.type === 'NGO' ? 'bg-orange-500' : 'bg-blue-500'
        )}>
          {listing.logoUrl
            ? <img src={listing.logoUrl} alt={listing.name} className="w-full h-full rounded-full object-cover" />
            : listing.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={clsx('font-semibold text-gray-900 truncate', compact ? 'text-sm' : 'text-base')}>
              {listing.name}
            </h3>
            {listing.verified && (
              <BadgeCheck size={15} className="text-blue-500 shrink-0" />
            )}
            {listing.isPro && (
              <Star size={13} className="text-yellow-500 fill-yellow-400 shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[listing.type])}>
              {t(`listing.${listing.type.toLowerCase()}`)}
            </span>
            {listing.category && (
              <span className="text-xs text-gray-500">{listing.category}</span>
            )}
          </div>

          {!compact && (
            <div className="mt-2 space-y-1">
              {listing.phone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Phone size={13} className="text-green-500 shrink-0" />
                  <a href={`tel:${listing.phone}`} className="hover:text-green-600" onClick={e => e.stopPropagation()}>
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
                    className="hover:text-blue-600 truncate" onClick={e => e.stopPropagation()}>
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
          <div className="flex flex-col gap-1.5 shrink-0">
            {listing.phone && (
              <a
                href={`tel:${listing.phone}`}
                className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100"
                onClick={e => e.stopPropagation()}
                title={t('listing.callNow')}
              >
                <Phone size={16} />
              </a>
            )}
            {listing.whatsapp && (
              <a
                href={`https://wa.me/${listing.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"
                onClick={e => e.stopPropagation()}
                title="WhatsApp"
              >
                <MessageCircle size={16} />
              </a>
            )}
            {listing.website && (
              <a
                href={listing.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100"
                onClick={e => e.stopPropagation()}
                title={t('listing.website')}
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        )}
      </div>

      {listing.description && !compact && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{listing.description}</p>
      )}
    </Link>
  );
}
