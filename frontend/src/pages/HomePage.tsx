import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Zap, Users, Building2, Landmark, Heart, Sparkles, TrendingUp } from 'lucide-react';
import { listingsApi } from '../services/api';
import ListingCard from '../components/directory/ListingCard';
import AdBanner from '../components/ads/AdBanner';
import type { Listing } from '../types';

const CATEGORIES = [
  { key: 'restaurant', icon: '🍽️' },
  { key: 'health', icon: '🏥' },
  { key: 'education', icon: '🏫' },
  { key: 'finance', icon: '🏦' },
  { key: 'transport', icon: '🚌' },
  { key: 'hotel', icon: '🏨' },
  { key: 'tech', icon: '💻' },
  { key: 'beauty', icon: '💄' },
  { key: 'auto', icon: '🔧' },
  { key: 'agriculture', icon: '🌾' },
  { key: 'church', icon: '⛪' },
  { key: 'construction', icon: '🏗️' },
];

const AFRICAN_COUNTRIES = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'DRC', name: 'DR Congo', flag: '🇨🇩' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
];

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [featured, setFeatured] = useState<Listing[]>([]);

  useEffect(() => {
    listingsApi.search({ limit: 6 })
      .then(r => setFeatured(r.data.listings))
      .catch(() => {});
  }, []);

  const handleSearch = () => {
    if (!query.trim()) return;
    if (aiMode) navigate(`/search?ai=1&q=${encodeURIComponent(query)}`);
    else navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="text-white" style={{ background: 'linear-gradient(135deg, var(--cp-dark), var(--cp))' }}>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            🌍 {t('app.tagline')}
          </h1>
          <p className="text-green-100 text-lg mb-10">{t('app.description')}</p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl shadow-xl p-2 flex gap-2 max-w-2xl mx-auto">
            <div className="flex-1 flex items-center gap-3 px-3">
              {aiMode ? <Sparkles size={20} className="text-purple-500" /> : <Search size={20} className="text-gray-400" />}
              <input
                className="flex-1 outline-none text-gray-800 text-lg placeholder-gray-400"
                placeholder={aiMode ? 'Ask anything... "find a hospital in Lagos" / "dentist near Nairobi CBD"' : t('search.placeholder')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`flex items-center gap-1 text-xs px-3 py-2 rounded-xl font-medium transition-colors ${
                  aiMode ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                }`}
                onClick={() => setAiMode(v => !v)}
                title="Toggle AI search"
              >
                <Zap size={14} /> AI
              </button>
              <button
                className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--cp)' }}
                onClick={handleSearch}
              >
                {t('search.searchBtn')}
              </button>
            </div>
          </div>

          {/* Quick type filters */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {[
              { type: 'PERSONAL', icon: <Users size={14} />, label: t('listing.personal') },
              { type: 'BUSINESS', icon: <Building2 size={14} />, label: t('listing.business') },
              { type: 'GOVERNMENT', icon: <Landmark size={14} />, label: t('listing.government') },
              { type: 'NGO', icon: <Heart size={14} />, label: t('listing.ngo') },
            ].map(({ type, icon, label }) => (
              <button
                key={type}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-medium"
                onClick={() => navigate(`/search?type=${type}`)}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Countries grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Browse by Country</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {AFRICAN_COUNTRIES.map(c => (
            <button
              key={c.code}
              className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border hover:border-green-300 hover:shadow-sm text-sm"
              onClick={() => navigate(`/search?country=${c.code}`)}
            >
              <span className="text-2xl">{c.flag}</span>
              <span className="text-xs text-gray-600 text-center leading-tight">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Browse by Category</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border hover:border-green-300 hover:shadow-sm"
              onClick={() => navigate(`/search?category=${c.key}`)}
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-xs text-gray-600 text-center">{t(`categories.${c.key}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured listings + ad */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-green-600" />
          <h2 className="text-xl font-bold text-gray-800">Featured Listings</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
            {featured.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
          <div className="space-y-4">
            <AdBanner tier="FEATURED" className="w-full" />
            <AdBanner tier="SPONSORED" className="w-full" />
            {/* Sales rep CTA */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-xl p-5">
              <h3 className="font-bold text-lg mb-1">💼 {t('salesrep.title')}</h3>
              <p className="text-sm text-purple-100 mb-3">{t('salesrep.earn', { rate: 20 })}</p>
              <a href="/salesrep" className="bg-white text-purple-700 font-semibold px-4 py-2 rounded-full text-sm hover:bg-purple-50 inline-block">
                {t('salesrep.apply')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
