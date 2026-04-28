import { useState, useEffect } from 'react';
import { Users, List, Megaphone, TrendingUp, Shield, DollarSign, Award, Send, CheckCircle, X } from 'lucide-react';
import { adminApi } from '../../services/api';

interface Stats {
  listings: number; users: number; ads: number; salesReps: number; pendingListings: number;
}
interface Financials {
  revenue: { totalProSubscriptions: number; activeSubscriptions: number; monthlyRecurringRevenue: number; adRevenue: number };
  costs: { salesCommissionsPaid: number; salesCommissionsPending: number; ambassadorPayoutsPaid: number; estimatedInfraNote: string };
  loanFund: { totalAllocated: number; totalDisbursed: number; totalRepaid: number; available: number; totalApplications: number };
  net: { estimated: number };
}
interface PendingListing { id: string; name: string; city: string; country: string; category?: string; phone?: string; createdAt: string; }
interface PendingPayout { id: string; amount: number; method: string; ambassador: { user: { name: string; phone: string; country: string } } }
interface LoanApp { id: string; amount: number; purpose: string; status: string; createdAt: string; user: { name: string; phone: string; country: string } }

type Tab = 'overview' | 'listings' | 'payouts' | 'loans' | 'finance' | 'promote';

export default function AdminPortal() {
  const [stats, setStats] = useState<Stats>({ listings: 0, users: 0, ads: 0, salesReps: 0, pendingListings: 0 });
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loanApps, setLoanApps] = useState<LoanApp[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [pressMsg, setPressMsg] = useState('');
  const [pressType, setPressType] = useState('award_winner');
  const [pressCopied, setPressCopied] = useState(false);

  useEffect(() => {
    adminApi.stats().then(r => r.data?.stats && setStats(r.data.stats)).catch(() => {});
    adminApi.financials().then(r => setFinancials(r.data)).catch(() => {});
    adminApi.listings({ status: 'pending' }).then(r => setPendingListings(r.data.listings || [])).catch(() => {});
    adminApi.pendingPayouts().then(r => setPendingPayouts(r.data || [])).catch(() => {});
    adminApi.loanApplications('PENDING').then(r => setLoanApps(r.data || [])).catch(() => {});
  }, []);

  const verifyListing = async (id: string) => {
    await adminApi.verifyListing(id);
    setPendingListings(prev => prev.filter(l => l.id !== id));
  };
  const rejectListing = async (id: string) => {
    await adminApi.rejectListing(id);
    setPendingListings(prev => prev.filter(l => l.id !== id));
  };
  const approvePayout = async (id: string) => {
    await adminApi.approvePayout(id);
    setPendingPayouts(prev => prev.filter(p => p.id !== id));
  };
  const updateLoan = async (id: string, status: string, amount?: number) => {
    await adminApi.updateLoan(id, { status, approvedAmount: amount });
    setLoanApps(prev => prev.filter(l => l.id !== id));
  };

  const generatePressRelease = () => {
    const templates: Record<string, string> = {
      award_winner: `PRESS RELEASE — FOR IMMEDIATE RELEASE\n\nSeshaa Africa Announces 2025 Directory Excellence Awards\n\nNairobi, Africa — Seshaa (seshaa.africa), Africa's fastest-growing phone and address directory, today announced the winners of the inaugural Seshaa 2025 Awards, recognizing outstanding businesses across the continent.\n\nThe Seshaa Awards celebrate businesses that have received exceptional ratings from their communities, maintain verified profiles, and demonstrate commitment to quality service across Africa's 54 nations.\n\n[INSERT WINNER NAMES AND CATEGORIES]\n\nAbout Seshaa\nSeshaa is Africa's comprehensive business directory, covering all 54 African countries with listings in 14 local languages. The platform serves as the continent's digital yellow pages, connecting millions of Africans with businesses, services, and professionals in their communities.\n\nPress Contact: press@seshaa.africa | www.seshaa.africa`,

      new_feature: `PRESS RELEASE\n\nSeshaa Africa Launches Online Booking for African Businesses\n\nSeshaa, Africa's leading business directory, has launched online booking capabilities for Pro businesses across the continent. Chauffeurs, caterers, beauty salons, garages and hotels can now accept bookings directly through their Seshaa profile.\n\nThe feature is part of Seshaa's Pro subscription tier, which also includes a physical verified sticker with QR code for business windows — confirming their listing on Africa's most trusted directory.\n\nSeshaa Pro also funds the Seshaa Women's Micro-Loan Program, providing 0%-interest loans to women entrepreneurs across Africa.\n\nwww.seshaa.africa`,

      micro_loan: `SOCIAL MEDIA POST — Seshaa Bank 💚\n\n🌍 Introducing the Seshaa Women's Micro-Loan Program!\n\nWe believe in Africa's women entrepreneurs. That's why 5% of every Seshaa Pro subscription funds 0%-interest micro-loans for women building businesses across Africa.\n\n✅ Loans from $20–$500\n✅ 0% interest\n✅ 6-month repayment\n✅ Via M-Pesa, MTN MoMo, Orange Money or Celo\n\nApply at seshaa.africa/bank 🚀\n\n#SeshaaAfrica #WomenInBusiness #AfricaRises #MicroFinance`,

      platform_launch: `📢 SESHAA IS LIVE IN ALL 54 AFRICAN COUNTRIES!\n\n🌍 Find ANY business, person, or government office in Africa\n📞 Verified phone numbers & addresses\n🏆 Ratings like Uber & TripAdvisor\n📅 Online bookings for chauffeurs, salons, caterers & more\n💳 Pay with M-Pesa, MTN MoMo, Celo or card\n🌐 Available in 14 African languages\n\nAfrica's Digital Yellow Pages is HERE.\n👉 seshaa.africa\n\n#Seshaa #Africa #Directory #MadeForAfrica`,
    };
    setPressMsg(templates[pressType] || '');
  };

  const copyPress = () => {
    navigator.clipboard.writeText(pressMsg);
    setPressCopied(true);
    setTimeout(() => setPressCopied(false), 2000);
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <Shield size={15} /> },
    { key: 'finance', label: 'Financials', icon: <DollarSign size={15} /> },
    { key: 'listings', label: 'Listings', icon: <List size={15} />, badge: stats.pendingListings },
    { key: 'payouts', label: 'Payouts', icon: <TrendingUp size={15} />, badge: pendingPayouts.length },
    { key: 'loans', label: 'Bank Loans', icon: <Award size={15} />, badge: loanApps.length },
    { key: 'promote', label: 'Promote', icon: <Send size={15} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Shield size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs text-gray-400">Seshaa Platform Control</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors relative ${
              tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon} {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Total Listings', value: stats.listings.toLocaleString(), sub: `${stats.pendingListings} pending`, color: 'green' },
            { label: 'Registered Users', value: stats.users.toLocaleString(), color: 'blue' },
            { label: 'Active Ads', value: stats.ads.toLocaleString(), color: 'orange' },
            { label: 'Sales Reps', value: stats.salesReps.toLocaleString(), color: 'purple' },
            { label: 'MRR', value: financials ? `$${financials.revenue.monthlyRecurringRevenue.toFixed(0)}` : '...', sub: 'Monthly recurring', color: 'emerald' },
            { label: 'Loan Fund', value: financials ? `$${financials.loanFund.available.toFixed(0)}` : '...', sub: 'Available for loans', color: 'rose' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Finance */}
      {tab === 'finance' && financials && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><DollarSign size={16} className="text-green-600" /> Revenue</h3>
              {[
                ['Active Pro Subs', `${financials.revenue.activeSubscriptions}`],
                ['Total Pro Revenue', `$${financials.revenue.totalProSubscriptions.toFixed(2)}`],
                ['MRR (estimated)', `$${financials.revenue.monthlyRecurringRevenue.toFixed(2)}`],
                ['Ad Revenue', `$${financials.revenue.adRevenue.toFixed(2)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-semibold text-gray-900">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-red-500" /> Costs & Payouts</h3>
              {[
                ['Sales Commissions Paid', `$${financials.costs.salesCommissionsPaid.toFixed(2)}`],
                ['Commissions Pending', `$${financials.costs.salesCommissionsPending.toFixed(2)}`],
                ['Ambassador Payouts', `$${financials.costs.ambassadorPayoutsPaid.toFixed(2)}`],
                ['Net Estimated', `$${financials.net.estimated.toFixed(2)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-semibold text-gray-900">{v}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">{financials.costs.estimatedInfraNote}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">🏦 Seshaa Women's Loan Fund</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Allocated (5% of revenue)', value: `$${financials.loanFund.totalAllocated.toFixed(2)}` },
                { label: 'Disbursed', value: `$${financials.loanFund.totalDisbursed.toFixed(2)}` },
                { label: 'Repaid', value: `$${financials.loanFund.totalRepaid.toFixed(2)}` },
                { label: 'Available', value: `$${financials.loanFund.available.toFixed(2)}` },
              ].map(s => (
                <div key={s.label} className="bg-rose-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-rose-700">{s.value}</p>
                  <p className="text-xs text-rose-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Listings */}
      {tab === 'listings' && (
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-gray-900 mb-4">Pending Verification ({pendingListings.length})</h3>
          {pendingListings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pending listings</p>
          ) : (
            <div className="space-y-3">
              {pendingListings.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 border rounded-xl bg-gray-50">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{l.name}</p>
                    <p className="text-xs text-gray-400">{l.city}, {l.country} · {l.category}</p>
                    {l.phone && <p className="text-xs text-gray-400">{l.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => verifyListing(l.id)}
                      className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200">
                      <CheckCircle size={16} />
                    </button>
                    <button onClick={() => rejectListing(l.id)}
                      className="p-2 rounded-lg bg-red-100 text-red-500 hover:bg-red-200">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ambassador Payouts */}
      {tab === 'payouts' && (
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-gray-900 mb-4">Pending Ambassador Payouts ({pendingPayouts.length})</h3>
          {pendingPayouts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pending payouts</p>
          ) : (
            <div className="space-y-3">
              {pendingPayouts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-xl bg-gray-50">
                  <div>
                    <p className="font-semibold text-sm">{p.ambassador.user.name}</p>
                    <p className="text-xs text-gray-400">{p.ambassador.user.country} · {p.method} · {p.ambassador.user.phone}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-700">${p.amount.toFixed(2)}</span>
                    <button onClick={() => approvePayout(p.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Micro Loan Applications */}
      {tab === 'loans' && (
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-gray-900 mb-4">🏦 Loan Applications ({loanApps.length} pending)</h3>
          {loanApps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pending applications</p>
          ) : (
            <div className="space-y-3">
              {loanApps.map(app => (
                <div key={app.id} className="border rounded-xl p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{app.user.name}</p>
                      <p className="text-xs text-gray-400">{app.user.country} · {app.user.phone}</p>
                      <p className="text-sm text-gray-600 mt-1"><strong>Purpose:</strong> {app.purpose}</p>
                      <p className="text-sm text-gray-600">Requested: <strong>${app.amount}</strong></p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateLoan(app.id, 'APPROVED', app.amount)}
                        className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                        Approve
                      </button>
                      <button onClick={() => updateLoan(app.id, 'REJECTED')}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-500 rounded-lg hover:bg-red-200">
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 p-3 bg-rose-50 rounded-xl text-xs text-rose-700">
            <strong>Seshaa Bank Policy:</strong> 0% interest micro-loans for women entrepreneurs, $20–$500, 6-month repayment.
            Funded by 5% of Pro subscription revenue. Disbursed via mobile money or Celo.
          </div>
        </div>
      )}

      {/* Promotion Tools */}
      {tab === 'promote' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Megaphone size={16} style={{ color: 'var(--cp)' }} /> Press & Social Media Tools
            </h3>
            <p className="text-sm text-gray-500 mb-4">Generate ready-to-send press releases and social media posts for African press outlets and social media.</p>

            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Template</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'award_winner', label: '🏆 Seshaa Awards PR' },
                  { id: 'new_feature', label: '🚀 New Feature Launch' },
                  { id: 'micro_loan', label: '🏦 Women\'s Loan Fund' },
                  { id: 'platform_launch', label: '📣 Platform Announcement' },
                ].map(t => (
                  <button key={t.id}
                    className={`text-sm py-2.5 px-3 rounded-xl border text-left transition-colors ${
                      pressType === t.id ? 'border-[var(--cp)] bg-[var(--cp-light)]' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={pressType === t.id ? { color: 'var(--cp)' } : {}}
                    onClick={() => setPressType(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm mb-4"
              style={{ backgroundColor: 'var(--cp)' }}
              onClick={generatePressRelease}>
              Generate Content
            </button>

            {pressMsg && (
              <div className="relative">
                <textarea
                  className="w-full border rounded-xl px-4 py-3 text-sm font-mono bg-gray-50 focus:outline-none resize-none"
                  rows={14}
                  value={pressMsg}
                  onChange={e => setPressMsg(e.target.value)}
                />
                <button
                  className="absolute top-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: pressCopied ? '#22c55e' : 'var(--cp)' }}
                  onClick={copyPress}>
                  {pressCopied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: 'WhatsApp', color: '#25D366', msg: 'Share to WhatsApp' },
                { name: 'Twitter/X', color: '#000000', msg: 'Share to X' },
                { name: 'Facebook', color: '#1877F2', msg: 'Share to Facebook' },
                { name: 'LinkedIn', color: '#0A66C2', msg: 'Share to LinkedIn' },
              ].map(s => (
                <button
                  key={s.name}
                  className="py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90"
                  style={{ backgroundColor: s.color }}
                  onClick={() => {
                    const text = encodeURIComponent(pressMsg.slice(0, 280));
                    if (s.name === 'WhatsApp') window.open(`https://wa.me/?text=${text}`);
                    else if (s.name === 'Twitter/X') window.open(`https://twitter.com/intent/tweet?text=${text}`);
                    else if (s.name === 'Facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=https://seshaa.africa`);
                    else if (s.name === 'LinkedIn') window.open(`https://www.linkedin.com/sharing/share-offsite/?url=https://seshaa.africa`);
                  }}>
                  {s.name}
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
              <strong>African Press Outlets:</strong> BusinessDay (Nigeria), Daily Nation (Kenya), Business Report (SA),
              Le Monde Afrique (Francophone), The East African, Jeune Afrique, AllAfrica.com
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
