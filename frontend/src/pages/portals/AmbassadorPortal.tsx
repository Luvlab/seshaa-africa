import { useState, useEffect } from 'react';
import { ambassadorApi, paymentsApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Building2, Award, ArrowUpRight, Plus, Send } from 'lucide-react';

interface AmbassadorData {
  ambassador: {
    id: string; country: string; city?: string; totalEarned: number;
    pendingPayout: number; listingKickback: number; proKickbackRate: number;
    active: boolean; createdAt: string;
  };
  stats: {
    totalEarned: number; pendingPayout: number; listingsEntered: number;
    proSalesSold: number; listingKickbackRate: string; proKickbackRate: string;
  };
  recentProSales: Array<{ id: string; plan: string; kickback: number; createdAt: string; listing: { name: string; city: string } }>;
  recentListings: Array<{ id: string; name: string; city: string; country: string; createdAt: string }>;
  recentPayouts: Array<{ id: string; amount: number; method: string; paid: boolean; createdAt: string }>;
}

interface Plan {
  plan: string; price: number; label: string; ambassadorKickback: string; badge?: string;
  features: string[];
}

export default function AmbassadorPortal() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AmbassadorData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [applyCountry, setApplyCountry] = useState(user?.country || '');
  const [applyCity, setApplyCity] = useState('');
  const [tab, setTab] = useState<'dashboard' | 'listings' | 'plans' | 'payout'>('dashboard');
  const [payoutMethod, setPayoutMethod] = useState('mobile_money');
  const [payoutMethods, setPayoutMethods] = useState<Array<{ id: string; label: string }>>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    ambassadorApi.proPlans().then(r => setPlans(r.data)).catch(() => {});
    ambassadorApi.dashboard()
      .then(r => {
        setData(r.data);
        paymentsApi.methods(r.data.ambassador.country)
          .then(pm => setPayoutMethods(pm.data.methods || [])).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const applyAmbassador = async () => {
    if (!applyCountry) return;
    try {
      await ambassadorApi.apply(applyCountry, applyCity);
      window.location.reload();
    } catch { setMsg('Could not apply. Try again.'); }
  };

  const requestPayout = async () => {
    if (!data || data.ambassador.pendingPayout < 10) {
      setMsg('Minimum payout is $10.');
      return;
    }
    try {
      await ambassadorApi.requestPayout(payoutMethod);
      setMsg('Payout request submitted! Processing within 3 business days.');
    } catch { setMsg('Payout request failed. Try again.'); }
  };

  if (!user) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">🌟</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Ambassador Program</h2>
      <p className="text-gray-500 mb-6">Login to access the ambassador program</p>
      <Link to="/auth" className="inline-block px-6 py-3 rounded-xl text-white font-semibold" style={{ backgroundColor: 'var(--cp)' }}>Log In</Link>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cp) transparent var(--cp) var(--cp)' }} />
    </div>
  );

  // Not yet an ambassador
  if (!data) return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl p-8 text-center mb-6">
        <div className="text-5xl mb-3">🌟</div>
        <h1 className="text-3xl font-bold mb-2">Become a Seshaa Ambassador</h1>
        <p className="text-yellow-100 text-lg">Earn money by listing businesses and selling Pro subscriptions</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {[
          { icon: '📍', title: '$0.005 per listing', desc: 'Earn for every verified business you add to the directory' },
          { icon: '💰', title: '15% on Pro sales', desc: 'Get a kickback every time a business you found upgrades to Pro' },
          { icon: '📱', title: 'Mobile money payout', desc: 'Get paid via M-Pesa, MTN MoMo, Orange Money, or crypto' },
          { icon: '🏆', title: 'Leaderboard rewards', desc: 'Top ambassadors win bonuses and recognition' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border p-4">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="font-bold text-gray-900 mb-1">{item.title}</div>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>

      {showApply ? (
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-bold text-lg mb-4">Apply to become an Ambassador</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Country *</label>
              <input value={applyCountry} onChange={e => setApplyCountry(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)]"
                placeholder="e.g. Nigeria" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">City (optional)</label>
              <input value={applyCity} onChange={e => setApplyCity(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cp)]"
                placeholder="e.g. Lagos" />
            </div>
            {msg && <p className="text-sm text-red-500">{msg}</p>}
            <button onClick={applyAmbassador}
              className="w-full py-3 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'var(--cp)' }}>
              Apply Now
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowApply(true)}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg"
          style={{ backgroundColor: 'var(--cp)' }}>
          🌟 Join Ambassador Program
        </button>
      )}
    </div>
  );

  const amb = data.ambassador;
  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'listings', label: '📍 My Listings' },
    { id: 'plans', label: '💎 Pro Plans' },
    { id: 'payout', label: '💸 Payout' },
  ] as const;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="rounded-2xl text-white p-6 mb-6" style={{ background: `linear-gradient(135deg, var(--cp), var(--cp-dark))` }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">🌟 Ambassador Dashboard</h1>
            <p className="text-white/80">{amb.city ? `${amb.city}, ` : ''}{amb.country}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">${amb.totalEarned.toFixed(2)}</p>
            <p className="text-white/70 text-sm">Total earned</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Pending Payout', value: `$${amb.pendingPayout.toFixed(2)}`, icon: DollarSign },
            { label: 'Listings Added', value: data.stats.listingsEntered, icon: Building2 },
            { label: 'Pro Sales', value: data.stats.proSalesSold, icon: TrendingUp },
            { label: 'Kickback Rate', value: `${(amb.proKickbackRate * 100).toFixed(0)}%`, icon: Award },
          ].map((s, i) => (
            <div key={i} className="bg-white/15 rounded-xl p-3">
              <s.icon size={16} className="text-white/70 mb-1" />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-white/70 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-4">
          {/* Recent Pro Sales */}
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp size={16} style={{ color: 'var(--cp)' }} /> Recent Pro Sales
            </h3>
            {data.recentProSales.length === 0 ? (
              <p className="text-sm text-gray-400">No Pro sales yet. Share your referral link!</p>
            ) : (
              <div className="space-y-2">
                {data.recentProSales.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{s.listing.name}</p>
                      <p className="text-xs text-gray-400">{s.listing.city} · {s.plan}</p>
                    </div>
                    <span className="font-bold" style={{ color: 'var(--cp)' }}>+${s.kickback.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Listings */}
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 size={16} style={{ color: 'var(--cp)' }} /> Recent Listings Added
            </h3>
            {data.recentListings.length === 0 ? (
              <p className="text-sm text-gray-400">No listings yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recentListings.map(l => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{l.name}</p>
                      <p className="text-xs text-gray-400">{l.city}, {l.country}</p>
                    </div>
                    <Link to={`/listing/${l.id}`} className="text-gray-400 hover:text-gray-700">
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">My Submitted Listings</h3>
            <Link to="/search" className="flex items-center gap-1 text-sm font-semibold text-white px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--cp)' }}>
              <Plus size={14} /> Add Listing
            </Link>
          </div>
          {data.recentListings.length === 0 ? (
            <div className="text-center py-8">
              <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">Add businesses to earn ${(amb.listingKickback || 0.005).toFixed(3)} per verified listing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentListings.map(l => (
                <div key={l.id} className="flex items-center justify-between text-sm border rounded-xl p-3">
                  <div>
                    <p className="font-medium text-gray-800">{l.name}</p>
                    <p className="text-xs text-gray-400">{l.city}, {l.country} · Added {new Date(l.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Link to={`/listing/${l.id}`} className="text-xs font-medium" style={{ color: 'var(--cp)' }}>View</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'plans' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map(plan => (
            <div key={plan.plan} className={`bg-white rounded-2xl border-2 p-5 ${plan.badge ? 'border-yellow-400' : 'border-gray-200'}`}>
              {plan.badge && <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 mb-2">{plan.badge}</span>}
              <h3 className="font-bold text-lg text-gray-900">{plan.label}</h3>
              <p className="text-3xl font-black mt-1">${plan.price}<span className="text-sm font-normal text-gray-500">/{plan.plan === 'ANNUAL' ? 'yr' : 'mo'}</span></p>
              <p className="text-sm font-semibold mt-2" style={{ color: 'var(--cp)' }}>You earn: {plan.ambassadorKickback}</p>
              <ul className="mt-3 space-y-1">
                {plan.features.map(f => (
                  <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span style={{ color: 'var(--cp)' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === 'payout' && (
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Send size={16} style={{ color: 'var(--cp)' }} /> Request Payout
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-600">Available balance</p>
            <p className="text-3xl font-bold text-gray-900">${amb.pendingPayout.toFixed(2)}</p>
            {amb.pendingPayout < 10 && <p className="text-xs text-amber-600 mt-1">Minimum payout is $10.00</p>}
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">Payout Method</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'mobile_money', label: 'Mobile Money' },
                { id: 'celo_cusd', label: 'Celo (cUSD)' },
                { id: 'bank_transfer', label: 'Bank Transfer' },
                ...payoutMethods.filter(m => !['mobile_money', 'celo_cusd', 'bank_transfer'].includes(m.id)).slice(0, 2),
              ].map(m => (
                <button key={m.id}
                  className={`text-sm py-2.5 px-3 rounded-xl border text-left transition-colors ${
                    payoutMethod === m.id ? 'border-[var(--cp)] bg-[var(--cp-light)] font-medium' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={payoutMethod === m.id ? { color: 'var(--cp)' } : {}}
                  onClick={() => setPayoutMethod(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {msg && <p className="text-sm text-green-600 mb-3">{msg}</p>}
          <button
            onClick={requestPayout}
            disabled={amb.pendingPayout < 10}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-40"
            style={{ backgroundColor: 'var(--cp)' }}>
            Request ${amb.pendingPayout.toFixed(2)} Payout
          </button>
          <p className="text-xs text-center text-gray-400 mt-2">Processed within 3 business days</p>
          {data.recentPayouts.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-gray-700 mb-2">Payout History</p>
              {data.recentPayouts.map(p => (
                <div key={p.id} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600">{p.method} · {new Date(p.createdAt).toLocaleDateString()}</span>
                  <span className={p.paid ? 'text-green-600 font-medium' : 'text-amber-600'}>
                    ${p.amount.toFixed(2)} {p.paid ? '✓' : '(pending)'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
