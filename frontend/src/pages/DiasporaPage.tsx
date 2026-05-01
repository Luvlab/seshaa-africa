/**
 * DiasporaPage — seshaa.diaspora
 *
 * A dedicated portal connecting African diaspora communities worldwide
 * to African businesses — both in their host country AND back home.
 * Shares the same database and API as the main Seshaa app.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe2, MapPin, Heart, ArrowRight, Search,
  Building2, UtensilsCrossed, Scissors, ShoppingBag,
  Music2, Send, Plane, Package, Users, Sparkles,
} from 'lucide-react';
import SeshaaTitle from '../components/brand/SeshaaTitle';

// ── Diaspora host countries / cities ────────────────────────────────────────
const DIASPORA_HUBS = [
  { city: 'London',      country: 'United Kingdom',  code: 'GB', flag: '🇬🇧', pop: '1.5M+ Africans' },
  { city: 'Paris',       country: 'France',           code: 'FR', flag: '🇫🇷', pop: '700K+ Africans' },
  { city: 'New York',    country: 'United States',    code: 'US', flag: '🇺🇸', pop: '2M+ Africans'   },
  { city: 'Toronto',     country: 'Canada',           code: 'CA', flag: '🇨🇦', pop: '500K+ Africans' },
  { city: 'Amsterdam',   country: 'Netherlands',      code: 'NL', flag: '🇳🇱', pop: '300K+ Africans' },
  { city: 'Brussels',    country: 'Belgium',          code: 'BE', flag: '🇧🇪', pop: '400K+ Africans' },
  { city: 'Lisbon',      country: 'Portugal',         code: 'PT', flag: '🇵🇹', pop: '250K+ Africans' },
  { city: 'Madrid',      country: 'Spain',            code: 'ES', flag: '🇪🇸', pop: '200K+ Africans' },
  { city: 'Berlin',      country: 'Germany',          code: 'DE', flag: '🇩🇪', pop: '250K+ Africans' },
  { city: 'Stockholm',   country: 'Sweden',           code: 'SE', flag: '🇸🇪', pop: '200K+ Africans' },
  { city: 'Dubai',       country: 'UAE',              code: 'AE', flag: '🇦🇪', pop: '400K+ Africans' },
  { city: 'Sydney',      country: 'Australia',        code: 'AU', flag: '🇦🇺', pop: '150K+ Africans' },
  { city: 'Oslo',        country: 'Norway',           code: 'NO', flag: '🇳🇴', pop: '100K+ Africans' },
  { city: 'Riyadh',      country: 'Saudi Arabia',     code: 'SA', flag: '🇸🇦', pop: '500K+ Africans' },
  { city: 'São Paulo',   country: 'Brazil',           code: 'BR', flag: '🇧🇷', pop: '12M+ Afro-Brazilians' },
  { city: 'Shanghai',    country: 'China',            code: 'CN', flag: '🇨🇳', pop: '200K+ Africans' },
];

// ── African homeland countries ───────────────────────────────────────────────
const HOMELAND_PICKS = [
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria'       },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana'         },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya'         },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa'  },
  { code: 'ET', flag: '🇪🇹', name: 'Ethiopia'      },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt'         },
  { code: 'SN', flag: '🇸🇳', name: 'Senegal'       },
  { code: 'CI', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: 'CM', flag: '🇨🇲', name: 'Cameroon'      },
  { code: 'MA', flag: '🇲🇦', name: 'Morocco'       },
  { code: 'TZ', flag: '🇹🇿', name: 'Tanzania'      },
  { code: 'UG', flag: '🇺🇬', name: 'Uganda'        },
  { code: 'AO', flag: '🇦🇴', name: 'Angola'        },
  { code: 'ZW', flag: '🇿🇼', name: 'Zimbabwe'      },
  { code: 'SO', flag: '🇸🇴', name: 'Somalia'       },
  { code: 'RW', flag: '🇷🇼', name: 'Rwanda'        },
  { code: 'CD', flag: '🇨🇩', name: 'DR Congo'      },
  { code: 'ML', flag: '🇲🇱', name: 'Mali'          },
];

// ── Diaspora-specific categories ─────────────────────────────────────────────
const DIASPORA_CATS = [
  { icon: UtensilsCrossed, label: 'African Food',      desc: 'Restaurants & grocers',    color: '#FF6B35', q: 'african restaurant' },
  { icon: Scissors,        label: 'Hair & Beauty',     desc: 'Braiding, weaves & more',   color: '#9333EA', q: 'african hair salon'  },
  { icon: Send,            label: 'Send Money Home',   desc: 'Remittances & transfers',   color: '#0EA5E9', q: 'money transfer'      },
  { icon: ShoppingBag,     label: 'African Fashion',   desc: 'Ankara, Kente & textiles',  color: '#F59E0B', q: 'african fashion'     },
  { icon: Music2,          label: 'Music & Events',    desc: 'Artists, clubs & events',   color: '#EF4444', q: 'african music events' },
  { icon: Plane,           label: 'Travel & Flights',  desc: 'Tickets to Africa',         color: '#10B981', q: 'flights africa'      },
  { icon: Package,         label: 'Ship to Africa',    desc: 'Send parcels & cargo home', color: '#6366F1', q: 'shipping africa'     },
  { icon: Building2,       label: 'All Businesses',    desc: 'Full directory',            color: '#008751', q: ''                    },
];

// ── How it works steps ────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: '01',
    icon: MapPin,
    title: 'Find African near you',
    desc: 'Browse African-owned businesses, restaurants, salons, and services in your city abroad.',
  },
  {
    step: '02',
    icon: Heart,
    title: 'Stay connected to home',
    desc: 'Explore listings, news, and prices from your African country — wherever you are in the world.',
  },
  {
    step: '03',
    icon: Globe2,
    title: 'Build community',
    desc: 'Add your business, share events, and help grow the African diaspora network.',
  },
];

// ── Manifesto stats ───────────────────────────────────────────────────────────
const STATS = [
  { value: '300M+', label: 'Africans in the diaspora' },
  { value: '54',    label: 'African countries covered' },
  { value: '16',    label: 'Diaspora host countries'   },
  { value: '1',     label: 'Connected community'       },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function DiasporaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState('');
  const [activeHub, setActiveHub] = useState<string | null>(null);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQ)}`);
    }
  };

  const searchCat = (q: string) => {
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
    else navigate('/search');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #0d2d1a 40%, #1a1a2e 70%, #0a0a0a 100%)',
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #008751, transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #FCD116, transparent)' }} />
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #CE1126, transparent)' }} />

        <div className="relative w-full px-6 sm:px-8 lg:px-12 py-20 text-center">
          {/* Brand */}
          <div className="flex justify-center mb-6">
            <SeshaaTitle staticSuffix="diaspora" size="lg" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-4">
            Africa,{' '}
            <span style={{ color: '#FCD116' }}>wherever</span>{' '}
            you are
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 leading-relaxed">
            {t('diaspora.subtitle')}
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto flex items-center bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 gap-3 hover:bg-white/15 transition-colors focus-within:border-green-400/50">
            <Search size={18} className="text-green-400 shrink-0" />
            <input
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-base"
              placeholder={t('diaspora.search')}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={handleSearch}
            />
            <button
              onClick={() => navigate('/search?ai=1&q=' + encodeURIComponent(searchQ))}
              title="AI search"
              className="text-yellow-400 hover:text-yellow-300"
            >
              <Sparkles size={16} />
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-10 border-t border-white/10">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black" style={{ color: '#FCD116' }}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <div className="bg-gray-900 py-16">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <h2 className="text-2xl font-bold text-center mb-10 text-white">{t('home.rep.how')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(item => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{ background: 'linear-gradient(135deg, #008751, #00a862)' }}>
                  <item.icon size={24} className="text-white" />
                </div>
                <p className="text-xs font-mono text-green-500 mb-1">{item.step}</p>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Diaspora categories ───────────────────────────────────────────── */}
      <div className="py-14 bg-gray-950">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">{t('diaspora.findServices')}</h2>
            <Link to="/search" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
              All listings <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {DIASPORA_CATS.map(cat => (
              <button
                key={cat.label}
                onClick={() => searchCat(cat.q)}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-600 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: cat.color + '22', border: `1.5px solid ${cat.color}44` }}
                >
                  <cat.icon size={20} style={{ color: cat.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{cat.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Diaspora hubs ─────────────────────────────────────────────────── */}
      <div className="py-14 bg-gray-900">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <h2 className="text-xl font-bold text-white mb-2">{t('diaspora.hubs')}</h2>
          <p className="text-sm text-gray-400 mb-8">
            {t('diaspora.subtitle')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {DIASPORA_HUBS.map(hub => (
              <button
                key={hub.code}
                onClick={() => {
                  setActiveHub(hub.code);
                  navigate(`/search?country=${hub.code}&q=african`);
                }}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left hover:scale-[1.01] active:scale-[0.99] ${
                  activeHub === hub.code
                    ? 'bg-green-900/30 border-green-500/50'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                }`}
              >
                <span className="text-2xl leading-none shrink-0">{hub.flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{hub.city}</p>
                  <p className="text-xs text-gray-400 truncate">{hub.pop}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Connect back home ─────────────────────────────────────────────── */}
      <div className="py-14 bg-gray-950">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <h2 className="text-xl font-bold text-white mb-2">{t('diaspora.homeland')}</h2>
          <p className="text-sm text-gray-400 mb-8">
            {t('diaspora.subtitle')}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-2">
            {HOMELAND_PICKS.map(c => (
              <Link
                key={c.code}
                to={`/country/${c.code}`}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all hover:scale-[1.04] active:scale-[0.97] text-center"
              >
                <span className="text-2xl leading-none">{c.flag}</span>
                <span className="text-xs text-gray-300 font-medium leading-tight">{c.name}</span>
              </Link>
            ))}
            <Link
              to="/search"
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gray-900 border border-dashed border-gray-700 hover:border-gray-500 transition-all hover:scale-[1.04] text-center"
            >
              <span className="text-2xl leading-none">🌍</span>
              <span className="text-xs text-gray-400 leading-tight">All Africa</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Community CTA ─────────────────────────────────────────────────── */}
      <div
        className="py-20 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #003d24, #008751, #003d24)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #FCD116 0%, transparent 50%), radial-gradient(circle at 80% 50%, #CE1126 0%, transparent 50%)' }} />
        <div className="relative w-full px-6 sm:px-8 lg:px-12">
          <Users size={40} className="mx-auto mb-4 text-white/80" />
          <h2 className="text-3xl font-black mb-4 text-white">{t('diaspora.title')}</h2>
          <p className="text-green-100 text-base mb-8 leading-relaxed">
            {t('diaspora.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/add-listing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-800 font-bold rounded-xl hover:bg-green-50 transition-colors text-sm">
              <Building2 size={16} /> {t('listing.addNew')}
            </Link>
            <Link to="/search"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 border border-white/40 text-white font-bold rounded-xl hover:bg-white/30 transition-colors text-sm">
              <Search size={16} /> {t('nav.search')}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Back to main app ──────────────────────────────────────────────── */}
      <div className="bg-gray-900 py-6 text-center border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-2">Part of the Seshaa Africa network</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-400 hover:text-green-300"
        >
          <SeshaaTitle staticSuffix="africa" size="sm" />
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
