import { useState, useEffect } from 'react';
import {
  LayoutDashboard, List, Megaphone, TrendingUp, Shield, DollarSign, Award,
  Send, CheckCircle, X, Users, Activity, Globe, Bell, ChevronRight,
  AlertTriangle, Tv, Database, Paintbrush, RefreshCw, Briefcase,
} from 'lucide-react';
import { adminApi, adsApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { ALL_LOGOS, saveEnabled, type LogoId } from '../../components/brand/LogoRotator';

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
interface PendingPayout  { id: string; amount: number; method: string; ambassador: { user: { name: string; phone: string; country: string } } }
interface LoanApp        { id: string; amount: number; purpose: string; status: string; createdAt: string; user: { name: string; phone: string; country: string } }

type Tab = 'overview' | 'listings' | 'payouts' | 'loans' | 'finance' | 'adcms' | 'promote' | 'scraper' | 'branding' | 'salesreps';

// Hero media config
interface HeroConfig {
  mediaType: 'youtube' | 'image' | 'video' | 'default';
  mediaUrl: string;
  overlayTitle: string;
  overlaySubtitle: string;
  ctaText: string;
  ctaUrl: string;
  advertiser: string;
}

const DEFAULT_HERO: HeroConfig = {
  mediaType: 'youtube',
  mediaUrl: 'https://www.youtube.com/embed/T2RpwsMIhRg',
  overlayTitle: 'Seshaa and you will find.',
  overlaySubtitle: 'Africa\'s business directory — all 54 countries',
  ctaText: 'Book this ad spot',
  ctaUrl: '/advertise',
  advertiser: 'Demo — Uganda Coffee Company',
};

export default function AdminPortal() {
  const { user } = useAuthStore();
  const [stats, setStats]                 = useState<Stats>({ listings: 0, users: 0, ads: 0, salesReps: 0, pendingListings: 0 });
  const [financials, setFinancials]       = useState<Financials | null>(null);
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [pendingPayouts, setPendingPayouts]   = useState<PendingPayout[]>([]);
  const [loanApps, setLoanApps]           = useState<LoanApp[]>([]);
  const [tab, setTab]                     = useState<Tab>('overview');
  const [pressMsg, setPressMsg]           = useState('');
  const [pressType, setPressType]         = useState('award_winner');
  const [pressCopied, setPressCopied]     = useState(false);

  // Hero CMS state
  const [hero, setHero]                   = useState<HeroConfig>(DEFAULT_HERO);
  const [heroSaving, setHeroSaving]       = useState(false);
  const [heroSaved, setHeroSaved]         = useState(false);

  // Scraper state
  const [scrapeCounts, setScrapeCounts]   = useState<{ city: string; country: string; count: number }[]>([]);
  const [scrapeTotal, setScrapeTotal]     = useState(0);
  const [scrapingCity, setScrapingCity]   = useState<string | null>(null);
  const [scrapeMsg, setScrapeMsg]         = useState('');
  const [scrapingAll, setScrapingAll]     = useState(false);
  const [enriching, setEnriching]         = useState(false);

  // Sales reps state
  interface SalesRepEntry {
    id: string; name: string; phone?: string; email?: string; country?: string;
    territory: string; active: boolean; totalEarned: number; commissionRate: number;
    adsCount: number; createdAt: string; unpaidCommissions: number;
  }
  const [salesReps, setSalesReps] = useState<SalesRepEntry[]>([]);
  const [repsLoaded, setRepsLoaded] = useState(false);

  // Branding state
  const [enabledLogos, setEnabledLogos]   = useState<LogoId[]>(() => {
    try { const s = localStorage.getItem('seshaa-logo-rotation'); return s ? JSON.parse(s) : ALL_LOGOS.map(l => l.id); }
    catch { return ALL_LOGOS.map(l => l.id) as LogoId[]; }
  });

  // CSS settings — read from localStorage, applied as CSS custom properties
  const readCss = (key: string, def: number) => {
    const v = parseFloat(localStorage.getItem(key) ?? '');
    return isNaN(v) ? def : v;
  };
  const [logoMainSize,  setLogoMainSize]  = useState(() => readCss('seshaa-logo-main', 1.95));
  const [logoDotSize,   setLogoDotSize]   = useState(() => readCss('seshaa-logo-dot',  1.65));
  const [logoStroke,    setLogoStroke]    = useState(() => readCss('seshaa-logo-stroke', 1.5));
  const [customCss,     setCustomCss]     = useState(() => localStorage.getItem('seshaa-custom-css') ?? '');
  const [cssSaved,      setCssSaved]      = useState(false);

  // Apply a CSS custom property on the root element + persist
  const applyCssVar = (varName: string, value: string, lsKey: string, raw: number) => {
    document.documentElement.style.setProperty(varName, value);
    localStorage.setItem(lsKey, String(raw));
  };
  const applyCustomCss = (css: string) => {
    localStorage.setItem('seshaa-custom-css', css);
    let el = document.getElementById('seshaa-custom-css');
    if (!el) { el = document.createElement('style'); el.id = 'seshaa-custom-css'; document.head.appendChild(el); }
    el.textContent = css;
  };

  useEffect(() => {
    adminApi.stats().then(r => r.data?.stats && setStats(r.data.stats)).catch(() => {});
    adminApi.financials().then(r => setFinancials(r.data)).catch(() => {});
    adminApi.listings({ status: 'pending' }).then(r => setPendingListings(r.data.listings || [])).catch(() => {});
    adminApi.pendingPayouts().then(r => setPendingPayouts(r.data || [])).catch(() => {});
    adminApi.loanApplications('PENDING').then(r => setLoanApps(r.data || [])).catch(() => {});
    adminApi.scrapeCounts().then(r => {
      setScrapeCounts(r.data.counts || []);
      setScrapeTotal(r.data.total || 0);
    }).catch(() => {});
    adminApi.getHero().then(r => {
      if (r.data?.description) {
        try { const d = JSON.parse(r.data.description); setHero(d); } catch { /* use default */ }
      }
    }).catch(() => {});
  }, []);

  const verifyListing = async (id: string) => {
    await adminApi.verifyListing(id);
    setPendingListings(p => p.filter(l => l.id !== id));
  };
  const rejectListing = async (id: string) => {
    await adminApi.rejectListing(id);
    setPendingListings(p => p.filter(l => l.id !== id));
  };
  const approvePayout = async (id: string) => {
    await adminApi.approvePayout(id);
    setPendingPayouts(p => p.filter(x => x.id !== id));
  };
  const updateLoan = async (id: string, status: string, amount?: number) => {
    await adminApi.updateLoan(id, { status, approvedAmount: amount });
    setLoanApps(p => p.filter(l => l.id !== id));
  };

  const loadSalesReps = async () => {
    if (repsLoaded) return;
    try {
      const r = await adminApi.getSalesReps();
      setSalesReps(r.data);
      setRepsLoaded(true);
    } catch { /* ignore */ }
  };

  const approveRep = async (id: string) => {
    await adminApi.approveSalesRep(id).catch(() => {});
    setSalesReps(prev => prev.map(r => r.id === id ? { ...r, active: true } : r));
  };

  const rejectRep = async (id: string) => {
    await adminApi.rejectSalesRep(id).catch(() => {});
    setSalesReps(prev => prev.filter(r => r.id !== id));
  };

  const saveHero = async () => {
    setHeroSaving(true);
    try {
      await adminApi.setHero(hero);
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 3000);
    } catch { alert('Error saving hero config'); }
    finally { setHeroSaving(false); }
  };

  const triggerScrape = async (city: string, country: string) => {
    const key = `${city}|${country}`;
    setScrapingCity(key);
    setScrapeMsg('');
    try {
      const r = await adminApi.scrapeCity(city, country);
      setScrapeMsg(`✓ ${city}: ${r.data.inserted} listings imported`);
      // Refresh counts
      adminApi.scrapeCounts().then(r2 => { setScrapeCounts(r2.data.counts || []); setScrapeTotal(r2.data.total || 0); }).catch(() => {});
    } catch {
      setScrapeMsg(`✗ ${city}: scrape failed — check network / Overpass status`);
    } finally {
      setScrapingCity(null);
    }
  };

  const triggerScrapeAll = async () => {
    setScrapingAll(true);
    setScrapeMsg('');
    try {
      const r = await adminApi.scrapeAll();
      setScrapeMsg(`✓ Background scrape started — ${r.data.cities} cities queued. Refresh counts in a few minutes.`);
    } catch {
      setScrapeMsg('✗ Failed to start full scrape');
    } finally {
      setScrapingAll(false);
    }
  };

  const triggerEnrich = async () => {
    setEnriching(true);
    setScrapeMsg('');
    try {
      const r = await adminApi.scrapeEnrich();
      setScrapeMsg(`✓ Price enrichment complete — ${r.data.enriched} listings processed`);
    } catch {
      setScrapeMsg('✗ Enrich failed');
    } finally {
      setEnriching(false);
    }
  };

  const toggleLogo = (id: LogoId) => {
    setEnabledLogos(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      const safe = next.length === 0 ? [id] : next; // always keep at least 1
      saveEnabled(safe);
      window.dispatchEvent(new Event('storage')); // notify LogoRotator on same tab
      return safe;
    });
  };

  const generatePressRelease = () => {
    const templates: Record<string, string> = {
      award_winner:    `PRESS RELEASE — FOR IMMEDIATE RELEASE\n\nSeshaa Africa Announces 2026 Directory Excellence Awards\n\nNairobi — Seshaa (seshaa.africa), Africa's fastest-growing directory, today announced the winners of the inaugural Seshaa 2026 Awards, recognizing outstanding businesses across the continent.\n\n[INSERT WINNER NAMES AND CATEGORIES]\n\nAbout Seshaa\nSeshaa is Africa's comprehensive business directory covering all 54 countries in 14 local languages.\n\nPress: press@seshaa.africa | seshaa.africa`,
      new_feature:     `PRESS RELEASE\n\nSeshaa Africa Launches Online Booking for African Businesses\n\nSeshaa, Africa's leading directory, has launched online booking for Pro businesses — chauffeurs, salons, hotels, garages. Pro includes a verified sticker + QR code for business windows.\n\nSeshaa Pro funds the Women's Micro-Loan Program: 0%-interest loans for women entrepreneurs.\n\nseshaa.africa`,
      micro_loan:      `SOCIAL MEDIA — Seshaa Bank 💚\n\n🌍 Introducing the Seshaa Women's Micro-Loan Program!\n\n✅ Loans from $20–$500\n✅ 0% interest\n✅ 6-month repayment\n✅ Via M-Pesa, MTN MoMo, Orange Money or Celo\n\nseshaa.africa/bank 🚀\n\n#SeshaaAfrica #WomenInBusiness #AfricaRises`,
      platform_launch: `📢 SESHAA IS LIVE IN ALL 54 AFRICAN COUNTRIES!\n\n🌍 Find ANY business, person or government office\n📞 Verified phones & addresses\n🏆 Ratings like Uber & TripAdvisor\n📅 Book chauffeurs, salons, caterers & more\n💳 Pay with M-Pesa, MTN MoMo, Celo or card\n🌐 14 African languages\n\nSeshaa and you will find.\n👉 seshaa.africa`,
    };
    setPressMsg(templates[pressType] || '');
  };

  // Not logged in or not admin
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center text-white">
          <Shield size={48} className="mx-auto mb-4 text-red-400" strokeWidth={1.5} />
          <h2 className="text-2xl font-black mb-2">Admin Access Required</h2>
          <p className="text-gray-400 mb-6">Sign in with your admin account to access this dashboard.</p>
          <a href="/auth" className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl inline-block">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const totalBadge = (pendingListings.length + pendingPayouts.length + loanApps.length);

  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview', label: 'Overview',   icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
    { key: 'finance',  label: 'Finance',    icon: <DollarSign size={20} strokeWidth={1.5} /> },
    { key: 'listings', label: 'Listings',   icon: <List size={20} strokeWidth={1.5} />, badge: stats.pendingListings },
    { key: 'payouts',  label: 'Payouts',    icon: <TrendingUp size={20} strokeWidth={1.5} />, badge: pendingPayouts.length },
    { key: 'loans',    label: 'Loans',      icon: <Award size={20} strokeWidth={1.5} />, badge: loanApps.length },
    { key: 'salesreps',label: 'Sales Reps', icon: <Briefcase size={20} strokeWidth={1.5} /> },
    { key: 'adcms',    label: 'Ad CMS',     icon: <Tv size={20} strokeWidth={1.5} /> },
    { key: 'scraper',  label: 'Scraper',    icon: <Database size={20} strokeWidth={1.5} /> },
    { key: 'branding', label: 'Branding',   icon: <Paintbrush size={20} strokeWidth={1.5} /> },
    { key: 'promote',  label: 'Press',      icon: <Send size={20} strokeWidth={1.5} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Admin top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
          <Shield size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-black text-white text-sm">Seshaa Admin</span>
          <span className="text-gray-500 text-xs ml-2">Signed in as {user.name}</span>
        </div>
        {totalBadge > 0 && (
          <div className="flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">
            <AlertTriangle size={12} /> {totalBadge} pending
          </div>
        )}
        <a href="/" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
          <Globe size={12} /> Live site
        </a>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors relative ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}>
              {t.icon} {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Total Listings', value: stats.listings.toLocaleString(), sub: `${stats.pendingListings} need review`, icon: <List size={20} strokeWidth={1.5} />, color: 'text-green-400', bg: 'bg-green-500/10' },
                { label: 'Users',          value: stats.users.toLocaleString(),    icon: <Users size={20} strokeWidth={1.5} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Active Ads',     value: stats.ads.toLocaleString(),      icon: <Megaphone size={20} strokeWidth={1.5} />, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { label: 'Sales Reps',     value: stats.salesReps.toLocaleString(), icon: <Activity size={20} strokeWidth={1.5} />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'MRR',            value: financials ? `$${financials.revenue.monthlyRecurringRevenue.toFixed(0)}` : '…', sub: 'Monthly recurring', icon: <DollarSign size={20} strokeWidth={1.5} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Loan Fund',      value: financials ? `$${financials.loanFund.available.toFixed(0)}` : '…', sub: 'Available to disburse', icon: <Award size={20} strokeWidth={1.5} />, color: 'text-rose-400', bg: 'bg-rose-500/10' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  {s.sub && <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>}
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick action cards */}
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: `${stats.pendingListings} listings to verify`, icon: <CheckCircle size={18} strokeWidth={1.5} />, action: () => setTab('listings'), color: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300' },
                { label: `${pendingPayouts.length} ambassador payouts`, icon: <TrendingUp size={18} strokeWidth={1.5} />, action: () => setTab('payouts'), color: 'border-blue-500/30 bg-blue-500/5 text-blue-300' },
                { label: `${loanApps.length} loan applications`, icon: <Award size={18} strokeWidth={1.5} />, action: () => setTab('loans'), color: 'border-rose-500/30 bg-rose-500/5 text-rose-300' },
              ].map(c => (
                <button key={c.label} onClick={c.action}
                  className={`flex items-center justify-between p-4 rounded-2xl border text-left ${c.color} hover:opacity-80 transition-opacity`}>
                  <span className="font-semibold text-sm">{c.label}</span>
                  <div className="flex items-center gap-1 text-xs opacity-70">{c.icon} <ChevronRight size={14} /></div>
                </button>
              ))}
            </div>

            {/* Notifications / system health */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={16} className="text-gray-400" strokeWidth={1.5} />
                <span className="font-bold text-sm text-gray-300">System Status</span>
                <span className="ml-auto text-xs text-green-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> All systems operational
                </span>
              </div>
              <div className="space-y-2 text-xs text-gray-500">
                <p>API: <span className="text-green-400 font-semibold">seshaa-api.vercel.app</span></p>
                <p>Frontend: <span className="text-green-400 font-semibold">seshaa-africa.vercel.app + seshaa-admin.vercel.app</span></p>
                <p>Database: <span className="text-blue-400 font-semibold">Neon PostgreSQL</span></p>
              </div>
            </div>
          </div>
        )}

        {/* ── FINANCE ── */}
        {tab === 'finance' && financials && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <h3 className="font-bold text-green-400 mb-4 flex items-center gap-2"><DollarSign size={16} /> Revenue</h3>
                {[
                  ['Active Pro Subs',      `${financials.revenue.activeSubscriptions}`],
                  ['Total Pro Revenue',    `$${financials.revenue.totalProSubscriptions.toFixed(2)}`],
                  ['MRR (estimated)',      `$${financials.revenue.monthlyRecurringRevenue.toFixed(2)}`],
                  ['Ad Revenue',          `$${financials.revenue.adRevenue.toFixed(2)}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm py-2 border-b border-gray-800 last:border-0">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-bold text-white">{v}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <h3 className="font-bold text-red-400 mb-4 flex items-center gap-2"><TrendingUp size={16} /> Costs & Net</h3>
                {[
                  ['Commissions Paid',    `$${financials.costs.salesCommissionsPaid.toFixed(2)}`],
                  ['Commissions Pending', `$${financials.costs.salesCommissionsPending.toFixed(2)}`],
                  ['Ambassador Payouts',  `$${financials.costs.ambassadorPayoutsPaid.toFixed(2)}`],
                  ['Net (estimated)',     `$${financials.net.estimated.toFixed(2)}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm py-2 border-b border-gray-800 last:border-0">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-bold text-white">{v}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-600 mt-2">{financials.costs.estimatedInfraNote}</p>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-rose-400 mb-4">🏦 Women's Loan Fund</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Allocated (5% of revenue)', value: `$${financials.loanFund.totalAllocated.toFixed(2)}` },
                  { label: 'Disbursed',                 value: `$${financials.loanFund.totalDisbursed.toFixed(2)}` },
                  { label: 'Repaid',                    value: `$${financials.loanFund.totalRepaid.toFixed(2)}` },
                  { label: 'Available',                 value: `$${financials.loanFund.available.toFixed(2)}` },
                ].map(s => (
                  <div key={s.label} className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-rose-300">{s.value}</p>
                    <p className="text-xs text-rose-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LISTINGS ── */}
        {tab === 'listings' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="font-bold text-white mb-4">Pending Verification ({pendingListings.length})</h3>
            {pendingListings.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <CheckCircle size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">All caught up — no pending listings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingListings.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-xl bg-gray-950">
                    <div>
                      <p className="font-semibold text-sm text-white">{l.name}</p>
                      <p className="text-xs text-gray-500">{l.city}, {l.country} · {l.category}</p>
                      {l.phone && <p className="text-xs text-gray-500">{l.phone}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => verifyListing(l.id)}
                        className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                        <CheckCircle size={16} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => rejectListing(l.id)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                        <X size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PAYOUTS ── */}
        {tab === 'payouts' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="font-bold text-white mb-4">Pending Ambassador Payouts ({pendingPayouts.length})</h3>
            {pendingPayouts.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-10">No pending payouts</p>
            ) : (
              <div className="space-y-3">
                {pendingPayouts.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-xl bg-gray-950">
                    <div>
                      <p className="font-semibold text-sm text-white">{p.ambassador.user.name}</p>
                      <p className="text-xs text-gray-500">{p.ambassador.user.country} · {p.method} · {p.ambassador.user.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-green-400">${p.amount.toFixed(2)}</span>
                      <button onClick={() => approvePayout(p.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LOANS ── */}
        {tab === 'loans' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="font-bold text-white mb-4">🏦 Loan Applications ({loanApps.length} pending)</h3>
            {loanApps.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-10">No pending applications</p>
            ) : (
              <div className="space-y-3">
                {loanApps.map(app => (
                  <div key={app.id} className="border border-gray-800 rounded-xl p-4 bg-gray-950">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-white">{app.user.name}</p>
                        <p className="text-xs text-gray-500">{app.user.country} · {app.user.phone}</p>
                        <p className="text-sm text-gray-300 mt-2"><strong>Purpose:</strong> {app.purpose}</p>
                        <p className="text-sm text-gray-300">Requested: <strong className="text-white">${app.amount}</strong></p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateLoan(app.id, 'APPROVED', app.amount)}
                          className="px-3 py-1.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                          Approve
                        </button>
                        <button onClick={() => updateLoan(app.id, 'REJECTED')}
                          className="px-3 py-1.5 text-xs font-semibold bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SALES REPS ── */}
        {tab === 'salesreps' && (() => {
          if (!repsLoaded) { loadSalesReps(); }
          const pending  = salesReps.filter(r => !r.active);
          const active   = salesReps.filter(r => r.active);
          return (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pending', value: pending.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                  { label: 'Active',  value: active.length,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
                  { label: 'Total Earned', value: `$${active.reduce((s,r) => s + r.totalEarned, 0).toFixed(0)}`, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} border border-gray-800 rounded-2xl p-4 text-center`}>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Pending applications */}
              {pending.length > 0 && (
                <div className="bg-gray-900 rounded-2xl border border-yellow-500/20 p-5">
                  <h3 className="font-bold text-yellow-400 mb-4 flex items-center gap-2">
                    <Briefcase size={16} strokeWidth={1.5} /> Pending Applications ({pending.length})
                  </h3>
                  <div className="space-y-3">
                    {pending.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-xl bg-gray-950">
                        <div>
                          <p className="font-semibold text-sm text-white">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.territory}</p>
                          {r.phone && <p className="text-xs text-gray-500">{r.phone}</p>}
                          <p className="text-xs text-gray-600">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => approveRep(r.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 flex items-center gap-1">
                            <CheckCircle size={13} /> Approve
                          </button>
                          <button onClick={() => rejectRep(r.id)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active reps */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Users size={16} strokeWidth={1.5} /> Active Reps ({active.length})
                </h3>
                {active.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-8">No active reps yet</p>
                ) : (
                  <div className="space-y-2">
                    {active.map((r, i) => (
                      <div key={r.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-xl bg-gray-950">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-black">
                            #{i + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-white">{r.name}</p>
                            <p className="text-xs text-gray-500">{r.territory} · {r.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-green-400">${r.totalEarned.toFixed(0)}</p>
                          <p className="text-xs text-gray-500">{r.adsCount} ads · {(r.commissionRate * 100).toFixed(0)}%</p>
                          {r.unpaidCommissions > 0 && (
                            <p className="text-xs text-yellow-400">${r.unpaidCommissions.toFixed(0)} pending</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── AD CMS ── */}
        {tab === 'adcms' && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Tv size={16} className="text-orange-400" strokeWidth={1.5} /> Hero Ad Slot — CMS
              </h3>
              <p className="text-xs text-gray-500 mb-5">Configure what plays in the homepage hero. YouTube, image, or GIF. Changes go live instantly.</p>

              <div className="space-y-4">
                {/* Media type */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Media Type</label>
                  <div className="flex gap-2">
                    {(['youtube', 'image', 'video', 'default'] as const).map(type => (
                      <button key={type} onClick={() => setHero(h => ({ ...h, mediaType: type }))}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          hero.mediaType === type ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}>
                        {type === 'youtube' ? '▶ YouTube' : type === 'image' ? '🖼 Image/GIF' : type === 'video' ? '🎬 Video' : '🎨 Default'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL */}
                {hero.mediaType !== 'default' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">
                      {hero.mediaType === 'youtube' ? 'YouTube Embed URL' : hero.mediaType === 'image' ? 'Image / GIF URL' : 'Video URL (mp4)'}
                    </label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                      placeholder={
                        hero.mediaType === 'youtube'
                          ? 'https://www.youtube.com/embed/VIDEO_ID'
                          : hero.mediaType === 'image'
                          ? 'https://yourdomain.com/hero-banner.gif'
                          : 'https://yourdomain.com/hero-video.mp4'
                      }
                      value={hero.mediaUrl}
                      onChange={e => setHero(h => ({ ...h, mediaUrl: e.target.value }))}
                    />
                    {hero.mediaType === 'youtube' && (
                      <p className="text-xs text-gray-600 mt-1.5">
                        Get the embed URL from YouTube: Share → Embed → copy the src="…" value
                      </p>
                    )}
                  </div>
                )}

                {/* Overlay text */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Overlay Title</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                      value={hero.overlayTitle}
                      onChange={e => setHero(h => ({ ...h, overlayTitle: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Overlay Subtitle</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                      value={hero.overlaySubtitle}
                      onChange={e => setHero(h => ({ ...h, overlaySubtitle: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">CTA Button Text</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                      value={hero.ctaText}
                      onChange={e => setHero(h => ({ ...h, ctaText: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">CTA Link</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                      value={hero.ctaUrl}
                      onChange={e => setHero(h => ({ ...h, ctaUrl: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Advertiser Name</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                      placeholder="e.g. Stanbic Bank Uganda"
                      value={hero.advertiser}
                      onChange={e => setHero(h => ({ ...h, advertiser: e.target.value }))}
                    />
                  </div>
                </div>

                <button
                  onClick={saveHero}
                  disabled={heroSaving}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                    heroSaved ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-50'
                  }`}
                >
                  {heroSaving ? 'Saving…' : heroSaved ? '✓ Hero saved — live now!' : 'Save & Go Live'}
                </button>
              </div>
            </div>

            {/* All active ads */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Megaphone size={16} className="text-orange-400" strokeWidth={1.5} /> Active Campaigns
              </h3>
              <ActiveAdsList />
            </div>
          </div>
        )}

        {/* ── SCRAPER ── */}
        {tab === 'scraper' && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Database size={16} className="text-blue-400" strokeWidth={1.5} /> OpenStreetMap Data Importer
                </h3>
                <span className="text-xs text-green-400 font-semibold">{scrapeTotal.toLocaleString()} listings total</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Sources: <span className="text-blue-400">OpenStreetMap Overpass API</span> (free, open, legal) ·
                Click a city to pull the latest businesses, addresses &amp; contacts into Seshaa's database.
                One city at a time — ~30s each.
              </p>

              {/* Bulk action buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={triggerScrapeAll}
                  disabled={scrapingAll || scrapingCity !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {scrapingAll ? <><RefreshCw size={14} className="animate-spin" /> Starting…</> : <><Database size={14} /> Scrape All Africa (background)</>}
                </button>
                <button
                  onClick={triggerEnrich}
                  disabled={enriching}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {enriching ? <><RefreshCw size={14} className="animate-spin" /> Enriching…</> : '💰 Enrich Prices from Websites'}
                </button>
                <button
                  onClick={() => adminApi.scrapeCounts().then(r => { setScrapeCounts(r.data.counts || []); setScrapeTotal(r.data.total || 0); }).catch(() => {})}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition-colors"
                >
                  <RefreshCw size={14} /> Refresh Counts
                </button>
              </div>

              {scrapeMsg && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${scrapeMsg.startsWith('✓') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  {scrapeMsg}
                </div>
              )}

              {/* Cities grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {[
                  { city: 'Lagos', country: 'Nigeria' },
                  { city: 'Nairobi', country: 'Kenya' },
                  { city: 'Johannesburg', country: 'South Africa' },
                  { city: 'Cairo', country: 'Egypt' },
                  { city: 'Accra', country: 'Ghana' },
                  { city: 'Abuja', country: 'Nigeria' },
                  { city: 'Kampala', country: 'Uganda' },
                  { city: 'Dar es Salaam', country: 'Tanzania' },
                  { city: 'Addis Ababa', country: 'Ethiopia' },
                  { city: 'Kigali', country: 'Rwanda' },
                  { city: 'Dakar', country: 'Senegal' },
                  { city: 'Abidjan', country: "Côte d'Ivoire" },
                  { city: 'Douala', country: 'Cameroon' },
                  { city: 'Kinshasa', country: 'DR Congo' },
                  { city: 'Cape Town', country: 'South Africa' },
                  { city: 'Casablanca', country: 'Morocco' },
                  { city: 'Tunis', country: 'Tunisia' },
                  { city: 'Luanda', country: 'Angola' },
                  { city: 'Lusaka', country: 'Zambia' },
                  { city: 'Harare', country: 'Zimbabwe' },
                  { city: 'Maputo', country: 'Mozambique' },
                  { city: 'Bamako', country: 'Mali' },
                  { city: 'Ouagadougou', country: 'Burkina Faso' },
                  { city: 'Conakry', country: 'Guinea' },
                  { city: 'Mombasa', country: 'Kenya' },
                  { city: 'Durban', country: 'South Africa' },
                  { city: 'Pretoria', country: 'South Africa' },
                  { city: 'Yaoundé', country: 'Cameroon' },
                  { city: 'Antananarivo', country: 'Madagascar' },
                  { city: 'Libreville', country: 'Gabon' },
                ].map(({ city, country }) => {
                  const key = `${city}|${country}`;
                  const count = scrapeCounts.find(c => c.city === city)?.count || 0;
                  const isScraping = scrapingCity === key;
                  return (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{city}</p>
                        <p className="text-xs text-gray-500">{country}</p>
                        {count > 0 && <p className="text-xs text-green-400 font-semibold">{count.toLocaleString()} imported</p>}
                      </div>
                      <button
                        onClick={() => triggerScrape(city, country)}
                        disabled={isScraping || scrapingCity !== null}
                        className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                          isScraping ? 'bg-blue-500/20 text-blue-300' :
                          count > 0 ? 'bg-gray-800 text-gray-400 hover:bg-green-500/20 hover:text-green-300' :
                          'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        } disabled:opacity-50`}
                      >
                        {isScraping
                          ? <><RefreshCw size={12} className="animate-spin" /> Scraping…</>
                          : count > 0 ? <><RefreshCw size={12} /> Refresh</> : '+ Import'
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-600 mt-4">
                Data © OpenStreetMap contributors · Licensed under ODbL · Free to use commercially
              </p>
            </div>
          </div>
        )}

        {/* ── BRANDING ── */}
        {tab === 'branding' && (
          <div className="space-y-5">

            {/* ── Live logo preview ── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Paintbrush size={16} className="text-pink-400" strokeWidth={1.5} /> CSS Settings
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Adjust logo size, outline weight, and inject custom CSS. Changes apply instantly and persist across reloads.
              </p>

              {/* Live preview */}
              <div className="flex items-center justify-center bg-gray-950 rounded-xl border border-gray-800 py-4 mb-6"
                style={{ backgroundColor: 'var(--cp, #008751)' }}>
                <div className="flex items-center gap-0 select-none leading-none">
                  <span style={{
                    fontSize: `var(--logo-main-size, ${logoMainSize}rem)`,
                    fontWeight: 900, fontStyle: 'italic',
                    fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
                    color: '#008751',
                    WebkitTextStroke: `var(--logo-stroke, ${logoStroke}px) white`,
                    letterSpacing: '-0.02em', lineHeight: 1,
                  }}>seshaa</span>
                  <span style={{
                    fontSize: `var(--logo-dot-size, ${logoDotSize}rem)`,
                    fontWeight: 700, fontStyle: 'italic',
                    fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
                    color: 'white', letterSpacing: '-0.01em', lineHeight: 1,
                  }}>.africa</span>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-5">

                {/* Logo main size */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Logo size — "seshaa"
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">{logoMainSize.toFixed(2)}rem</span>
                  </div>
                  <input type="range" min={1.0} max={3.5} step={0.05}
                    value={logoMainSize}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      setLogoMainSize(v);
                      applyCssVar('--logo-main-size', v + 'rem', 'seshaa-logo-main', v);
                    }}
                    className="w-full accent-pink-400 h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>1rem</span><span>3.5rem</span>
                  </div>
                </div>

                {/* Logo dot/suffix size */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Logo size — ".africa"
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">{logoDotSize.toFixed(2)}rem</span>
                  </div>
                  <input type="range" min={0.8} max={3.0} step={0.05}
                    value={logoDotSize}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      setLogoDotSize(v);
                      applyCssVar('--logo-dot-size', v + 'rem', 'seshaa-logo-dot', v);
                    }}
                    className="w-full accent-pink-400 h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>0.8rem</span><span>3rem</span>
                  </div>
                </div>

                {/* Outline stroke */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Outline (stroke) thickness
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">{logoStroke.toFixed(1)}px</span>
                  </div>
                  <input type="range" min={0} max={5} step={0.5}
                    value={logoStroke}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      setLogoStroke(v);
                      applyCssVar('--logo-stroke', v + 'px', 'seshaa-logo-stroke', v);
                    }}
                    className="w-full accent-pink-400 h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>0 (none)</span><span>5px</span>
                  </div>
                </div>

                {/* Reset */}
                <button
                  onClick={() => {
                    setLogoMainSize(1.95); setLogoDotSize(1.65); setLogoStroke(1.5);
                    applyCssVar('--logo-main-size', '1.95rem', 'seshaa-logo-main', 1.95);
                    applyCssVar('--logo-dot-size',  '1.65rem', 'seshaa-logo-dot',  1.65);
                    applyCssVar('--logo-stroke',    '1.5px',   'seshaa-logo-stroke', 1.5);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Reset logo to defaults
                </button>
              </div>
            </div>

            {/* ── Custom CSS injection ── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Globe size={16} className="text-blue-400" strokeWidth={1.5} /> Custom CSS
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Injected into the app via a &lt;style&gt; tag. Applies to every page instantly.
                Use CSS variables like <code className="text-blue-400">--cp</code> for the primary colour.
              </p>
              <textarea
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-xs font-mono text-green-300 focus:outline-none focus:border-gray-500 resize-y"
                rows={8}
                placeholder={`/* Example */\n.navbar-title { opacity: 0.9; }\nbody { letter-spacing: 0.01em; }`}
                value={customCss}
                onChange={e => setCustomCss(e.target.value)}
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => { applyCustomCss(customCss); setCssSaved(true); setTimeout(() => setCssSaved(false), 2000); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  {cssSaved ? '✓ Applied' : 'Apply & Save'}
                </button>
                <button
                  onClick={() => { setCustomCss(''); applyCustomCss(''); }}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* ── Logo rotation ── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <RefreshCw size={16} className="text-yellow-400" strokeWidth={1.5} /> Logo Rotation
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Toggle which logo variants cycle in the navbar. At least one must stay enabled.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {ALL_LOGOS.map(logo => {
                  const isOn = enabledLogos.includes(logo.id);
                  return (
                    <button
                      key={logo.id}
                      onClick={() => toggleLogo(logo.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-colors ${
                        isOn ? 'border-green-500/40 bg-green-500/5' : 'border-gray-700 bg-gray-950 opacity-50'
                      }`}
                    >
                      <div className="w-28 h-10 flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden shrink-0 border border-gray-800">
                        <div style={{ width: 108, height: 36, overflow: 'hidden' }}>{logo.node}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{logo.label}</p>
                        <p className={`text-xs mt-0.5 font-semibold ${isOn ? 'text-green-400' : 'text-gray-600'}`}>
                          {isOn ? '● Active' : '○ Off'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ── PRESS / PROMOTE ── */}
        {tab === 'promote' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Megaphone size={16} style={{ color: 'var(--cp)' }} strokeWidth={1.5} /> Press & Social Media
            </h3>
            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Template</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'award_winner',    label: '🏆 Awards PR' },
                  { id: 'new_feature',     label: '🚀 Feature Launch' },
                  { id: 'micro_loan',      label: '🏦 Women\'s Loans' },
                  { id: 'platform_launch', label: '📣 Platform Announcement' },
                ].map(t => (
                  <button key={t.id}
                    className={`text-sm py-2.5 px-3 rounded-xl border text-left transition-colors ${
                      pressType === t.id ? 'border-orange-500 bg-orange-500/10 text-orange-300' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                    onClick={() => setPressType(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm mb-4 bg-orange-500 hover:bg-orange-400"
              onClick={generatePressRelease}>
              Generate Content
            </button>
            {pressMsg && (
              <div className="relative">
                <textarea
                  className="w-full border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono bg-gray-950 text-gray-300 focus:outline-none resize-none"
                  rows={14}
                  value={pressMsg}
                  onChange={e => setPressMsg(e.target.value)}
                />
                <button
                  className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1.5 rounded-lg text-white ${pressCopied ? 'bg-green-500' : 'bg-orange-500'}`}
                  onClick={() => { navigator.clipboard.writeText(pressMsg); setPressCopied(true); setTimeout(() => setPressCopied(false), 2000); }}>
                  {pressCopied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component: active ads list
function ActiveAdsList() {
  const [ads, setAds] = useState<{ id: string; title: string; advertiser: string; tier: string; impressions: number; clicks: number; active: boolean }[]>([]);
  useEffect(() => {
    adsApi.myAds().then(r => setAds(r.data as typeof ads)).catch(() => {});
  }, []);
  if (ads.length === 0) return <p className="text-sm text-gray-600 text-center py-8">No active campaigns yet</p>;
  return (
    <div className="space-y-2">
      {ads.map(ad => (
        <div key={ad.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-xl bg-gray-950 text-sm">
          <div>
            <p className="font-semibold text-white">{ad.title}</p>
            <p className="text-xs text-gray-500">{ad.advertiser} · <span className="text-orange-400">{ad.tier}</span></p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{ad.impressions.toLocaleString()} impr.</p>
            <p>{ad.clicks} clicks</p>
          </div>
        </div>
      ))}
    </div>
  );
}
