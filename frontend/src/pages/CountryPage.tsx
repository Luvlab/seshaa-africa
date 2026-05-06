import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, Building2, MapPin, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listingsApi } from '../services/api';
import { COUNTRIES } from '../components/layout/CountryPicker';
import { getThemeForCode } from '../store/theme';
import ListingCard from '../components/directory/ListingCard';
import type { Listing } from '../types';

export default function CountryPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const country = COUNTRIES.find(c => c.code === code?.toUpperCase());
  const theme = getThemeForCode(code?.toUpperCase() || 'NG');

  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<{ total: number; byCategory: { category: string; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    listingsApi.search({ country: country?.name || code, limit: 12 })
      .then(r => { setListings(r.data.listings || []); setStats({ total: r.data.total || 0, byCategory: [] }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code, country?.name]);

  if (!country) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center text-gray-400">
        <p className="text-5xl mb-4">🌍</p>
        <p className="text-xl font-bold">{t('country.notFound')}</p>
        <Link to="/" className="mt-4 inline-block text-green-600 hover:underline">{t('country.backHome')}</Link>
      </div>
    );
  }

  const CATEGORIES = [
    { key: 'health',     label: 'Health & Medical', emoji: '🏥' },
    { key: 'restaurant', label: 'Restaurants',      emoji: '🍽️' },
    { key: 'education',  label: 'Education',        emoji: '🎓' },
    { key: 'finance',    label: 'Finance & Banking', emoji: '💳' },
    { key: 'transport',  label: 'Transport',        emoji: '🚗' },
    { key: 'hotel',      label: 'Hotels',           emoji: '🏨' },
    { key: 'tech',       label: 'Technology',       emoji: '💻' },
    { key: 'beauty',     label: 'Beauty & Salons',  emoji: '💅' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero banner */}
      <div
        className="text-white py-12 px-4"
        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent || theme.primary}dd)` }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-6xl">{country.flag}</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-black">{country.name}</h1>
              <p className="text-white/80 mt-1">{country.region}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {country.langs.slice(0, 6).map(l => (
              <span key={l} className="text-xs bg-white/20 px-3 py-1 rounded-full">{l}</span>
            ))}
          </div>
          {stats && (
            <div className="flex gap-6 mt-5 text-sm">
              <div>
                <span className="font-black text-2xl">{stats.total.toLocaleString()}</span>
                <span className="text-white/70 ml-1">{t('country.listings')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Quick search for this country */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 mb-8">
          <h2 className="text-lg font-black text-gray-900 mb-3">
            {t('country.searchIn', { name: country.name })}
          </h2>
          <div className="flex gap-3">
            <Link
              to={`/search?country=${encodeURIComponent(country.name)}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold"
              style={{ backgroundColor: theme.primary }}
            >
              <Search size={18} /> {t('country.searchDir')}
            </Link>
            <Link
              to="/add-listing"
              className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-bold text-gray-700 hover:bg-gray-50"
            >
              <Building2 size={18} /> {t('country.addBusiness')}
            </Link>
          </div>
        </div>

        {/* Category quick access */}
        <h2 className="text-xl font-black text-gray-900 mb-4">{t('country.browseCategory')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.key}
              to={`/search?country=${encodeURIComponent(country.name)}&category=${cat.key}`}
              className="bg-white rounded-2xl border p-4 text-center hover:shadow-md transition-shadow group"
            >
              <span className="text-3xl block mb-2">{cat.emoji}</span>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-green-700">{cat.label}</span>
            </Link>
          ))}
        </div>

        {/* Featured listings */}
        <h2 className="text-xl font-black text-gray-900 mb-4">
          {t('country.featuredIn', { name: country.name })}
          {stats && <span className="text-sm font-normal text-gray-400 ml-2">{stats.total.toLocaleString()} {t('country.total')}</span>}
        </h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border" />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
            <div className="text-center">
              <Link
                to={`/search?country=${encodeURIComponent(country.name)}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold"
                style={{ backgroundColor: theme.primary }}
              >
                View all {stats?.total.toLocaleString()} {t('country.listings')} in {country.name} →
              </Link>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border p-10 text-center text-gray-400">
            <MapPin size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg font-semibold text-gray-600">{t('country.noListingsIn', { name: country.name })}</p>
            <p className="text-sm mt-1">{t('country.beFirst')}</p>
            <Link
              to="/add-listing"
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold"
              style={{ backgroundColor: theme.primary }}
            >
              {t('country.addListing')}
            </Link>
          </div>
        )}

        {/* Languages spoken */}
        <div className="mt-10 bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <Globe size={20} style={{ color: theme.primary }} /> {t('country.languages', { name: country.name })}
          </h2>
          <div className="flex flex-wrap gap-2">
            {country.langs.map(l => (
              <span key={l} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
