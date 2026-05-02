import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, List, Megaphone, TrendingUp, Shield, DollarSign, Award,
  Send, CheckCircle, X, Users, Activity, Globe, Bell, ChevronRight,
  AlertTriangle, Tv, Database, Paintbrush, RefreshCw, Briefcase, BarChart2,
  Zap, ArrowUpRight, Plus, Edit2, Trash2, Eye, EyeOff, Play,
  CreditCard, Phone, Mail, Info,
} from 'lucide-react';
import { adminApi, adsApi } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { ALL_LOGOS, saveEnabled, type LogoId } from '../../components/brand/LogoRotator';
import { COUNTRIES } from '../../components/layout/CountryPicker';
import { ENGLISH_SLUGS } from '../../components/brand/SeshaaTitle';
import { getThemeForCode } from '../../store/theme';
import type { PortalType } from '../../types';

const PORTAL_LABELS: Record<PortalType, string> = {
  consumer: 'Consumer',
  business: 'Business',
  advertiser: 'Advertiser',
  salesrep: 'Sales Rep',
  ambassador: 'Ambassador',
  admin: 'Admin',
};

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

// ── Chart helpers ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color = 'bg-green-500', suffix }: {
  label: string; value: number; max: number; color?: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-xs text-gray-400 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums w-14 text-right shrink-0">
        {suffix ?? value.toLocaleString()}
      </span>
    </div>
  );
}

function FundBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold text-white">
          ${value.toFixed(0)} <span className="text-gray-600 font-normal">/ ${total.toFixed(0)}</span>
          <span className="text-gray-600 ml-1.5">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatSparkle({ value, label, color, icon }: { value: string | number; label: string; color: string; icon: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-gray-950 border border-gray-800`}>
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-black text-white leading-tight">{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminPortal() {
  const navigate = useNavigate();
  const { user, portal, setPortal } = useAuthStore();
  const [portalOpen, setPortalOpen] = useState(false);
  const [stats, setStats]                 = useState<Stats>({ listings: 0, users: 0, ads: 0, salesReps: 0, pendingListings: 0 });
  const [financials, setFinancials]       = useState<Financials | null>(null);
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [pendingPayouts, setPendingPayouts]   = useState<PendingPayout[]>([]);
  const [loanApps, setLoanApps]           = useState<LoanApp[]>([]);
  const [tab, setTab]                     = useState<Tab>('overview');
  const [pressMsg, setPressMsg]           = useState('');
  const [pressType, setPressType]         = useState('award_winner');
  const [pressCopied, setPressCopied]     = useState(false);

  // Hero CMS state (legacy single slot — kept for reference, no longer rendered)
  const [hero, setHero]                   = useState<HeroConfig>(DEFAULT_HERO);
  void hero; void setHero; // suppress unused warnings — kept for future use

  // Hero slideshow state
  interface HeroSlide {
    id: string; advertiser: string; targetUrl: string; imageUrl?: string | null;
    mediaType?: string; mediaUrl?: string; youtubeId?: string;
    overlayTitle?: string; overlaySubtitle?: string; ctaText?: string;
    clientEmail?: string; clientPhone?: string; clientCountry?: string;
    paymentStatus?: string; paymentAmount?: number; invoiceRef?: string;
    notes?: string; active: boolean; impressions: number; clicks: number;
    startDate?: string; endDate?: string; budget?: number;
  }
  type SlideForm = Omit<HeroSlide, 'id' | 'impressions' | 'clicks'>;
  const BLANK_SLIDE: SlideForm = {
    advertiser: '', targetUrl: '/advertise', mediaType: 'youtube', mediaUrl: '', youtubeId: '',
    overlayTitle: '', overlaySubtitle: '', ctaText: 'Learn More',
    clientEmail: '', clientPhone: '', clientCountry: '',
    paymentStatus: 'unpaid', paymentAmount: 0, invoiceRef: '', notes: '',
    active: true,
  };
  const [heroSlides, setHeroSlides]       = useState<HeroSlide[]>([]);
  const [slidesLoaded, setSlidesLoaded]   = useState(false);
  const [editingSlide, setEditingSlide]   = useState<HeroSlide | null>(null);
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [slideForm, setSlideForm]         = useState<SlideForm>(BLANK_SLIDE);
  const [slideSaving, setSlideSaving]     = useState(false);
  const [slideMsg, setSlideMsg]           = useState('');

  // User analytics state
  interface UserAnalytics {
    live: { onlineNow: number; activeHour: number; activeDay: number };
    totals: { totalUsers: number; newLast30: number; newLast90: number };
    byRole: { role: string; count: number }[];
    byCountry: { country: string; count: number }[];
    dailySignups: { day: string; count: number }[];
    peakHours: { hour: number; count: number }[];
  }
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);

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

  const readCss = (key: string, def: number) => {
    const v = parseFloat(localStorage.getItem(key) ?? '');
    return isNaN(v) ? def : v;
  };
  const [logoMainMobile, setLogoMainMobile] = useState(() => readCss('seshaa-logo-main-mobile', 1.35));
  const [logoMainTablet, setLogoMainTablet] = useState(() => readCss('seshaa-logo-main-tablet', 1.55));
  const [logoMainDesktop, setLogoMainDesktop] = useState(() => readCss('seshaa-logo-main-desktop', readCss('seshaa-logo-main', 1.95)));
  const [logoStroke,    setLogoStroke]    = useState(() => readCss('seshaa-logo-stroke', 1.5));
  const [themeOverrides, setThemeOverrides] = useState<Record<string, { primary: string; secondary: string; accent: string; text: string }>>({});
  const [themeCountryCode, setThemeCountryCode] = useState('DEFAULT');
  const [themePrimary, setThemePrimary] = useState('#008751');
  const [themeSecondary, setThemeSecondary] = useState('#FFFFFF');
  const [themeAccent, setThemeAccent] = useState('#FCD116');
  const [themeText, setThemeText] = useState('#FFFFFF');
  const [themeMsg, setThemeMsg] = useState('');
  const [cssFontMsg,    setCssFontMsg]    = useState('');
  const [customCss,     setCustomCss]     = useState(() => localStorage.getItem('seshaa-custom-css') ?? '');
  const [cssSaved,      setCssSaved]      = useState(false);
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('openai/gpt-4o-mini');
  const [aiSettingsMsg, setAiSettingsMsg] = useState('');
  const [seoTitle, setSeoTitle] = useState('Seshaa Africa — Directory for All 54 Countries');
  const [seoDescription, setSeoDescription] = useState('Find businesses, services, and people across all 54 African countries on Seshaa.');
  const [seoThumbnailUrl, setSeoThumbnailUrl] = useState('https://www.seshaa.africa/og-image.svg');
  const [seoUrl, setSeoUrl] = useState('https://www.seshaa.africa');
  const [seoSaved, setSeoSaved] = useState('');
  const [printifyApiKey, setPrintifyApiKey] = useState('');
  const [printfulApiKey, setPrintfulApiKey] = useState('');
  const [podMsg, setPodMsg] = useState('');
  const [podHasPrintify, setPodHasPrintify] = useState(false);
  const [podHasPrintful, setPodHasPrintful] = useState(false);
  const [podServices, setPodServices] = useState<Array<{ name: string; website: string; region: string; eco?: string; description?: string }>>([]);

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
    adminApi.userAnalytics().then(r => setUserAnalytics(r.data)).catch(() => {});
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
    adminApi.getHeroSlides().then(r => {
      setHeroSlides(r.data || []);
      setSlidesLoaded(true);
    }).catch(() => { setSlidesLoaded(true); });
    adminApi.getAiSettings().then(r => {
      if (r.data?.openRouterModel) setOpenRouterModel(r.data.openRouterModel);
    }).catch(() => {});
    adminApi.getSeoSettings().then(r => {
      if (r.data?.title) setSeoTitle(r.data.title);
      if (r.data?.description) setSeoDescription(r.data.description);
      if (r.data?.thumbnailUrl) setSeoThumbnailUrl(r.data.thumbnailUrl);
      if (r.data?.url) setSeoUrl(r.data.url);
    }).catch(() => {});
    adminApi.getThemeSettings().then(r => {
      const overrides = (r.data?.overrides || {}) as Record<string, { primary?: string; secondary?: string; accent?: string; text?: string }>;
      const normalized: Record<string, { primary: string; secondary: string; accent: string; text: string }> = {};
      Object.entries(overrides).forEach(([code, v]) => {
        const base = getThemeForCode(code);
        normalized[code] = {
          primary: v.primary || base.primary,
          secondary: v.secondary || base.secondary,
          accent: v.accent || base.accent,
          text: v.text || '#FFFFFF',
        };
      });
      setThemeOverrides(normalized);
    }).catch(() => {});
    adminApi.getPodSettings().then(r => {
      setPodHasPrintify(Boolean(r.data?.hasPrintifyApiKey));
      setPodHasPrintful(Boolean(r.data?.hasPrintfulApiKey));
      setPodServices(r.data?.services || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const base = getThemeForCode(themeCountryCode);
    const v = themeOverrides[themeCountryCode];
    setThemePrimary(v?.primary || base.primary);
    setThemeSecondary(v?.secondary || base.secondary);
    setThemeAccent(v?.accent || base.accent);
    setThemeText(v?.text || '#FFFFFF');
  }, [themeCountryCode, themeOverrides]);

  const availablePortals: PortalType[] = ['consumer', 'business', 'advertiser', 'salesrep', 'ambassador', 'admin'];

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

  // ── Hero slides CRUD ──


  const saveSlide = async () => {
    setSlideSaving(true);
    setSlideMsg('');
    try {
      if (editingSlide) {
        const r = await adminApi.updateHeroSlide(editingSlide.id, slideForm);
        setHeroSlides(prev => prev.map(s => s.id === editingSlide.id ? { ...s, ...r.data } : s));
        setSlideMsg('✓ Slide updated');
      } else {
        const r = await adminApi.createHeroSlide(slideForm);
        setHeroSlides(prev => [...prev, r.data]);
        setSlideMsg('✓ Slide added — live immediately');
      }
      setShowSlideForm(false);
      setEditingSlide(null);
      setSlideForm(BLANK_SLIDE);
    } catch { setSlideMsg('✗ Save failed — check fields'); }
    finally { setSlideSaving(false); }
  };

  const deleteSlide = async (id: string) => {
    if (!confirm('Delete this slide? This cannot be undone.')) return;
    await adminApi.deleteHeroSlide(id).catch(() => {});
    setHeroSlides(prev => prev.filter(s => s.id !== id));
  };

  const toggleSlide = async (id: string) => {
    await adminApi.toggleHeroSlide(id).catch(() => {});
    setHeroSlides(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const startEditSlide = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setSlideForm({
      advertiser: slide.advertiser,
      targetUrl: slide.targetUrl,
      mediaType: slide.mediaType ?? 'youtube',
      mediaUrl: slide.mediaUrl ?? '',
      youtubeId: slide.youtubeId ?? '',
      overlayTitle: slide.overlayTitle ?? '',
      overlaySubtitle: slide.overlaySubtitle ?? '',
      ctaText: slide.ctaText ?? '',
      clientEmail: slide.clientEmail ?? '',
      clientPhone: slide.clientPhone ?? '',
      clientCountry: slide.clientCountry ?? '',
      paymentStatus: slide.paymentStatus ?? 'unpaid',
      paymentAmount: slide.paymentAmount ?? 0,
      invoiceRef: slide.invoiceRef ?? '',
      notes: slide.notes ?? '',
      active: slide.active,
    });
    setShowSlideForm(true);
  };

  const triggerScrape = async (city: string, country: string) => {
    const key = `${city}|${country}`;
    setScrapingCity(key);
    setScrapeMsg('');
    try {
      const r = await adminApi.scrapeCity(city, country);
      setScrapeMsg(`✓ ${city}: ${r.data.inserted} listings imported`);
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
      const safe = next.length === 0 ? [id] : next;
      saveEnabled(safe);
      window.dispatchEvent(new Event('storage'));
      return safe;
    });
  };

  const saveAiSettings = async () => {
    try {
      await adminApi.saveAiSettings({
        openRouterApiKey: openRouterApiKey.trim() || undefined,
        openRouterModel: openRouterModel.trim() || 'openai/gpt-4o-mini',
      });
      setOpenRouterApiKey('');
      setAiSettingsMsg('Saved. AI will now use OpenRouter when key is configured.');
      setTimeout(() => setAiSettingsMsg(''), 2600);
    } catch {
      setAiSettingsMsg('Failed to save AI settings.');
    }
  };

  const saveSeoSettings = async () => {
    try {
      await adminApi.saveSeoSettings({
        title: seoTitle,
        description: seoDescription,
        thumbnailUrl: seoThumbnailUrl,
        url: seoUrl,
      });
      setSeoSaved('Saved social share SEO settings.');
      setTimeout(() => setSeoSaved(''), 2500);
    } catch {
      setSeoSaved('Failed to save SEO settings.');
    }
  };

  const saveThemeSettings = async () => {
    try {
      const next = {
        ...themeOverrides,
        [themeCountryCode]: {
          primary: themePrimary,
          secondary: themeSecondary,
          accent: themeAccent,
          text: themeText,
        },
      };
      setThemeOverrides(next);
      await adminApi.saveThemeSettings({ overrides: next });
      setThemeMsg(`Saved ${themeCountryCode === 'DEFAULT' ? 'seshaa.africa default' : themeCountryCode} color overrides.`);
      setTimeout(() => setThemeMsg(''), 2500);
    } catch {
      setThemeMsg('Failed to save country colors.');
    }
  };

  const savePodSettings = async () => {
    try {
      const r = await adminApi.savePodSettings({
        printifyApiKey: printifyApiKey.trim() || undefined,
        printfulApiKey: printfulApiKey.trim() || undefined,
      });
      setPodHasPrintify(Boolean(r.data?.hasPrintifyApiKey));
      setPodHasPrintful(Boolean(r.data?.hasPrintfulApiKey));
      setPrintifyApiKey('');
      setPrintfulApiKey('');
      setPodMsg('POD API keys saved. Merch Store can now pull live products.');
      setTimeout(() => setPodMsg(''), 2600);
    } catch {
      setPodMsg('Failed to save POD API keys.');
    }
  };

  const scrapePodServices = async () => {
    try {
      const r = await adminApi.scrapePodServices();
      setPodServices(r.data?.services || []);
      setPodMsg('African POD services refreshed.');
      setTimeout(() => setPodMsg(''), 2400);
    } catch {
      setPodMsg('Failed to scrape POD services.');
    }
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

  // Derived data for charts
  const countryTotals = scrapeCounts.reduce<Record<string, number>>((acc, c) => {
    acc[c.country] = (acc[c.country] || 0) + c.count;
    return acc;
  }, {});
  const topCountries = Object.entries(countryTotals).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const maxCountryCount = topCountries[0]?.[1] || 1;

  const totalRev = financials ? financials.revenue.totalProSubscriptions + financials.revenue.adRevenue : 0;
  const totalCosts = financials ? financials.costs.salesCommissionsPaid + financials.costs.ambassadorPayoutsPaid : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Admin top bar — full width */}
      <div className="w-full bg-gray-900 border-b border-gray-800 px-4 sm:px-6 lg:px-10 py-3 flex items-center gap-3">
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
        <div className="relative">
          <button
            className="flex items-center gap-1 text-gray-200 text-xs px-2.5 py-1.5 rounded-lg hover:bg-gray-800 border border-gray-700"
            onClick={() => setPortalOpen(v => !v)}
          >
            {PORTAL_LABELS[portal]} <ChevronRight size={11} className="rotate-90" />
          </button>
          {portalOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white text-gray-800 rounded-xl shadow-2xl w-40 z-50">
              {availablePortals.map(p => (
                <button
                  key={p}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${p === portal ? 'font-bold' : ''}`}
                  style={p === portal ? { color: 'var(--cp)' } : {}}
                  onClick={() => {
                    setPortal(p);
                    setPortalOpen(false);
                    navigate(p === 'consumer' ? '/' : `/${p}`);
                  }}
                >
                  {PORTAL_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>
        <a href="/" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
          <Globe size={12} /> Live site <ArrowUpRight size={10} />
        </a>
      </div>

      {/* Full-width content area */}
      <div className="w-full px-4 sm:px-6 lg:px-10 py-6">

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800 scrollbar-none">
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
          <div className="space-y-5">

            {/* KPI grid — 2 cols mobile, 3 tablet, 6 desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: 'Total Listings', value: stats.listings.toLocaleString(), sub: `${stats.pendingListings} pending`, icon: <List size={20} strokeWidth={1.5} />, color: 'text-green-400', bg: 'bg-green-500/10' },
                { label: 'Registered Users', value: stats.users.toLocaleString(), sub: 'all time', icon: <Users size={20} strokeWidth={1.5} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Active Ads', value: stats.ads.toLocaleString(), sub: 'live campaigns', icon: <Megaphone size={20} strokeWidth={1.5} />, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { label: 'Sales Reps', value: stats.salesReps.toLocaleString(), sub: 'active reps', icon: <Activity size={20} strokeWidth={1.5} />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'MRR', value: financials ? `$${financials.revenue.monthlyRecurringRevenue.toFixed(0)}` : '…', sub: 'monthly recurring', icon: <DollarSign size={20} strokeWidth={1.5} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Loan Fund', value: financials ? `$${financials.loanFund.available.toFixed(0)}` : '…', sub: 'available to disburse', icon: <Award size={20} strokeWidth={1.5} />, color: 'text-rose-400', bg: 'bg-rose-500/10' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  {s.sub && <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>}
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Charts row — 2 panels on lg, 3 on xl */}
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">

              {/* Listings by country chart */}
              <div className="xl:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={16} className="text-green-400" strokeWidth={1.5} />
                  <h3 className="font-bold text-sm text-gray-200">Listings by Country</h3>
                  <span className="ml-auto text-xs text-gray-600 tabular-nums">{scrapeTotal.toLocaleString()} total</span>
                </div>
                {topCountries.length === 0 ? (
                  <div className="py-10 text-center">
                    <Database size={28} className="mx-auto mb-2 text-gray-700" strokeWidth={1} />
                    <p className="text-xs text-gray-600">No scrape data yet — use the Scraper tab to import cities</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                    {topCountries.map(([country, count]) => (
                      <HBar key={country} label={country} value={count} max={maxCountryCount} color="bg-green-500" />
                    ))}
                  </div>
                )}
              </div>

              {/* Revenue & costs breakdown */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={16} className="text-emerald-400" strokeWidth={1.5} />
                  <h3 className="font-bold text-sm text-gray-200">Revenue vs Costs</h3>
                </div>
                {financials ? (
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Revenue</p>
                      <HBar label="Pro subs" value={financials.revenue.totalProSubscriptions} max={Math.max(totalRev, 1)} color="bg-emerald-500" suffix={`$${financials.revenue.totalProSubscriptions.toFixed(0)}`} />
                      <HBar label="Ad revenue" value={financials.revenue.adRevenue} max={Math.max(totalRev, 1)} color="bg-orange-500" suffix={`$${financials.revenue.adRevenue.toFixed(0)}`} />
                    </div>
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Costs</p>
                      <HBar label="Commissions" value={financials.costs.salesCommissionsPaid} max={Math.max(totalRev, 1)} color="bg-red-500" suffix={`$${financials.costs.salesCommissionsPaid.toFixed(0)}`} />
                      <HBar label="Amb. payouts" value={financials.costs.ambassadorPayoutsPaid} max={Math.max(totalRev, 1)} color="bg-pink-500" suffix={`$${financials.costs.ambassadorPayoutsPaid.toFixed(0)}`} />
                    </div>
                    <div className="pt-3 border-t border-gray-800 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Revenue</span>
                        <span className="font-black text-emerald-400">${totalRev.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Costs</span>
                        <span className="font-black text-red-400">${totalCosts.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Net (est.)</span>
                        <span className={`font-black ${financials.net.estimated >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${financials.net.estimated.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-1">
                        <span className="text-gray-400">MRR</span>
                        <span className="font-black text-white">${financials.revenue.monthlyRecurringRevenue.toFixed(0)}<span className="text-gray-500 font-normal">/mo</span></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-xs text-gray-600">Loading financials…</p>
                  </div>
                )}
              </div>
            </div>

            {/* Loan fund visualization */}
            {financials && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-lg leading-none">🏦</span>
                  <h3 className="font-bold text-sm text-rose-300">Women's Micro-Loan Fund</h3>
                  <span className="ml-auto text-xs text-gray-600">{financials.loanFund.totalApplications} applications</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Allocated (5% rev)',  value: financials.loanFund.totalAllocated,  color: 'text-rose-300' },
                    { label: 'Disbursed',           value: financials.loanFund.totalDisbursed,  color: 'text-orange-300' },
                    { label: 'Repaid',              value: financials.loanFund.totalRepaid,     color: 'text-green-300' },
                    { label: 'Available now',       value: financials.loanFund.available,       color: 'text-emerald-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-950 rounded-xl border border-gray-800 p-3 text-center">
                      <p className={`text-xl font-black ${s.color}`}>${s.value.toFixed(0)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <FundBar label="Utilization (disbursed / allocated)" value={financials.loanFund.totalDisbursed} total={financials.loanFund.totalAllocated || 1} color="bg-orange-500" />
                  <FundBar label="Repayment rate (repaid / disbursed)" value={financials.loanFund.totalRepaid} total={financials.loanFund.totalDisbursed || 1} color="bg-green-500" />
                  <FundBar label="Available / allocated" value={financials.loanFund.available} total={financials.loanFund.totalAllocated || 1} color="bg-emerald-500" />
                </div>
              </div>
            )}

            {/* Quick action cards + system status */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: `${stats.pendingListings} listings to verify`, icon: <CheckCircle size={18} strokeWidth={1.5} />, action: () => setTab('listings'), color: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300' },
                { label: `${pendingPayouts.length} ambassador payouts`, icon: <TrendingUp size={18} strokeWidth={1.5} />, action: () => setTab('payouts'), color: 'border-blue-500/30 bg-blue-500/5 text-blue-300' },
                { label: `${loanApps.length} loan applications`, icon: <Award size={18} strokeWidth={1.5} />, action: () => setTab('loans'), color: 'border-rose-500/30 bg-rose-500/5 text-rose-300' },
                { label: 'Configure hero ad slot', icon: <Tv size={18} strokeWidth={1.5} />, action: () => setTab('adcms'), color: 'border-orange-500/30 bg-orange-500/5 text-orange-300' },
              ].map(c => (
                <button key={c.label} onClick={c.action}
                  className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-opacity hover:opacity-80 ${c.color}`}>
                  <span className="font-semibold text-sm">{c.label}</span>
                  <div className="flex items-center gap-1 text-xs opacity-70">{c.icon} <ChevronRight size={14} /></div>
                </button>
              ))}
            </div>

            {/* Live stats mini-grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              <StatSparkle value={`${scrapeCounts.filter(c => c.count > 0).length}`} label="cities with data" color="bg-green-500/15 text-green-400" icon={<Globe size={16} strokeWidth={1.5} />} />
              <StatSparkle value={`${new Set(scrapeCounts.map(c => c.country)).size}`} label="countries covered" color="bg-blue-500/15 text-blue-400" icon={<Zap size={16} strokeWidth={1.5} />} />
              <StatSparkle value={financials?.revenue.activeSubscriptions ?? '…'} label="active Pro subs" color="bg-emerald-500/15 text-emerald-400" icon={<DollarSign size={16} strokeWidth={1.5} />} />
              <StatSparkle value={stats.ads} label="live ad campaigns" color="bg-orange-500/15 text-orange-400" icon={<Megaphone size={16} strokeWidth={1.5} />} />
              <StatSparkle value={pendingPayouts.length} label="payouts pending" color="bg-yellow-500/15 text-yellow-400" icon={<TrendingUp size={16} strokeWidth={1.5} />} />
              <StatSparkle value={loanApps.length} label="loan apps" color="bg-rose-500/15 text-rose-400" icon={<Award size={16} strokeWidth={1.5} />} />
              <StatSparkle value={stats.pendingListings} label="listings to review" color="bg-purple-500/15 text-purple-400" icon={<List size={16} strokeWidth={1.5} />} />
              <StatSparkle value={stats.salesReps} label="sales reps" color="bg-pink-500/15 text-pink-400" icon={<Briefcase size={16} strokeWidth={1.5} />} />
            </div>

            {/* ── User Analytics ────────────────────────────────────────── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-cyan-400" strokeWidth={1.5} />
                <span className="font-bold text-sm text-white">User Analytics</span>
                {userAnalytics && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                    {userAnalytics.live.onlineNow} online now
                  </span>
                )}
              </div>

              {userAnalytics ? (
                <>
                  {/* Live + totals row */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
                    {[
                      { label: 'Online now',    value: userAnalytics.live.onlineNow,         color: 'text-green-400',   bg: 'bg-green-500/10'  },
                      { label: 'Last hour',     value: userAnalytics.live.activeHour,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10'   },
                      { label: 'Today',         value: userAnalytics.live.activeDay,         color: 'text-blue-400',    bg: 'bg-blue-500/10'   },
                      { label: 'Total users',   value: userAnalytics.totals.totalUsers,      color: 'text-white',       bg: 'bg-gray-700/40'   },
                      { label: 'New (30d)',      value: userAnalytics.totals.newLast30,       color: 'text-emerald-400', bg: 'bg-emerald-500/10'},
                      { label: 'New (90d)',      value: userAnalytics.totals.newLast90,       color: 'text-purple-400',  bg: 'bg-purple-500/10' },
                    ].map(s => (
                      <div key={s.label} className={`rounded-xl p-3 text-center ${s.bg}`}>
                        <p className={`text-xl font-black ${s.color}`}>{s.value.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    {/* Daily signups chart */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Daily Signups — Last 30 days</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {userAnalytics.dailySignups.length > 0 ? (() => {
                          const maxVal = Math.max(...userAnalytics.dailySignups.map(d => d.count), 1);
                          return userAnalytics.dailySignups.slice(-30).reverse().map(d => (
                            <div key={d.day} className="flex items-center gap-2 text-[11px]">
                              <span className="text-gray-500 w-20 shrink-0">{d.day.slice(5)}</span>
                              <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full rounded-full bg-cyan-500"
                                  style={{ width: `${(d.count / maxVal) * 100}%` }} />
                              </div>
                              <span className="text-gray-400 w-6 text-right shrink-0">{d.count}</span>
                            </div>
                          ));
                        })() : <p className="text-xs text-gray-600">No signup data yet</p>}
                      </div>
                    </div>

                    {/* Demographics: by country */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Users by Country (top 15)</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {userAnalytics.byCountry.length > 0 ? (() => {
                          const maxVal = Math.max(...userAnalytics.byCountry.map(c => c.count), 1);
                          return userAnalytics.byCountry.slice(0, 15).map(c => (
                            <div key={c.country ?? 'unknown'} className="flex items-center gap-2 text-[11px]">
                              <span className="text-gray-400 w-24 shrink-0 truncate">{c.country || '(unknown)'}</span>
                              <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${(c.count / maxVal) * 100}%` }} />
                              </div>
                              <span className="text-gray-400 w-6 text-right shrink-0">{c.count}</span>
                            </div>
                          ));
                        })() : <p className="text-xs text-gray-600">No country data yet</p>}
                      </div>
                    </div>

                    {/* By role */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Users by Role</p>
                      <div className="flex flex-wrap gap-2">
                        {userAnalytics.byRole.map(r => (
                          <div key={r.role} className="bg-gray-800 rounded-xl px-3 py-2 text-center min-w-[80px]">
                            <p className="text-sm font-black text-white">{r.count.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{r.role}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Peak hours */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Activity by Hour (UTC)</p>
                      {userAnalytics.peakHours.length > 0 ? (() => {
                        const maxVal = Math.max(...userAnalytics.peakHours.map(h => h.count), 1);
                        return (
                          <div className="flex items-end gap-0.5 h-16">
                            {Array.from({ length: 24 }, (_, hr) => {
                              const found = userAnalytics.peakHours.find(h => h.hour === hr);
                              const pct = found ? (found.count / maxVal) * 100 : 0;
                              return (
                                <div key={hr} className="flex-1 flex flex-col items-center gap-0.5" title={`${hr}:00 — ${found?.count ?? 0} sessions`}>
                                  <div className="w-full rounded-sm bg-blue-500/80 transition-all" style={{ height: `${Math.max(pct, 2)}%` }} />
                                  {hr % 6 === 0 && <span className="text-[8px] text-gray-600">{hr}</span>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })() : <p className="text-xs text-gray-600">No activity data yet</p>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-600 text-sm">Loading analytics…</div>
              )}
            </div>

            {/* System status */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={16} className="text-gray-400" strokeWidth={1.5} />
                <span className="font-bold text-sm text-gray-300">System Status</span>
                <span className="ml-auto text-xs text-green-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> All systems operational
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
                  <p className="text-gray-600 mb-0.5">API</p>
                  <p className="text-green-400 font-semibold">seshaa-api.vercel.app</p>
                </div>
                <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
                  <p className="text-gray-600 mb-0.5">Frontend</p>
                  <p className="text-green-400 font-semibold">www.seshaa.africa</p>
                </div>
                <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
                  <p className="text-gray-600 mb-0.5">Database</p>
                  <p className="text-blue-400 font-semibold">Neon PostgreSQL · Supabase</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FINANCE ── */}
        {tab === 'finance' && financials && (
          <div className="space-y-5">

            {/* Revenue/Costs row */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: 'Active Pro Subs',    value: `${financials.revenue.activeSubscriptions}`, icon: <Users size={18} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'MRR',               value: `$${financials.revenue.monthlyRecurringRevenue.toFixed(0)}`, icon: <TrendingUp size={18} />, color: 'text-green-400', bg: 'bg-green-500/10' },
                { label: 'Total Revenue',     value: `$${totalRev.toFixed(0)}`, icon: <DollarSign size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Net (estimated)',   value: `$${financials.net.estimated.toFixed(0)}`, icon: <BarChart2 size={18} />, color: financials.net.estimated >= 0 ? 'text-green-400' : 'text-red-400', bg: financials.net.estimated >= 0 ? 'bg-green-500/10' : 'bg-red-500/10' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Revenue vs costs visual */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <h3 className="font-bold text-green-400 mb-5 flex items-center gap-2"><DollarSign size={16} /> Revenue</h3>
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <HBar label="Pro subscriptions" value={financials.revenue.totalProSubscriptions} max={Math.max(totalRev, 1)} color="bg-emerald-500" suffix={`$${financials.revenue.totalProSubscriptions.toFixed(2)}`} />
                    <HBar label="Ad revenue" value={financials.revenue.adRevenue} max={Math.max(totalRev, 1)} color="bg-orange-500" suffix={`$${financials.revenue.adRevenue.toFixed(2)}`} />
                  </div>
                  <div className="pt-3 border-t border-gray-800">
                    {[
                      ['Active Pro Subs',   `${financials.revenue.activeSubscriptions}`],
                      ['Total Pro Revenue', `$${financials.revenue.totalProSubscriptions.toFixed(2)}`],
                      ['MRR (estimated)',   `$${financials.revenue.monthlyRecurringRevenue.toFixed(2)}`],
                      ['Ad Revenue',        `$${financials.revenue.adRevenue.toFixed(2)}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm py-2 border-b border-gray-800 last:border-0">
                        <span className="text-gray-400">{k}</span>
                        <span className="font-bold text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <h3 className="font-bold text-red-400 mb-5 flex items-center gap-2"><TrendingUp size={16} /> Costs &amp; Net</h3>
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <HBar label="Commissions" value={financials.costs.salesCommissionsPaid} max={Math.max(totalRev, 1)} color="bg-red-500" suffix={`$${financials.costs.salesCommissionsPaid.toFixed(2)}`} />
                    <HBar label="Pending comm." value={financials.costs.salesCommissionsPending} max={Math.max(totalRev, 1)} color="bg-red-400/60" suffix={`$${financials.costs.salesCommissionsPending.toFixed(2)}`} />
                    <HBar label="Amb. payouts" value={financials.costs.ambassadorPayoutsPaid} max={Math.max(totalRev, 1)} color="bg-pink-500" suffix={`$${financials.costs.ambassadorPayoutsPaid.toFixed(2)}`} />
                  </div>
                  <div className="pt-3 border-t border-gray-800">
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
              </div>
            </div>

            {/* Loan fund — full width visual */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-rose-400 mb-5 flex items-center gap-2">
                🏦 Women's Loan Fund
                <span className="ml-auto text-xs text-gray-600">{financials.loanFund.totalApplications} total applications</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Allocated (5% of revenue)', value: `$${financials.loanFund.totalAllocated.toFixed(2)}`, color: 'text-rose-300' },
                  { label: 'Disbursed',                 value: `$${financials.loanFund.totalDisbursed.toFixed(2)}`, color: 'text-orange-300' },
                  { label: 'Repaid',                    value: `$${financials.loanFund.totalRepaid.toFixed(2)}`,   color: 'text-green-300' },
                  { label: 'Available',                 value: `$${financials.loanFund.available.toFixed(2)}`,     color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-center">
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <FundBar label="Disbursement rate (of allocated)" value={financials.loanFund.totalDisbursed} total={financials.loanFund.totalAllocated || 1} color="bg-orange-500" />
                <FundBar label="Repayment rate (of disbursed)" value={financials.loanFund.totalRepaid} total={financials.loanFund.totalDisbursed || 1} color="bg-green-500" />
                <FundBar label="Funds still available" value={financials.loanFund.available} total={financials.loanFund.totalAllocated || 1} color="bg-emerald-500" />
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
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {pendingListings.map(l => (
                  <div key={l.id} className="flex items-start justify-between p-3 border border-gray-800 rounded-xl bg-gray-950">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-white">{l.name}</p>
                      <p className="text-xs text-gray-500">{l.city}, {l.country} · {l.category}</p>
                      {l.phone && <p className="text-xs text-gray-500">{l.phone}</p>}
                    </div>
                    <div className="flex gap-2 ml-3 shrink-0">
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
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
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
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {loanApps.map(app => (
                  <div key={app.id} className="border border-gray-800 rounded-xl p-4 bg-gray-950">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-white">{app.user.name}</p>
                        <p className="text-xs text-gray-500">{app.user.country} · {app.user.phone}</p>
                        <p className="text-sm text-gray-300 mt-2"><strong>Purpose:</strong> {app.purpose}</p>
                        <p className="text-sm text-gray-300">Requested: <strong className="text-white">${app.amount}</strong></p>
                      </div>
                      <div className="flex gap-2 ml-3">
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
          const topEarner = active.reduce((m, r) => r.totalEarned > m ? r.totalEarned : m, 0);
          return (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
                {[
                  { label: 'Pending',      value: pending.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                  { label: 'Active',       value: active.length,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
                  { label: 'Total Earned', value: `$${active.reduce((s,r) => s + r.totalEarned, 0).toFixed(0)}`, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  { label: 'Ads Placed',   value: active.reduce((s,r) => s + r.adsCount, 0), color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { label: 'Unpaid',       value: `$${active.reduce((s,r) => s + r.unpaidCommissions, 0).toFixed(0)}`, color: 'text-red-400', bg: 'bg-red-500/10' },
                  { label: 'Top earner',   value: `$${topEarner.toFixed(0)}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} border border-gray-800 rounded-2xl p-4 text-center`}>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Performance chart */}
              {active.length > 0 && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                  <h3 className="font-bold text-sm text-gray-200 mb-4 flex items-center gap-2">
                    <BarChart2 size={16} className="text-purple-400" /> Earnings by Rep
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                    {active.sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 16).map(r => (
                      <HBar key={r.id} label={r.name} value={r.totalEarned} max={Math.max(topEarner, 1)} color="bg-purple-500" suffix={`$${r.totalEarned.toFixed(0)}`} />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending applications */}
              {pending.length > 0 && (
                <div className="bg-gray-900 rounded-2xl border border-yellow-500/20 p-5">
                  <h3 className="font-bold text-yellow-400 mb-4 flex items-center gap-2">
                    <Briefcase size={16} strokeWidth={1.5} /> Pending Applications ({pending.length})
                  </h3>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
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
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {active.sort((a, b) => b.totalEarned - a.totalEarned).map((r, i) => (
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
          <div className="space-y-5">

            {/* ── HERO SLIDESHOW MANAGER ── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Play size={16} className="text-orange-400" strokeWidth={1.5} />
                <h3 className="font-bold text-white">Hero Slideshow — Live Ad Campaigns</h3>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-gray-500">{heroSlides.filter(s => s.active).length} active · {heroSlides.length} total</span>
                  <button
                    onClick={() => { setEditingSlide(null); setSlideForm(BLANK_SLIDE); setShowSlideForm(v => !v); setSlideMsg(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold rounded-xl transition-colors">
                    <Plus size={13} /> New Slide
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Each slide plays in the homepage hero carousel. Active slides appear live immediately. Manage client billing and notes per slide.
              </p>

              {slideMsg && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${slideMsg.startsWith('✓') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  {slideMsg}
                </div>
              )}

              {/* ── Add / Edit Form ── */}
              {showSlideForm && (
                <div className="bg-gray-950 border border-orange-500/30 rounded-2xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-orange-300 text-sm flex items-center gap-2">
                      {editingSlide ? <Edit2 size={14} /> : <Plus size={14} />}
                      {editingSlide ? `Editing: ${editingSlide.advertiser}` : 'New Hero Slide'}
                    </h4>
                    <button onClick={() => { setShowSlideForm(false); setEditingSlide(null); setSlideMsg(''); }}
                      className="p-1 text-gray-500 hover:text-white"><X size={16} /></button>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Media section */}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2">📺 Media</p>
                      <div className="flex gap-2 mb-3">
                        {(['youtube', 'image', 'video', 'default'] as const).map(type => (
                          <button key={type} onClick={() => setSlideForm(f => ({ ...f, mediaType: type }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${slideForm.mediaType === type ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                            {type === 'youtube' ? '▶ YouTube' : type === 'image' ? '🖼 Image/GIF' : type === 'video' ? '🎬 Video' : '🎨 Default'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {slideForm.mediaType === 'youtube' && (
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className="text-xs font-semibold text-gray-400 block mb-1">YouTube URL or Video ID</label>
                        <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                          placeholder="https://www.youtube.com/watch?v=VIDEO_ID  or  VIDEO_ID"
                          value={slideForm.youtubeId || slideForm.mediaUrl}
                          onChange={e => setSlideForm(f => ({ ...f, youtubeId: e.target.value, mediaUrl: e.target.value }))} />
                        <p className="text-xs text-gray-600 mt-1">Paste any YouTube link — video ID or full URL both work</p>
                      </div>
                    )}
                    {(slideForm.mediaType === 'image' || slideForm.mediaType === 'video') && (
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className="text-xs font-semibold text-gray-400 block mb-1">{slideForm.mediaType === 'image' ? 'Image / GIF URL' : 'Video URL (mp4)'}</label>
                        <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                          placeholder={slideForm.mediaType === 'image' ? 'https://cdn.example.com/banner.gif' : 'https://cdn.example.com/ad.mp4'}
                          value={slideForm.mediaUrl}
                          onChange={e => setSlideForm(f => ({ ...f, mediaUrl: e.target.value }))} />
                      </div>
                    )}

                    {/* Content */}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2 mt-1">📝 Content</p>
                    </div>
                    {[
                      { key: 'advertiser',      label: 'Advertiser / Client Name *', placeholder: 'e.g. Stanbic Bank Uganda' },
                      { key: 'overlayTitle',    label: 'Overlay Title',              placeholder: 'e.g. Uganda Tourism Board' },
                      { key: 'overlaySubtitle', label: 'Overlay Subtitle',           placeholder: 'e.g. Come experience the Pearl of Africa' },
                      { key: 'ctaText',         label: 'CTA Button Text',            placeholder: 'e.g. Book Now' },
                      { key: 'targetUrl',       label: 'CTA Link URL',               placeholder: 'https://example.com/offer' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-semibold text-gray-400 block mb-1">{f.label}</label>
                        <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                          placeholder={f.placeholder}
                          value={(slideForm as Record<string, string | number | boolean>)[f.key] as string || ''}
                          onChange={e => setSlideForm(f2 => ({ ...f2, [f.key]: e.target.value }))} />
                      </div>
                    ))}

                    {/* Client info */}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2 mt-1">👤 Client Info</p>
                    </div>
                    {[
                      { key: 'clientEmail',   label: 'Client Email',   placeholder: 'client@company.com' },
                      { key: 'clientPhone',   label: 'Client Phone',   placeholder: '+234 800 000 0000' },
                      { key: 'clientCountry', label: 'Client Country', placeholder: 'Nigeria' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-semibold text-gray-400 block mb-1">{f.label}</label>
                        <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                          placeholder={f.placeholder}
                          value={(slideForm as Record<string, string | number | boolean>)[f.key] as string || ''}
                          onChange={e => setSlideForm(f2 => ({ ...f2, [f.key]: e.target.value }))} />
                      </div>
                    ))}

                    {/* Payment */}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2 mt-1">💳 Payment</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Payment Status</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                        value={slideForm.paymentStatus}
                        onChange={e => setSlideForm(f => ({ ...f, paymentStatus: e.target.value }))}>
                        <option value="unpaid">⚠️ Unpaid</option>
                        <option value="pending">🕐 Pending / Invoice sent</option>
                        <option value="partial">💛 Partially paid</option>
                        <option value="paid">✅ Paid</option>
                        <option value="overdue">🔴 Overdue</option>
                        <option value="comp">🎁 Complimentary</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Campaign Value ($)</label>
                      <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                        placeholder="0.00" min={0} step={10}
                        value={slideForm.paymentAmount || ''}
                        onChange={e => setSlideForm(f => ({ ...f, paymentAmount: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Invoice Ref / Ref #</label>
                      <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                        placeholder="INV-2026-001"
                        value={slideForm.invoiceRef || ''}
                        onChange={e => setSlideForm(f => ({ ...f, invoiceRef: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Internal Notes</label>
                      <textarea className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white resize-none" rows={2}
                        placeholder="e.g. Agreed 3-month run, renewal call April 2026…"
                        value={slideForm.notes || ''}
                        onChange={e => setSlideForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 accent-orange-500"
                          checked={slideForm.active}
                          onChange={e => setSlideForm(f => ({ ...f, active: e.target.checked }))} />
                        <span className="text-sm text-gray-300">Active (show in homepage slideshow)</span>
                      </label>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
                      <button onClick={saveSlide} disabled={slideSaving}
                        className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                        {slideSaving ? 'Saving…' : editingSlide ? '✓ Update Slide' : '+ Add Slide to Slideshow'}
                      </button>
                      <button onClick={() => { setShowSlideForm(false); setEditingSlide(null); }}
                        className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Slides list ── */}
              {!slidesLoaded ? (
                <div className="text-center py-8 text-gray-600 text-sm">Loading slides…</div>
              ) : heroSlides.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                  <Tv size={32} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
                  <p className="text-sm">No hero slides configured yet.</p>
                  <p className="text-xs mt-1">Click <strong className="text-orange-400">New Slide</strong> to add the first ad campaign to the homepage carousel.</p>
                  <p className="text-xs mt-3 text-gray-700">Until slides are added, the homepage uses the built-in Uganda Tourism demo videos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {heroSlides.map((slide, idx) => {
                    const payColor: Record<string, string> = {
                      paid: 'text-green-400 bg-green-500/10 border-green-500/20',
                      partial: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                      pending: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                      unpaid: 'text-red-400 bg-red-500/10 border-red-500/20',
                      overdue: 'text-red-500 bg-red-600/10 border-red-600/20',
                      comp: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                    };
                    const pStatus = slide.paymentStatus ?? 'unpaid';
                    const payLabel: Record<string, string> = { paid: '✅ Paid', pending: '🕐 Pending', partial: '💛 Partial', unpaid: '⚠️ Unpaid', overdue: '🔴 Overdue', comp: '🎁 Comp' };
                    return (
                      <div key={slide.id}
                        className={`border rounded-2xl p-4 transition-opacity ${slide.active ? 'border-gray-700 bg-gray-950' : 'border-gray-800 bg-gray-900/50 opacity-60'}`}>
                        <div className="flex items-start gap-3">
                          {/* Index */}
                          <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black shrink-0">
                            {idx + 1}
                          </div>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-white text-sm">{slide.advertiser || '(no name)'}</p>
                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${payColor[pStatus] || payColor.unpaid}`}>
                                    {payLabel[pStatus] || pStatus}
                                  </span>
                                  {slide.paymentAmount != null && slide.paymentAmount > 0 && (
                                    <span className="text-gray-400">${slide.paymentAmount}</span>
                                  )}
                                  {slide.invoiceRef && <span className="text-gray-600">#{slide.invoiceRef}</span>}
                                  <span className="text-gray-700">·</span>
                                  <span className="capitalize text-gray-500">{slide.mediaType ?? 'youtube'}</span>
                                  <span className="text-gray-700">·</span>
                                  <span>{slide.impressions.toLocaleString()} impr</span>
                                </p>
                              </div>
                              {/* Action buttons */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => toggleSlide(slide.id)}
                                  className={`p-1.5 rounded-lg transition-colors ${slide.active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'}`}
                                  title={slide.active ? 'Hide slide' : 'Show slide'}>
                                  {slide.active ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button onClick={() => startEditSlide(slide)}
                                  className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => deleteSlide(slide.id)}
                                  className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Details row */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                              {slide.overlayTitle && (
                                <span className="flex items-center gap-1"><Info size={10} /> "{slide.overlayTitle}"</span>
                              )}
                              {slide.clientEmail && (
                                <span className="flex items-center gap-1"><Mail size={10} /> {slide.clientEmail}</span>
                              )}
                              {slide.clientPhone && (
                                <span className="flex items-center gap-1"><Phone size={10} /> {slide.clientPhone}</span>
                              )}
                              {slide.clientCountry && (
                                <span className="flex items-center gap-1"><Globe size={10} /> {slide.clientCountry}</span>
                              )}
                              {(slide.youtubeId || slide.mediaUrl) && (
                                <span className="flex items-center gap-1 text-orange-500/80 truncate max-w-xs">
                                  <Play size={10} /> {(slide.youtubeId || slide.mediaUrl || '').slice(0, 40)}…
                                </span>
                              )}
                            </div>
                            {slide.notes && (
                              <p className="mt-1.5 text-xs text-gray-600 italic border-l-2 border-gray-700 pl-2">{slide.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Revenue summary */}
              {heroSlides.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total campaign value', value: `$${heroSlides.reduce((s, sl) => s + (sl.paymentAmount ?? 0), 0).toFixed(0)}` },
                    { label: 'Active slides', value: `${heroSlides.filter(s => s.active).length} / ${heroSlides.length}` },
                    { label: 'Total impressions', value: heroSlides.reduce((s, sl) => s + sl.impressions, 0).toLocaleString() },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-950 rounded-xl border border-gray-800 p-3 text-center">
                      <p className="text-lg font-black text-orange-400">{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active standard campaigns */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Megaphone size={16} className="text-orange-400" strokeWidth={1.5} /> Other Active Ad Campaigns
              </h3>
              <ActiveAdsList />
            </div>

            {/* Payment quick-reference */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-400" strokeWidth={1.5} /> Payment Status Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { status: 'paid',    label: '✅ Paid',    color: 'bg-green-500/10 border-green-500/20 text-green-400' },
                  { status: 'pending', label: '🕐 Pending', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
                  { status: 'partial', label: '💛 Partial', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
                  { status: 'unpaid',  label: '⚠️ Unpaid',  color: 'bg-red-500/10 border-red-500/20 text-red-400' },
                  { status: 'overdue', label: '🔴 Overdue', color: 'bg-red-600/10 border-red-600/20 text-red-500' },
                  { status: 'comp',    label: '🎁 Comp',    color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
                ].map(s => {
                  const count = heroSlides.filter(sl => (sl.paymentStatus ?? 'unpaid') === s.status).length;
                  const total = heroSlides.filter(sl => (sl.paymentStatus ?? 'unpaid') === s.status).reduce((acc, sl) => acc + (sl.paymentAmount ?? 0), 0);
                  return (
                    <div key={s.status} className={`border rounded-xl p-3 text-center ${s.color}`}>
                      <p className="text-lg font-black">{count}</p>
                      <p className="text-xs mt-0.5">{s.label}</p>
                      {total > 0 && <p className="text-[10px] mt-0.5 opacity-70">${total.toFixed(0)}</p>}
                    </div>
                  );
                })}
              </div>
              {heroSlides.some(s => (s.paymentStatus ?? 'unpaid') === 'overdue') && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                  ⚠️ {heroSlides.filter(s => (s.paymentStatus ?? 'unpaid') === 'overdue').length} slide(s) overdue — follow up required.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── SCRAPER ── */}
        {tab === 'scraper' && (
          <div className="space-y-4">
            {/* Coverage chart */}
            {topCountries.length > 0 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={16} className="text-blue-400" strokeWidth={1.5} />
                  <h3 className="font-bold text-sm text-gray-200">Coverage by Country</h3>
                  <span className="ml-auto text-xs text-green-400 font-semibold">{scrapeTotal.toLocaleString()} total</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2.5">
                  {topCountries.map(([country, count]) => (
                    <HBar key={country} label={country} value={count} max={maxCountryCount} color="bg-blue-500" />
                  ))}
                </div>
              </div>
            )}

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

              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={triggerScrapeAll} disabled={scrapingAll || scrapingCity !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                  {scrapingAll ? <><RefreshCw size={14} className="animate-spin" /> Starting…</> : <><Database size={14} /> Scrape All Africa (background)</>}
                </button>
                <button onClick={triggerEnrich} disabled={enriching}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                  {enriching ? <><RefreshCw size={14} className="animate-spin" /> Enriching…</> : '💰 Enrich Prices from Websites'}
                </button>
                <button onClick={() => adminApi.scrapeCounts().then(r => { setScrapeCounts(r.data.counts || []); setScrapeTotal(r.data.total || 0); }).catch(() => {})}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition-colors">
                  <RefreshCw size={14} /> Refresh Counts
                </button>
              </div>

              {scrapeMsg && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${scrapeMsg.startsWith('✓') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  {scrapeMsg}
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-1">
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
                      <button onClick={() => triggerScrape(city, country)} disabled={isScraping || scrapingCity !== null}
                        className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                          isScraping ? 'bg-blue-500/20 text-blue-300' :
                          count > 0 ? 'bg-gray-800 text-gray-400 hover:bg-green-500/20 hover:text-green-300' :
                          'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        } disabled:opacity-50`}>
                        {isScraping ? <><RefreshCw size={12} className="animate-spin" /> Scraping…</> : count > 0 ? <><RefreshCw size={12} /> Refresh</> : '+ Import'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-600 mt-4">Data © OpenStreetMap contributors · Licensed under ODbL · Free to use commercially</p>
            </div>
          </div>
        )}

        {/* ── BRANDING ── */}
        {tab === 'branding' && (
          <div className="space-y-5">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Paintbrush size={16} className="text-pink-400" strokeWidth={1.5} /> CSS Settings
              </h3>
              <p className="text-xs text-gray-500 mb-5">Adjust app title size separately for mobile, tablet, and desktop. &quot;seshaa&quot; and country suffix remain equal size.</p>

              <div className="flex items-center justify-center bg-gray-950 rounded-xl border border-gray-800 py-4 mb-6"
                style={{ backgroundColor: 'var(--cp, #008751)' }}>
                <div className="flex items-center gap-0 select-none leading-none">
                  <span style={{ fontSize: `var(--logo-main-size, ${logoMainDesktop}rem)`, fontWeight: 900, fontStyle: 'italic', fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif', color: '#008751', WebkitTextStroke: `var(--logo-stroke, ${logoStroke}px) white`, letterSpacing: '-0.02em', lineHeight: 1 }}>seshaa</span>
                  <span style={{ fontSize: `var(--logo-main-size, ${logoMainDesktop}rem)`, fontWeight: 700, fontStyle: 'italic', fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif', color: 'white', letterSpacing: '-0.01em', lineHeight: 1 }}>.africa</span>
                </div>
              </div>

              <div className="space-y-5">
                {[
                  { label: 'App title size — mobile', value: logoMainMobile, min: 1.0, max: 2.4, step: 0.05, fmt: (v: number) => `${v.toFixed(2)}rem`, onChange: (v: number) => { setLogoMainMobile(v); applyCssVar('--logo-main-size-mobile', v + 'rem', 'seshaa-logo-main-mobile', v); }, minL: '1rem', maxL: '2.4rem' },
                  { label: 'App title size — tablet', value: logoMainTablet, min: 1.1, max: 2.8, step: 0.05, fmt: (v: number) => `${v.toFixed(2)}rem`, onChange: (v: number) => { setLogoMainTablet(v); applyCssVar('--logo-main-size-tablet', v + 'rem', 'seshaa-logo-main-tablet', v); }, minL: '1.1rem', maxL: '2.8rem' },
                  { label: 'App title size — desktop', value: logoMainDesktop, min: 1.2, max: 3.5, step: 0.05, fmt: (v: number) => `${v.toFixed(2)}rem`, onChange: (v: number) => { setLogoMainDesktop(v); applyCssVar('--logo-main-size-desktop', v + 'rem', 'seshaa-logo-main-desktop', v); }, minL: '1.2rem', maxL: '3.5rem' },
                  { label: 'Outline (stroke) thickness', value: logoStroke, min: 0, max: 5, step: 0.5, fmt: (v: number) => `${v.toFixed(1)}px`, onChange: (v: number) => { setLogoStroke(v); applyCssVar('--logo-stroke', v + 'px', 'seshaa-logo-stroke', v); }, minL: '0 (none)', maxL: '5px' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</label>
                      <span className="text-xs text-gray-500 tabular-nums">{s.fmt(s.value)}</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                      onChange={e => s.onChange(parseFloat(e.target.value))}
                      className="w-full accent-pink-400 h-1.5 cursor-pointer" />
                    <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                      <span>{s.minL}</span><span>{s.maxL}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setCssFontMsg('✓ CSS title settings saved.');
                      setTimeout(() => setCssFontMsg(''), 2500);
                    }}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Save CSS Settings
                  </button>
                  <button
                    onClick={() => {
                      setLogoMainMobile(1.35); setLogoMainTablet(1.55); setLogoMainDesktop(1.95); setLogoStroke(1.5);
                      applyCssVar('--logo-main-size-mobile','1.35rem','seshaa-logo-main-mobile',1.35);
                      applyCssVar('--logo-main-size-tablet','1.55rem','seshaa-logo-main-tablet',1.55);
                      applyCssVar('--logo-main-size-desktop','1.95rem','seshaa-logo-main-desktop',1.95);
                      applyCssVar('--logo-stroke','1.5px','seshaa-logo-stroke',1.5);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300 underline"
                  >
                    Reset to defaults
                  </button>
                  {cssFontMsg && <span className="text-xs text-pink-300">{cssFontMsg}</span>}
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Globe size={16} className="text-emerald-400" strokeWidth={1.5} /> Country Color Settings
              </h3>
              <p className="text-xs text-gray-500 mb-4">Override country theme colors individually. Use text color to force better contrast on header/footer backgrounds.</p>

              <div className="grid md:grid-cols-5 gap-3">
                <label className="text-xs text-gray-400 md:col-span-2">
                  Country
                  <select
                    value={themeCountryCode}
                    onChange={e => setThemeCountryCode(e.target.value)}
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
                  >
                    <option value="DEFAULT">🌍 seshaa.africa (Default / All Africa)</option>
                    {[...COUNTRIES.filter(c => c.region !== 'Diaspora')]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(c => (
                        <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                      ))
                    }
                  </select>
                </label>

                {[
                  { label: 'Primary', value: themePrimary, set: setThemePrimary },
                  { label: 'Secondary', value: themeSecondary, set: setThemeSecondary },
                  { label: 'Accent', value: themeAccent, set: setThemeAccent },
                ].map(f => (
                  <label key={f.label} className="text-xs text-gray-400">
                    {f.label}
                    <div className="mt-1 flex items-center gap-2">
                      <input type="color" value={f.value} onChange={e => f.set(e.target.value)} className="w-10 h-9 rounded border border-gray-700 bg-gray-950 p-1" />
                      <input value={f.value} onChange={e => f.set(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-2 py-2 text-xs text-gray-100" />
                    </div>
                  </label>
                ))}

                <label className="text-xs text-gray-400 md:col-span-2">
                  Text Color (on Primary)
                  <div className="mt-1 flex items-center gap-2">
                    <input type="color" value={themeText} onChange={e => setThemeText(e.target.value)} className="w-10 h-9 rounded border border-gray-700 bg-gray-950 p-1" />
                    <input value={themeText} onChange={e => setThemeText(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl px-2 py-2 text-xs text-gray-100" />
                  </div>
                </label>
              </div>

              {/* ── Live header preview ──────────────────────────────── */}
              <div className="mt-4 rounded-xl overflow-hidden border border-gray-700">
                {/* Mock header bar */}
                <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: themePrimary }}>
                  {/* Logo */}
                  <div className="flex items-center gap-0 select-none leading-none">
                    <span style={{
                      fontSize: '1.45rem', fontWeight: 900, fontStyle: 'italic',
                      fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
                      color: themeSecondary, letterSpacing: '-0.02em', lineHeight: 1,
                    }}>seshaa</span>
                    <span style={{
                      fontSize: '1.45rem', fontWeight: 700, fontStyle: 'italic',
                      fontFamily: '"Arial Black","Arial Bold",Arial,sans-serif',
                      color: themeAccent, letterSpacing: '-0.01em', lineHeight: 1,
                    }}>.{themeCountryCode === 'DEFAULT' ? 'africa' : (ENGLISH_SLUGS[themeCountryCode] || 'africa')}</span>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Flag + code badge */}
                  <span className="text-xl leading-none">
                    {themeCountryCode === 'DEFAULT'
                      ? '🌍'
                      : COUNTRIES.find(c => c.code === themeCountryCode)?.flag ?? '🌍'}
                  </span>
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: themeText + '30', color: themeText }}>
                    {themeCountryCode === 'DEFAULT' ? 'ALL' : themeCountryCode}
                  </span>
                </div>

                {/* Tab strip */}
                <div className="px-4 py-1.5 flex items-center gap-4" style={{ backgroundColor: themePrimary, opacity: 0.85 }}>
                  {['Home', 'Directory', 'News', 'Classifieds'].map(t => (
                    <span key={t} className="text-[11px] font-medium" style={{ color: themeText, opacity: 0.8 }}>{t}</span>
                  ))}
                </div>

                {/* Color chips row */}
                <div className="px-4 py-2 bg-gray-950 flex items-center gap-5 text-[10px] text-gray-400">
                  {[
                    { label: 'Primary', color: themePrimary },
                    { label: 'Secondary', color: themeSecondary },
                    { label: 'Accent', color: themeAccent },
                    { label: 'Text', color: themeText },
                  ].map(({ label, color }) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-sm border border-gray-700 shrink-0" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button onClick={saveThemeSettings} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors">
                  Save Country Colors
                </button>
                {themeMsg && <span className="text-xs text-emerald-300">{themeMsg}</span>}
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Globe size={16} className="text-blue-400" strokeWidth={1.5} /> Custom CSS
              </h3>
              <p className="text-xs text-gray-500 mb-3">Injected into the app via a &lt;style&gt; tag. Applies to every page instantly. Use <code className="text-blue-400">--cp</code> for primary colour.</p>
              <textarea className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-xs font-mono text-green-300 focus:border-gray-500 resize-y" rows={8}
                placeholder={`/* Example */\n.navbar-title { opacity: 0.9; }\nbody { letter-spacing: 0.01em; }`}
                value={customCss} onChange={e => setCustomCss(e.target.value)} />
              <div className="flex items-center gap-3 mt-3">
                <button onClick={() => { applyCustomCss(customCss); setCssSaved(true); setTimeout(() => setCssSaved(false), 2000); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors">
                  {cssSaved ? '✓ Applied' : 'Apply & Save'}
                </button>
                <button onClick={() => { setCustomCss(''); applyCustomCss(''); }} className="text-xs text-gray-500 hover:text-gray-300 underline">Clear</button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Zap size={16} className="text-cyan-400" strokeWidth={1.5} /> AI Provider (OpenRouter)
              </h3>
              <p className="text-xs text-gray-500 mb-4">Set your OpenRouter key so Seshaa AI chat and AI search use your configured provider.</p>

              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs text-gray-400">
                  OpenRouter API Key
                  <input
                    type="password"
                    value={openRouterApiKey}
                    onChange={e => setOpenRouterApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
                  />
                </label>
                <label className="text-xs text-gray-400">
                  Model
                  <input
                    value={openRouterModel}
                    onChange={e => setOpenRouterModel(e.target.value)}
                    placeholder="openai/gpt-4o-mini"
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button onClick={saveAiSettings} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors">
                  Save AI Settings
                </button>
                {aiSettingsMsg && <span className="text-xs text-cyan-300">{aiSettingsMsg}</span>}
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Briefcase size={16} className="text-lime-400" strokeWidth={1.5} /> POD Integrations (Merch Store)
              </h3>
              <p className="text-xs text-gray-500 mb-4">Connect Printify and Printful, then refresh African POD service list. API keys are paste-ready.</p>

              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs text-gray-400">
                  Printify API Key
                  <input
                    type="password"
                    value={printifyApiKey}
                    onChange={e => setPrintifyApiKey(e.target.value)}
                    placeholder="paste Printify key"
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
                  />
                  <p className="text-[11px] mt-1 text-gray-500">Status: {podHasPrintify ? 'Connected' : 'Not connected'}</p>
                </label>
                <label className="text-xs text-gray-400">
                  Printful API Key
                  <input
                    type="password"
                    value={printfulApiKey}
                    onChange={e => setPrintfulApiKey(e.target.value)}
                    placeholder="paste Printful key"
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
                  />
                  <p className="text-[11px] mt-1 text-gray-500">Status: {podHasPrintful ? 'Connected' : 'Not connected'}</p>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button onClick={savePodSettings} className="px-4 py-2 bg-lime-600 hover:bg-lime-500 text-white text-xs font-bold rounded-xl transition-colors">
                  Save POD Keys
                </button>
                <button onClick={scrapePodServices} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-colors">
                  Search & Scrape African POD Services
                </button>
                {podMsg && <span className="text-xs text-lime-300">{podMsg}</span>}
              </div>

              {podServices.length > 0 && (
                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  {podServices.map(s => (
                    <a key={s.website} href={s.website} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl border border-gray-800 bg-gray-950 hover:bg-gray-900">
                      <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.region}</p>
                      {s.eco && <p className="text-xs text-lime-300 mt-1">{s.eco}</p>}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Info size={16} className="text-indigo-400" strokeWidth={1.5} /> Social Share SEO
              </h3>
              <p className="text-xs text-gray-500 mb-4">Control social preview title, description, and thumbnail used by WhatsApp, X, Facebook, and Telegram.</p>

              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs text-gray-400 md:col-span-2">
                  Share Title
                  <input
                    value={seoTitle}
                    onChange={e => setSeoTitle(e.target.value)}
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
                    placeholder="Seshaa Africa — Directory for All 54 Countries"
                  />
                </label>

                <label className="text-xs text-gray-400 md:col-span-2">
                  Share Description
                  <textarea
                    value={seoDescription}
                    onChange={e => setSeoDescription(e.target.value)}
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 resize-y"
                    rows={3}
                    placeholder="Find businesses, services, and people across all 54 African countries on Seshaa."
                  />
                </label>

                <label className="text-xs text-gray-400">
                  Thumbnail URL
                  <input
                    value={seoThumbnailUrl}
                    onChange={e => setSeoThumbnailUrl(e.target.value)}
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
                    placeholder="https://www.seshaa.africa/og-image.svg"
                  />
                </label>

                <label className="text-xs text-gray-400">
                  Canonical URL
                  <input
                    value={seoUrl}
                    onChange={e => setSeoUrl(e.target.value)}
                    className="mt-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100"
                    placeholder="https://www.seshaa.africa"
                  />
                </label>
              </div>

              {seoThumbnailUrl && (
                <div className="mt-4 p-3 rounded-xl border border-gray-800 bg-gray-950">
                  <p className="text-[11px] text-gray-500 mb-2">Preview</p>
                  <div className="flex gap-3 items-start">
                    <img src={seoThumbnailUrl} alt="SEO thumbnail preview" className="w-28 h-16 object-cover rounded-md border border-gray-800 bg-black" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300 font-semibold truncate">{seoTitle}</p>
                      <p className="text-[11px] text-gray-500 line-clamp-2">{seoDescription}</p>
                      <p className="text-[10px] text-gray-600 truncate mt-1">{seoUrl}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mt-4">
                <button onClick={saveSeoSettings} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors">
                  Save SEO Share Settings
                </button>
                {seoSaved && <span className="text-xs text-indigo-300">{seoSaved}</span>}
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <RefreshCw size={16} className="text-yellow-400" strokeWidth={1.5} /> Logo Rotation
              </h3>
              <p className="text-xs text-gray-500 mb-5">Toggle which logo variants cycle in the navbar. At least one must stay enabled.</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {ALL_LOGOS.map(logo => {
                  const isOn = enabledLogos.includes(logo.id);
                  return (
                    <button key={logo.id} onClick={() => toggleLogo(logo.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-colors ${
                        isOn ? 'border-green-500/40 bg-green-500/5' : 'border-gray-700 bg-gray-950 opacity-50'
                      }`}>
                      <div className="w-28 h-10 flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden shrink-0 border border-gray-800">
                        <div style={{ width: 108, height: 36, overflow: 'hidden' }}>{logo.node}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{logo.label}</p>
                        <p className={`text-xs mt-0.5 font-semibold ${isOn ? 'text-green-400' : 'text-gray-600'}`}>{isOn ? '● Active' : '○ Off'}</p>
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
              <Megaphone size={16} style={{ color: 'var(--cp)' }} strokeWidth={1.5} /> Press &amp; Social Media
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
            <button className="w-full py-2.5 rounded-xl text-white font-semibold text-sm mb-4 bg-orange-500 hover:bg-orange-400" onClick={generatePressRelease}>
              Generate Content
            </button>
            {pressMsg && (
              <div className="relative">
                <textarea className="w-full border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono bg-gray-950 text-gray-300 resize-none" rows={14}
                  value={pressMsg} onChange={e => setPressMsg(e.target.value)} />
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
  const maxImpr = Math.max(...ads.map(a => a.impressions), 1);
  return (
    <div className="space-y-3">
      {ads.map(ad => (
        <div key={ad.id} className="p-3 border border-gray-800 rounded-xl bg-gray-950 text-sm">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="font-semibold text-white">{ad.title}</p>
              <p className="text-xs text-gray-500">{ad.advertiser} · <span className="text-orange-400">{ad.tier}</span></p>
            </div>
            <div className="text-right text-xs text-gray-500 shrink-0">
              <p>{ad.impressions.toLocaleString()} impr.</p>
              <p>{ad.clicks} clicks</p>
              {ad.impressions > 0 && <p className="text-blue-400">{((ad.clicks / ad.impressions) * 100).toFixed(1)}% CTR</p>}
            </div>
          </div>
          <HBar label="Impressions" value={ad.impressions} max={maxImpr} color="bg-orange-500" />
        </div>
      ))}
    </div>
  );
}
