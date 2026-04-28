import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { adsApi } from '../../services/api';
import { useInterestsStore } from '../../store/interests';
import type { Ad, AdTier } from '../../types';
import clsx from 'clsx';

const TIER_STYLES: Record<AdTier, string> = {
  BANNER: 'bg-gray-50 border border-gray-200',
  FEATURED: 'bg-blue-50 border border-blue-200',
  SPONSORED: 'bg-yellow-50 border border-yellow-300',
  PREMIUM: 'bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300',
};

interface Props {
  country?: string;
  city?: string;
  category?: string;
  tier?: AdTier;
  className?: string;
}

export default function AdBanner({ country, city, category, tier = 'BANNER', className }: Props) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { sessionId, categories, keywords } = useInterestsStore();

  useEffect(() => {
    adsApi.getContextual({
      country,
      city,
      category,
      tier,
      sessionId,
      interests: categories.join(','),
      keywords: keywords.join(','),
    })
      .then(r => setAds(r.data))
      .catch(() => {});
  }, [country, city, category, tier, sessionId]);

  const handleClick = async (ad: Ad) => {
    await adsApi.click(ad.id).catch(() => {});
    window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
  };

  const visible = ads.filter(a => !dismissed.has(a.id));
  if (!visible.length) return (
    <div className={clsx('rounded-lg p-4 text-center text-sm text-gray-400 border border-dashed border-gray-200', className)}>
      <p className="font-medium text-gray-500">Advertise here</p>
      <p className="text-xs mt-1">Reach thousands of Africans daily</p>
    </div>
  );

  const ad = visible[0];

  return (
    <div className={clsx('rounded-lg overflow-hidden relative', TIER_STYLES[ad.tier], className)}>
      <span className="absolute top-2 left-2 text-xs bg-white/80 text-gray-500 px-2 py-0.5 rounded-full font-medium">
        Sponsored
      </span>
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        onClick={() => setDismissed(s => new Set(s).add(ad.id))}
      >
        <X size={14} />
      </button>

      <button
        className="w-full text-left p-4 pt-8 hover:opacity-90 transition-opacity"
        onClick={() => handleClick(ad)}
      >
        {ad.imageUrl && (
          <img src={ad.imageUrl} alt={ad.title} className="w-full h-28 object-cover rounded mb-3" />
        )}
        <p className="font-semibold text-gray-800 text-sm">{ad.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{ad.advertiser}</p>
        {ad.contactPhone && (
          <p className="text-xs text-green-600 mt-1">📞 {ad.contactPhone}</p>
        )}
        <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
          <ExternalLink size={11} /> <span>Learn more</span>
        </div>
      </button>
    </div>
  );
}
