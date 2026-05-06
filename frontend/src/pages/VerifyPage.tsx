import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { certApi } from '../services/api';
import { BadgeCheck, Star, Award, MapPin, Calendar } from 'lucide-react';

interface VerifyData {
  valid: boolean;
  stickerCode: string;
  listing: {
    id: string; name: string; address?: string; city: string; country: string;
    category?: string; verified: boolean; avgRating: number; reviewCount: number;
    logoUrl?: string;
    certification?: { level: string };
    awards?: { category: string; year: number; rank: number }[];
  };
  plan: string;
  memberSince: string;
  expiresAt?: string;
  badge: string;
  message: string;
}

const CERT_ICON = { PLATINUM: '💎', GOLD: '🥇', STANDARD: '⭐' };

export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const [data, setData] = useState<VerifyData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    certApi.verify(code)
      .then(r => setData(r.data))
      .catch(() => setError(t('verify.invalidCode')))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cp) transparent var(--cp) var(--cp)' }} />
    </div>
  );

  if (error || !data) return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">❌</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">{t('verify.invalidCode')}</h2>
      <p className="text-gray-500 text-sm mb-6">{t('verify.invalidDesc')}</p>
      <Link to="/" className="inline-block px-6 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: 'var(--cp)' }}>
        {t('verify.goToSeshaa')}
      </Link>
    </div>
  );

  const l = data.listing;
  const certLevel = l.certification?.level as keyof typeof CERT_ICON | undefined;

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold mb-4"
          style={{ backgroundColor: 'var(--cp)' }}>
          <BadgeCheck size={16} /> {t('verify.verifiedBusiness')}
        </div>
        <p className="text-xs text-gray-400 font-mono tracking-wider">{data.stickerCode}</p>
      </div>

      {/* Business card */}
      <div className="bg-white rounded-2xl shadow-lg border-2 overflow-hidden mb-4" style={{ borderColor: 'var(--cp)' }}>
        {/* Top bar */}
        <div className="h-2" style={{ backgroundColor: 'var(--cp)' }} />

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white overflow-hidden"
              style={{ backgroundColor: 'var(--cp)' }}>
              {l.logoUrl ? <img src={l.logoUrl} alt={l.name} className="w-full h-full object-cover" /> : l.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{l.name}</h2>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin size={12} />
                {[l.city, l.country].join(', ')}
              </div>
              {l.category && <p className="text-xs text-gray-400 capitalize">{l.category}</p>}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {l.verified && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <BadgeCheck size={12} /> Verified
              </span>
            )}
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
              ⭐ Seshaa Pro {data.plan === 'ANNUAL' ? '(Annual)' : '(Monthly)'}
            </span>
            {certLevel && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {CERT_ICON[certLevel]} Seshaa {certLevel}
              </span>
            )}
          </div>

          {/* Rating */}
          {l.avgRating > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={16} fill={s <= Math.round(l.avgRating) ? '#F59E0B' : 'none'}
                    className={s <= Math.round(l.avgRating) ? 'text-amber-400' : 'text-gray-300'} />
                ))}
              </div>
              <span className="font-bold text-gray-800">{l.avgRating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({l.reviewCount} reviews)</span>
            </div>
          )}

          {/* Awards */}
          {l.awards && l.awards.length > 0 && (
            <div className="space-y-1 mb-4">
              {l.awards.slice(0, 3).map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <Award size={12} className="text-rose-500" />
                  {a.rank === 1 ? '🥇' : a.rank === 2 ? '🥈' : '🥉'} {a.year} Seshaa Award — {a.category}
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-400 flex items-center gap-1 pt-3 border-t border-gray-100">
            <Calendar size={11} />
            Pro member since {new Date(data.memberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Seshaa branding */}
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-3">{data.message}</p>
        <Link to={`/listing/${l.id}`}
          className="inline-block w-full py-3 rounded-xl text-white font-semibold text-sm"
          style={{ backgroundColor: 'var(--cp)' }}>
          {t('verify.viewOnSeshaa')}
        </Link>
        <p className="text-xs text-gray-400 mt-3">{t('verify.branding')}</p>
      </div>
    </div>
  );
}
