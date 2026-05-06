import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, List, Megaphone, TrendingUp, Shield, DollarSign, Award,
  Send, CheckCircle, X, Users, Activity, Globe, Bell, ChevronRight,
  AlertTriangle, Tv, Database, Paintbrush, RefreshCw, Briefcase, BarChart2,
  Zap, ArrowUpRight, Plus, Edit2, Trash2, Eye, EyeOff, Play,
  CreditCard, Phone, Mail, Info,
} from 'lucide-react';
import { adminApi, adsApi, analyticsApi } from '../../services/api';
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
interface PendingListing {
  id: string; name: string; type?: string;
  city: string; country: string; region?: string;
  category?: string; subcategory?: string;
  phone?: string; phone2?: string; email?: string;
  address?: string; website?: string; whatsapp?: string;
  description?: string; logoUrl?: string;
  openingHours?: string;
  verified: boolean; active: boolean;
  createdAt: string;
}
interface PendingPayout  { id: string; amount: number; method: string; ambassador: { user: { name: string; phone: string; country: string } } }
interface LoanApp        { id: string; amount: number; purpose: string; status: string; createdAt: string; user: { name: string; phone: string; country: string } }

type Tab = 'overview' | 'listings' | 'payouts' | 'loans' | 'finance' | 'adcms' | 'promote' | 'scraper' | 'branding' | 'salesreps' | 'analytics' | 'banking';

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

// ── Font presets for the title branding picker ───────────────────────────────
const FONT_PRESETS = [
  { id: 'default',     label: 'Default — Arial Black',              family: '"Arial Black","Arial Bold",Arial,sans-serif',   googleUrl: null },
  { id: 'playfair',    label: 'Playfair Display Black Italic',       family: '"Playfair Display",serif',                       googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&display=swap' },
  { id: 'fraunces',    label: 'Fraunces Black Italic',               family: '"Fraunces",serif',                               googleUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,900&display=swap' },
  { id: 'barlow',      label: 'Barlow Condensed ExtraBold Italic',   family: '"Barlow Condensed",sans-serif',                  googleUrl: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800&display=swap' },
  { id: 'montserrat',  label: 'Montserrat Black Italic',             family: '"Montserrat",sans-serif',                        googleUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,900&display=swap' },
  { id: 'raleway',     label: 'Raleway Black Italic',                family: '"Raleway",sans-serif',                           googleUrl: 'https://fonts.googleapis.com/css2?family=Raleway:ital,wght@1,900&display=swap' },
  { id: 'josefin',     label: 'Josefin Sans Bold Italic',            family: '"Josefin Sans",sans-serif',                      googleUrl: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@1,700&display=swap' },
  { id: 'custom',      label: 'Custom uploaded font…',              family: 'SeshaaCustomFont,sans-serif',                    googleUrl: null },
];

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
  const { t } = useTranslation();
  const { user, portal, setPortal } = useAuthStore();
  const [portalOpen, setPortalOpen] = useState(false);
  const [stats, setStats]                 = useState<Stats>({ listings: 0, users: 0, ads: 0, salesReps: 0, pendingListings: 0 });
  const [financials, setFinancials]       = useState<Financials | null>(null);
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [editingListingId, setEditingListingId]   = useState<string | null>(null);
  const [listingEditForm, setListingEditForm]     = useState<Partial<PendingListing>>({});
  const [listingEditMsg, setListingEditMsg]       = useState('');
  const [listingEditSaving, setListingEditSaving] = useState(false);
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
    startTime?: number; endTime?: number;
    overlayTitle?: string; overlaySubtitle?: string; ctaText?: string;
    clientEmail?: string; clientPhone?: string; clientCountry?: string;
    paymentStatus?: string; paymentAmount?: number; invoiceRef?: string;
    notes?: string; active: boolean; impressions: number; clicks: number;
    startDate?: string; endDate?: string; budget?: number;
  }
  type SlideForm = Omit<HeroSlide, 'id' | 'impressions' | 'clicks'>;
  const BLANK_SLIDE: SlideForm = {
    advertiser: '', targetUrl: '/advertise', mediaType: 'youtube', mediaUrl: '', youtubeId: '',
    startTime: 0, endTime: 0,
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
  const [ytMeta, setYtMeta]               = useState<{ title: string; author: string; thumbnail: string } | null>(null);
  const [ytMetaLoading, setYtMetaLoading] = useState(false);
  const ytDebounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Behaviour analytics (UserEvent) state
  interface BehaviourStats {
    totals: { allTime: number; pageviews7d: number; searches7d: number };
    topPages:        { path: string; count: string }[];
    topSearches:     { value: string; count: string }[];
    deviceBreakdown: { device: string; count: string }[];
    countryBreakdown:{ country: string; count: string }[];
    eventsPerDay:    { day: string; count: string }[];
    activeHours:     { hour: number; count: string }[];
    adminActions?:   { target: string; count: string }[];
    adminTabVisits?: { target: string; count: string }[];
  }
  interface PrognosisData {
    daily:    { day: string; count: string }[];
    forecast: { day: number; predicted: number }[];
    trend:    'growing' | 'declining' | 'stable';
    slope:    number;
  }
  interface SessionData {
    sessions: { userId: string; name: string; sessionId: string; startedAt: string; endedAt: string; eventCount: string; durationSeconds: string }[];
    keystrokeSessions: { userId: string; name: string; wpm: string; createdAt: string }[];
  }
  const [behaviourStats,    setBehaviourStats]    = useState<BehaviourStats | null>(null);
  const [prognosisData,     setPrognosisData]     = useState<PrognosisData | null>(null);
  const [sessionData,       setSessionData]       = useState<SessionData | null>(null);
  const [analyticsLoading,  setAnalyticsLoading]  = useState(false);

  // Scraper state
  const [scrapeCounts, setScrapeCounts]   = useState<{ city: string; country: string; count: number }[]>([]);
  const [scrapeTotal, setScrapeTotal]     = useState(0);
  const [scrapingCity, setScrapingCity]   = useState<string | null>(null);
  const [scrapeMsg, setScrapeMsg]         = useState('');
  const [scrapingAll, setScrapingAll]     = useState(false);
  const [enriching, setEnriching]         = useState(false);
  // Black-owned scraper
  const [blackOwnedInfo, setBlackOwnedInfo] = useState<{ cities: number; byRegion: Record<string, number>; yelpKeyConfigured: boolean } | null>(null);
  const [blackOwnedRunning, setBlackOwnedRunning] = useState(false);
  const [blackOwnedMsg, setBlackOwnedMsg] = useState('');
  const [blackOwnedSource, setBlackOwnedSource] = useState<'all' | 'yelp' | 'html'>('all');
  const [blackOwnedRegion, setBlackOwnedRegion] = useState<string>('all');

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
  const [logoTitleColor,  setLogoTitleColor]  = useState(() => localStorage.getItem('seshaa-logo-title-color') ?? '');
  const [logoSuffixColor, setLogoSuffixColor] = useState(() => localStorage.getItem('seshaa-logo-suffix-color') ?? '');
  const [logoFont,         setLogoFont]        = useState(() => localStorage.getItem('seshaa-logo-font') ?? 'default');
  const [customFontName,   setCustomFontName]  = useState(() => localStorage.getItem('seshaa-logo-font-name') ?? '');
  const [tickerSpeed, setTickerSpeed] = useState<number>(() => {
    const v = localStorage.getItem('seshaa_ticker_speed');
    return v ? Math.max(20, Math.min(200, parseInt(v))) : 60;
  });
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

  /** Apply / remove a string CSS variable + persist to localStorage */
  const applyCssStr = (varName: string, value: string, lsKey: string) => {
    if (value) {
      document.documentElement.style.setProperty(varName, value);
      localStorage.setItem(lsKey, value);
    } else {
      document.documentElement.style.removeProperty(varName);
      localStorage.removeItem(lsKey);
    }
  };

  /** Load a Google Fonts stylesheet for the title font (replaces any previous one) */
  const loadGoogleFont = (url: string | null, fontId: string) => {
    document.querySelectorAll<HTMLLinkElement>('link[data-seshaa-font]').forEach(el => el.remove());
    if (url) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = url;
      link.setAttribute('data-seshaa-font', fontId);
      document.head.appendChild(link);
    }
  };

  /** Apply a font preset: load GFont, set CSS var, persist */
  const applyFontPreset = (id: string) => {
    const preset = FONT_PRESETS.find(p => p.id === id);
    if (!preset) return;
    loadGoogleFont(preset.googleUrl, id);
    if (id === 'default') {
      document.documentElement.style.removeProperty('--logo-font-family');
      localStorage.removeItem('seshaa-logo-font-family');
    } else {
      applyCssStr('--logo-font-family', preset.family, 'seshaa-logo-font-family');
    }
    localStorage.setItem('seshaa-logo-font', id);
    setLogoFont(id);
  };

  /** Handle custom font file upload → @font-face → CSS var */
  const handleFontUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const name = 'SeshaaCustomFont';
      // Inject @font-face
      let styleEl = document.getElementById('seshaa-custom-font-face') as HTMLStyleElement | null;
      if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'seshaa-custom-font-face'; document.head.appendChild(styleEl); }
      styleEl.textContent = `@font-face { font-family: '${name}'; src: url('${dataUrl}'); font-weight: 900; font-style: italic; }`;
      // Store in localStorage (may be large for woff2)
      try { localStorage.setItem('seshaa-logo-font-data', dataUrl); } catch { /* ignore quota */ }
      localStorage.setItem('seshaa-logo-font-name', file.name);
      localStorage.setItem('seshaa-logo-font', 'custom');
      applyCssStr('--logo-font-family', `'${name}',sans-serif`, 'seshaa-logo-font-family');
      setCustomFontName(file.name);
      setLogoFont('custom');
    };
    reader.readAsDataURL(file);
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

  // Load behaviour analytics lazily when the tab is first opened
  useEffect(() => {
    if (tab !== 'analytics') return;
    if (behaviourStats) return; // already loaded
    setAnalyticsLoading(true);
    Promise.all([
      analyticsApi.admin(),
      analyticsApi.prognosis(),
      analyticsApi.sessions(),
    ]).then(([statsRes, progRes, sessRes]) => {
      setBehaviourStats(statsRes.data as BehaviourStats);
      setPrognosisData(progRes.data as PrognosisData);
      setSessionData(sessRes.data as SessionData);
    }).catch(() => {}).finally(() => setAnalyticsLoading(false));
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const availablePortals: PortalType[] = ['consumer', 'business', 'advertiser', 'salesrep', 'ambassador', 'admin'];

  const verifyListing = async (id: string) => {
    await adminApi.verifyListing(id);
    setPendingListings(p => p.filter(l => l.id !== id));
    if (expandedListingId === id) setExpandedListingId(null);
    if (editingListingId === id) setEditingListingId(null);
  };
  const rejectListing = async (id: string) => {
    await adminApi.rejectListing(id);
    setPendingListings(p => p.filter(l => l.id !== id));
    if (expandedListingId === id) setExpandedListingId(null);
    if (editingListingId === id) setEditingListingId(null);
  };
  const startEditListing = (l: PendingListing) => {
    setEditingListingId(l.id);
    setExpandedListingId(l.id);
    setListingEditForm({
      name: l.name, type: l.type,
      city: l.city, country: l.country, region: l.region ?? '',
      category: l.category ?? '', subcategory: l.subcategory ?? '',
      phone: l.phone ?? '', phone2: l.phone2 ?? '',
      email: l.email ?? '', address: l.address ?? '',
      website: l.website ?? '', whatsapp: l.whatsapp ?? '',
      description: l.description ?? '', openingHours: l.openingHours ?? '',
    });
    setListingEditMsg('');
  };
  const saveListingEdit = async () => {
    if (!editingListingId) return;
    setListingEditSaving(true);
    setListingEditMsg('');
    try {
      const updated = await adminApi.updateListing(editingListingId, listingEditForm as Record<string, unknown>);
      setPendingListings(p => p.map(l => l.id === editingListingId ? { ...l, ...updated.data } : l));
      setEditingListingId(null);
      setListingEditMsg('');
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setListingEditMsg(`✗ ${axErr?.response?.data?.error || 'Save failed'}`);
    } finally {
      setListingEditSaving(false);
    }
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
      setYtMeta(null);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string; detail?: string } } };
      const detail = axErr?.response?.data?.detail || axErr?.response?.data?.error || String(err);
      setSlideMsg(`✗ Save failed: ${detail}`);
    } finally { setSlideSaving(false); }
  };

  // Extract bare YouTube video ID from any URL format
  const extractYtId = (url: string): string => {
    if (!url) return '';
    const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
              url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
              url.match(/embed\/([A-Za-z0-9_-]{11})/) ||
              url.match(/shorts\/([A-Za-z0-9_-]{11})/) ||
              url.match(/live\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
    return '';
  };

  // Load metadata immediately (for edit mode — no auto-fill, no debounce)
  const loadYoutubeMeta = useCallback(async (url: string) => {
    if (!url.trim()) { setYtMeta(null); return; }
    setYtMetaLoading(true);
    try {
      const r = await adminApi.getYoutubeMeta(url);
      setYtMeta({ title: r.data.title, author: r.data.author, thumbnail: r.data.thumbnail });
    } catch { setYtMeta(null); }
    finally { setYtMetaLoading(false); }
  }, []);

  // Auto-fetch + auto-fill when URL is typed (debounced 600ms, for new slides)
  const fetchYoutubeMeta = useCallback((url: string) => {
    if (ytDebounceRef.current) clearTimeout(ytDebounceRef.current);
    if (!url.trim()) { setYtMeta(null); return; }
    ytDebounceRef.current = setTimeout(async () => {
      setYtMetaLoading(true);
      try {
        const r = await adminApi.getYoutubeMeta(url);
        const { title, author, thumbnail } = r.data;
        setYtMeta({ title, author, thumbnail });
        // Auto-fill only empty fields
        setSlideForm(f => ({
          ...f,
          overlayTitle: f.overlayTitle || title,
          advertiser:   f.advertiser   || author,
        }));
      } catch { setYtMeta(null); }
      finally { setYtMetaLoading(false); }
    }, 600);
  }, []);

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
      startTime: slide.startTime ?? 0,
      endTime: slide.endTime ?? 0,
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
    // Load YouTube metadata immediately for existing slides
    const mt = slide.mediaType ?? 'youtube';
    if (mt === 'youtube') {
      const url = slide.youtubeId || slide.mediaUrl || '';
      if (url) loadYoutubeMeta(url);
    } else {
      setYtMeta(null);
    }
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

  const triggerBlackOwnedScrape = async () => {
    setBlackOwnedRunning(true);
    setBlackOwnedMsg('');
    try {
      const r = await adminApi.scrapeBlackOwned({ source: blackOwnedSource, region: blackOwnedRegion });
      setBlackOwnedMsg(`✓ ${r.data.message}`);
    } catch {
      setBlackOwnedMsg('✗ Scrape failed — check server logs');
    } finally {
      setBlackOwnedRunning(false);
    }
  };

  const loadBlackOwnedInfo = async () => {
    try {
      const r = await adminApi.blackOwnedCities();
      setBlackOwnedInfo(r.data);
    } catch { /* silent */ }
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
    { key: 'overview', label: t('admin.overview'),  icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
    { key: 'finance',  label: t('admin.finance'),   icon: <DollarSign size={20} strokeWidth={1.5} /> },
    { key: 'listings', label: t('admin.listings'),  icon: <List size={20} strokeWidth={1.5} />, badge: stats.pendingListings },
    { key: 'payouts',  label: t('admin.payouts'),   icon: <TrendingUp size={20} strokeWidth={1.5} />, badge: pendingPayouts.length },
    { key: 'loans',    label: t('admin.loans'),     icon: <Award size={20} strokeWidth={1.5} />, badge: loanApps.length },
    { key: 'salesreps',label: t('admin.salesReps'), icon: <Briefcase size={20} strokeWidth={1.5} /> },
    { key: 'adcms',    label: t('admin.adCms'),     icon: <Tv size={20} strokeWidth={1.5} /> },
    { key: 'scraper',   label: t('admin.scraper'),   icon: <Database size={20} strokeWidth={1.5} /> },
    { key: 'branding',  label: t('admin.branding'),  icon: <Paintbrush size={20} strokeWidth={1.5} /> },
    { key: 'promote',   label: t('admin.press'),     icon: <Send size={20} strokeWidth={1.5} /> },
    { key: 'analytics', label: t('admin.behaviour'), icon: <Activity size={20} strokeWidth={1.5} /> },
    { key: 'banking',   label: t('admin.banking'),   icon: <CreditCard size={20} strokeWidth={1.5} /> },
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

  // ── Hero Slide Form (rendered inline inside list item OR at top for "Add New") ──
  const renderSlideForm = () => (
    <div className="bg-gray-950 border border-orange-500/30 rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-orange-300 text-sm flex items-center gap-2">
          {editingSlide ? <Edit2 size={14} /> : <Plus size={14} />}
          {editingSlide ? `Editing: ${editingSlide.advertiser}` : 'New Hero Slide'}
        </h4>
        <button onClick={() => { setShowSlideForm(false); setEditingSlide(null); setSlideMsg(''); setYtMeta(null); }}
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

        {/* ── Live Preview ── */}
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2">👁 Preview</p>
          <div className="relative w-full rounded-xl overflow-hidden bg-gray-900 border border-gray-800" style={{ aspectRatio: '16/9' }}>
            {slideForm.mediaType === 'youtube' && (() => {
              const vid = extractYtId(slideForm.youtubeId || slideForm.mediaUrl || '');
              return vid ? (
                <iframe
                  key={vid}
                  src={`https://www.youtube.com/embed/${vid}?controls=1&rel=0&modestbranding=1${slideForm.startTime ? `&start=${slideForm.startTime}` : ''}${slideForm.endTime ? `&end=${slideForm.endTime}` : ''}`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  frameBorder="0" allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600">
                  <span className="text-3xl">▶</span>
                  <p className="text-xs">Paste a YouTube URL to preview</p>
                </div>
              );
            })()}
            {slideForm.mediaType === 'image' && (
              slideForm.mediaUrl ? (
                <img src={slideForm.mediaUrl} alt="slide preview" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600">
                  <span className="text-3xl">🖼</span>
                  <p className="text-xs">Paste an image URL to preview</p>
                </div>
              )
            )}
            {slideForm.mediaType === 'video' && (
              slideForm.mediaUrl ? (
                <video src={slideForm.mediaUrl} className="absolute inset-0 w-full h-full object-cover" controls muted playsInline />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600">
                  <span className="text-3xl">🎬</span>
                  <p className="text-xs">Paste a video URL (.mp4) to preview</p>
                </div>
              )
            )}
            {slideForm.mediaType === 'default' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #008751 0%, #1a1a2e 100%)' }}>
                <p className="text-white/60 text-sm font-bold">seshaa.</p>
                <p className="text-white/40 text-xs">Brand gradient — no media file needed</p>
              </div>
            )}
          </div>
          {/* Metadata strip — shown for youtube */}
          {slideForm.mediaType === 'youtube' && ytMeta && (
            <div className="mt-2 flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl p-2">
              {ytMeta.thumbnail && (
                <img src={ytMeta.thumbnail} alt="thumb" className="w-20 h-12 rounded-lg object-cover shrink-0 border border-gray-700" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{ytMeta.title}</p>
                <p className="text-xs text-gray-400 truncate">by {ytMeta.author}</p>
                <p className="text-[10px] text-green-400 mt-0.5">✓ Metadata loaded from YouTube</p>
              </div>
            </div>
          )}
          {slideForm.mediaType === 'youtube' && ytMetaLoading && (
            <p className="text-xs text-orange-400 mt-2 animate-pulse">⏳ Fetching video metadata…</p>
          )}
        </div>

        {slideForm.mediaType === 'youtube' && (
          <>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-xs font-semibold text-gray-400 block mb-1">YouTube URL or Video ID</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                placeholder="https://www.youtube.com/watch?v=VIDEO_ID  or  VIDEO_ID"
                value={slideForm.youtubeId || slideForm.mediaUrl}
                onChange={e => {
                  const val = e.target.value;
                  setSlideForm(f => ({ ...f, youtubeId: val, mediaUrl: val }));
                  fetchYoutubeMeta(val);
                }} />
              <p className="text-xs text-gray-600 mt-1">Metadata + preview auto-load above when URL is pasted</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">▶ Start (seconds)</label>
              <input type="number" min="0" step="1"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                placeholder="0"
                value={slideForm.startTime || ''}
                onChange={e => setSlideForm(f => ({ ...f, startTime: Number(e.target.value) || 0 }))} />
              <p className="text-xs text-gray-600 mt-1">Video in-point</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">⏹ End (seconds)</label>
              <input type="number" min="0" step="1"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                placeholder="0 = full video"
                value={slideForm.endTime || ''}
                onChange={e => setSlideForm(f => ({ ...f, endTime: Number(e.target.value) || 0 }))} />
              <p className="text-xs text-gray-600 mt-1">Video out-point (0 = play to end)</p>
            </div>
          </>
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
          <button onClick={() => { setShowSlideForm(false); setEditingSlide(null); setSlideMsg(''); setYtMeta(null); }}
            className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

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
            {t(`portal.${portal}`)} <ChevronRight size={11} className="rotate-90" />
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
                  {t(`portal.${p}`)}
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
          {TABS.map(tabItem => (
            <button key={tabItem.key} onClick={() => { setTab(tabItem.key); analyticsApi.event('admin_action', { target: `tab:${tabItem.key}`, path: '/admin' }).catch(() => {}); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors relative ${
                tab === tabItem.key
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}>
              {tabItem.icon} {tabItem.label}
              {tabItem.badge != null && tabItem.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {tabItem.badge > 9 ? '9+' : tabItem.badge}
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
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-white flex items-center gap-2">
                <List size={16} className="text-yellow-400" strokeWidth={1.5} />
                Pending Verification
                <span className="ml-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-black">{pendingListings.length}</span>
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              These listings were submitted but need review before going live. Check for missing info, edit if needed, then verify or reject.
            </p>
            {pendingListings.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <CheckCircle size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">All caught up — no pending listings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingListings.map(l => {
                  // ── "Why pending" analysis ──
                  const missing: string[] = [];
                  if (!l.phone && !l.email) missing.push('No contact info');
                  if (!l.category) missing.push('No category');
                  if (!l.description) missing.push('No description');
                  if (!l.address) missing.push('No address');

                  const isExpanded = expandedListingId === l.id;
                  const isEditing  = editingListingId === l.id;

                  return (
                    <div key={l.id} className="border border-gray-700 rounded-2xl bg-gray-950 overflow-hidden">
                      {/* ── Card header ── */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
                            <List size={16} strokeWidth={1.5} />
                          </div>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-bold text-white text-sm truncate">{l.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {l.city}, {l.country}{l.region ? ` · ${l.region}` : ''}
                                  {l.category ? ` · ${l.category}` : ''}
                                  {l.subcategory ? ` / ${l.subcategory}` : ''}
                                </p>
                              </div>
                              {/* Action buttons */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    setExpandedListingId(isExpanded ? null : l.id);
                                    if (isExpanded) setEditingListingId(null);
                                  }}
                                  className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                                  title="View details">
                                  <Info size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (isEditing) { setEditingListingId(null); }
                                    else { startEditListing(l); }
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-orange-500/30 text-orange-300' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                                  title={isEditing ? 'Close editor' : 'Edit before verifying'}>
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => verifyListing(l.id)}
                                  className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                  title="Verify listing">
                                  <CheckCircle size={14} strokeWidth={1.5} />
                                </button>
                                <button onClick={() => rejectListing(l.id)}
                                  className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                  title="Reject listing">
                                  <X size={14} strokeWidth={1.5} />
                                </button>
                              </div>
                            </div>

                            {/* Missing fields badges */}
                            {missing.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {missing.map(m => (
                                  <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-semibold">
                                    ⚠ {m}
                                  </span>
                                ))}
                              </div>
                            )}
                            {missing.length === 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold mt-2">
                                ✓ Looks complete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Expanded detail view ── */}
                      {isExpanded && !isEditing && (
                        <div className="border-t border-gray-800 px-4 pb-4 pt-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-2">📋 Full Details</p>
                          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                            {[
                              { label: 'Type', value: l.type },
                              { label: 'Category', value: l.category },
                              { label: 'Subcategory', value: l.subcategory },
                              { label: 'Phone', value: l.phone },
                              { label: 'Phone 2', value: l.phone2 },
                              { label: 'Email', value: l.email },
                              { label: 'Address', value: l.address },
                              { label: 'Region', value: l.region },
                              { label: 'Website', value: l.website },
                              { label: 'WhatsApp', value: l.whatsapp },
                              { label: 'Opening Hours', value: l.openingHours },
                              { label: 'Submitted', value: new Date(l.createdAt).toLocaleDateString() },
                            ].map(({ label, value }) => value ? (
                              <div key={label} className="flex gap-2">
                                <span className="text-gray-600 shrink-0 w-24">{label}</span>
                                <span className="text-gray-300 truncate">{value}</span>
                              </div>
                            ) : null)}
                          </div>
                          {l.description && (
                            <div className="mt-2 p-2.5 bg-gray-900 rounded-xl border border-gray-800">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">Description</p>
                              <p className="text-xs text-gray-400">{l.description}</p>
                            </div>
                          )}
                          <button onClick={() => startEditListing(l)}
                            className="mt-2 w-full py-2 text-xs font-semibold bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition-colors">
                            ✏ Edit this listing before verifying
                          </button>
                        </div>
                      )}

                      {/* ── Inline edit form ── */}
                      {isEditing && (
                        <div className="border-t border-orange-500/20 px-4 pb-4 pt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-3">✏ Edit Listing</p>
                          {listingEditMsg && (
                            <p className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{listingEditMsg}</p>
                          )}
                          <div className="grid sm:grid-cols-2 gap-3">
                            {([
                              { key: 'name',         label: 'Business Name *', placeholder: 'e.g. Mama Ngina Hotel' },
                              { key: 'category',     label: 'Category',        placeholder: 'e.g. Hotel' },
                              { key: 'subcategory',  label: 'Subcategory',     placeholder: 'e.g. Boutique' },
                              { key: 'phone',        label: 'Phone',           placeholder: '+256 700 000 000' },
                              { key: 'phone2',       label: 'Phone 2',         placeholder: '+256 700 000 001' },
                              { key: 'email',        label: 'Email',           placeholder: 'contact@business.com' },
                              { key: 'address',      label: 'Address',         placeholder: '12 Main St, CBD' },
                              { key: 'city',         label: 'City *',          placeholder: 'Kampala' },
                              { key: 'country',      label: 'Country *',       placeholder: 'Uganda' },
                              { key: 'region',       label: 'Region',          placeholder: 'Central' },
                              { key: 'website',      label: 'Website',         placeholder: 'https://...' },
                              { key: 'whatsapp',     label: 'WhatsApp',        placeholder: '+256 700 000 000' },
                              { key: 'openingHours', label: 'Opening Hours',   placeholder: 'Mon–Sat 8am–6pm' },
                            ] as { key: keyof PendingListing; label: string; placeholder: string }[]).map(f => (
                              <div key={f.key}>
                                <label className="text-xs font-semibold text-gray-400 block mb-1">{f.label}</label>
                                <input
                                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                                  placeholder={f.placeholder}
                                  value={(listingEditForm[f.key] as string) || ''}
                                  onChange={e => setListingEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                />
                              </div>
                            ))}
                            <div className="sm:col-span-2">
                              <label className="text-xs font-semibold text-gray-400 block mb-1">Description</label>
                              <textarea
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white resize-none"
                                rows={3}
                                placeholder="Describe the business…"
                                value={(listingEditForm.description as string) || ''}
                                onChange={e => setListingEditForm(prev => ({ ...prev, description: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button onClick={saveListingEdit} disabled={listingEditSaving}
                              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                              {listingEditSaving ? 'Saving…' : '✓ Save Changes'}
                            </button>
                            <button onClick={() => { verifyListing(l.id); }} disabled={listingEditSaving}
                              className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                              ✓ Save & Verify
                            </button>
                            <button onClick={() => { setEditingListingId(null); setListingEditMsg(''); }}
                              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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

              {/* ── Add Form (Add New only — edit opens inline in list item below) ── */}
              {showSlideForm && !editingSlide && renderSlideForm()}

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
                                <button
                                  onClick={() => {
                                    if (editingSlide?.id === slide.id) {
                                      setEditingSlide(null); setYtMeta(null); setSlideMsg('');
                                    } else {
                                      startEditSlide(slide);
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors ${editingSlide?.id === slide.id ? 'bg-orange-500/30 text-orange-300' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                                  title={editingSlide?.id === slide.id ? 'Close editor' : 'Edit slide'}>
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
                              <p className="mt-1.5 text-xs text-gray-600 italic border-l-2 border-gray-700 pl-2 truncate max-w-sm">{slide.notes}</p>
                            )}
                          </div>
                        </div>
                        {/* ── Inline edit form — accordion opens below this card ── */}
                        {editingSlide?.id === slide.id && (
                          <div className="mt-3 border-t border-orange-500/20 pt-3">
                            {renderSlideForm()}
                          </div>
                        )}
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
              </div>

              {/* ── Black-Owned Business Scraper ── */}
              <div className="mt-6 pt-5 border-t border-gray-800">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                    ✊🏾 Black-Owned Business Scraper
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">Diaspora</span>
                  </h4>
                  <button onClick={loadBlackOwnedInfo} className="text-xs text-gray-500 hover:text-gray-300 underline">
                    Check status
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Pulls Black-owned businesses from Yelp (<code className="text-orange-400">black_owned</code> attribute) + HTML directories across 80+ diaspora cities.
                  Covers US, UK, Canada, Caribbean, Brazil, Europe, UAE, and more. Tagged <code className="text-green-400">black-owned</code> + <code className="text-green-400">diaspora</code>.
                </p>

                {blackOwnedInfo && (
                  <div className="mb-3 p-3 bg-gray-950 rounded-xl border border-gray-800 text-xs">
                    <div className="flex flex-wrap gap-3 mb-2">
                      <span className="text-gray-400">Cities in scope: <strong className="text-white">{blackOwnedInfo.cities}</strong></span>
                      <span className={blackOwnedInfo.yelpKeyConfigured ? 'text-green-400' : 'text-yellow-400'}>
                        Yelp API: {blackOwnedInfo.yelpKeyConfigured ? '✓ Configured' : '⚠ Not set (add YELP_API_KEY to env)'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(blackOwnedInfo.byRegion).map(([region, count]) => (
                        <span key={region} className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md">{region}: {count} cities</span>
                      ))}
                    </div>
                  </div>
                )}

                {blackOwnedMsg && (
                  <div className={`mb-3 p-3 rounded-xl text-xs font-medium ${blackOwnedMsg.startsWith('✓') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {blackOwnedMsg}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-600 block mb-1">Source</label>
                    <select
                      value={blackOwnedSource}
                      onChange={e => setBlackOwnedSource(e.target.value as typeof blackOwnedSource)}
                      className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white">
                      <option value="all">All sources</option>
                      <option value="yelp">Yelp only</option>
                      <option value="html">HTML directories only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-600 block mb-1">Region</label>
                    <select
                      value={blackOwnedRegion}
                      onChange={e => setBlackOwnedRegion(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white">
                      <option value="all">All regions (full planet)</option>
                      <option value="us">United States</option>
                      <option value="uk">United Kingdom</option>
                      <option value="ca">Canada</option>
                      <option value="caribbean">Caribbean</option>
                      <option value="brazil">Brazil</option>
                      <option value="eu">Europe</option>
                      <option value="au">Australia</option>
                      <option value="asia">Asia / UAE</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={triggerBlackOwnedScrape} disabled={blackOwnedRunning}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">
                    {blackOwnedRunning
                      ? <><RefreshCw size={14} className="animate-spin" /> Running in background…</>
                      : <>✊🏾 Scrape Black-Owned Businesses</>}
                  </button>
                  <button onClick={() => adminApi.scrapeBlackOwned({ source: blackOwnedSource, region: blackOwnedRegion, dryRun: true }).then(r => setBlackOwnedMsg(`ℹ Dry run: ${r.data.message}`)).catch(() => setBlackOwnedMsg('✗ Failed'))}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition-colors">
                    Dry Run (count only)
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-2">
                  Runs in the background — check server logs for progress. Listings appear in the directory tagged <em>black-owned</em> + <em>diaspora</em> and need admin verification before going live.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800">
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
                  <span style={{
                    fontSize: `var(--logo-main-size, ${logoMainDesktop}rem)`,
                    fontWeight: 900, fontStyle: 'italic',
                    fontFamily: 'var(--logo-font-family, "Arial Black","Arial Bold",Arial,sans-serif)',
                    color: logoTitleColor || 'var(--cs, white)',
                    WebkitTextStroke: `var(--logo-stroke, ${logoStroke}px) rgba(0,0,0,0.2)`,
                    letterSpacing: '-0.02em', lineHeight: 1,
                  }}>seshaa</span>
                  <span style={{
                    fontSize: `var(--logo-main-size, ${logoMainDesktop}rem)`,
                    fontWeight: 700, fontStyle: 'italic',
                    fontFamily: 'var(--logo-font-family, "Arial Black","Arial Bold",Arial,sans-serif)',
                    color: logoSuffixColor || 'var(--ca, #FCD116)',
                    letterSpacing: '-0.01em', lineHeight: 1,
                  }}>.africa</span>
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

            {/* ── News Ticker Speed ─────────────────────────────────── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Activity size={16} className="text-yellow-400" strokeWidth={1.5} /> News Ticker Speed
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Controls how fast the LIVE headline ticker scrolls across the news page.
                Lower = faster. Change takes effect on next page load.
              </p>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Scroll duration</label>
                  <span className="text-xs text-gray-300 tabular-nums font-mono">
                    {tickerSpeed}s {tickerSpeed <= 30 ? '(very fast)' : tickerSpeed <= 60 ? '(fast)' : tickerSpeed <= 100 ? '(normal)' : '(slow)'}
                  </span>
                </div>
                <input type="range" min={20} max={200} step={5} value={tickerSpeed}
                  onChange={e => setTickerSpeed(parseInt(e.target.value))}
                  className="w-full accent-yellow-400 h-1.5 cursor-pointer" />
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>20s (fastest)</span><span>200s (slowest)</span>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => {
                      localStorage.setItem('seshaa_ticker_speed', String(tickerSpeed));
                      setCssFontMsg('✓ Ticker speed saved.');
                      setTimeout(() => setCssFontMsg(''), 2000);
                    }}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Save Speed
                  </button>
                  <button
                    onClick={() => { setTickerSpeed(60); localStorage.setItem('seshaa_ticker_speed', '60'); }}
                    className="text-xs text-gray-500 hover:text-gray-300 underline"
                  >
                    Reset to default (60s)
                  </button>
                  {cssFontMsg && <span className="text-xs text-yellow-300">{cssFontMsg}</span>}
                </div>
              </div>
            </div>

            {/* ── Title Font & Color picker ──────────────────────────── */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <Paintbrush size={16} className="text-violet-400" strokeWidth={1.5} /> Title Font &amp; Colors
              </h3>
              <p className="text-xs text-gray-500 mb-5">Override the &quot;seshaa&quot; and &quot;.country&quot; title text colors and typeface.</p>

              {/* Color row */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                {([
                  { label: '"seshaa" text color', value: logoTitleColor, set: setLogoTitleColor, lsKey: 'seshaa-logo-title-color', varName: '--logo-title-color', placeholder: 'e.g. #FFFFFF (leave blank = auto)' },
                  { label: '".country" text color', value: logoSuffixColor, set: setLogoSuffixColor, lsKey: 'seshaa-logo-suffix-color', varName: '--logo-suffix-color', placeholder: 'e.g. #FCD116 (leave blank = auto)' },
                ] as const).map(f => (
                  <label key={f.label} className="text-xs text-gray-400">
                    {f.label}
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="color"
                        value={f.value || '#ffffff'}
                        onChange={e => {
                          f.set(e.target.value);
                          applyCssStr(f.varName, e.target.value, f.lsKey);
                        }}
                        className="w-10 h-9 rounded border border-gray-700 bg-gray-950 p-1 cursor-pointer"
                      />
                      <input
                        value={f.value}
                        onChange={e => {
                          f.set(e.target.value);
                          applyCssStr(f.varName, e.target.value, f.lsKey);
                        }}
                        placeholder={f.placeholder}
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-2 py-2 text-xs text-gray-100 placeholder-gray-600"
                      />
                      {f.value && (
                        <button
                          onClick={() => { f.set(''); applyCssStr(f.varName, '', f.lsKey); }}
                          className="text-gray-500 hover:text-red-400 text-xs"
                          title="Clear (reset to auto)"
                        >✕</button>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Font picker */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 block mb-1.5">Typeface</label>
                <div className="grid grid-cols-1 gap-2">
                  {FONT_PRESETS.filter(p => p.id !== 'custom').map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyFontPreset(p.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-colors ${
                        logoFont === p.id
                          ? 'border-violet-500 bg-violet-950 text-white'
                          : 'border-gray-700 bg-gray-950 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <span
                        className="text-base"
                        style={{
                          fontFamily: p.family,
                          fontWeight: 900,
                          fontStyle: 'italic',
                        }}
                      >
                        seshaa.africa
                      </span>
                      <span className="text-[10px] text-gray-500 shrink-0 ml-3">{p.label}</span>
                    </button>
                  ))}

                  {/* Custom uploaded font row */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-colors ${
                    logoFont === 'custom'
                      ? 'border-violet-500 bg-violet-950'
                      : 'border-gray-700 bg-gray-950 hover:border-gray-500'
                  }`}>
                    <span className="text-xs text-gray-400">
                      {logoFont === 'custom' && customFontName
                        ? <span className="text-violet-300">✓ {customFontName}</span>
                        : 'Upload custom font (.ttf / .woff / .woff2 / .otf)'}
                    </span>
                    <label className="cursor-pointer ml-3 shrink-0">
                      <span className="text-xs px-2.5 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 text-white font-semibold transition-colors">
                        {logoFont === 'custom' ? 'Replace' : 'Upload'}
                      </span>
                      <input
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFontUpload(f); }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCssFontMsg('✓ Font & color settings saved.');
                    setTimeout(() => setCssFontMsg(''), 2500);
                  }}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setLogoTitleColor('');   applyCssStr('--logo-title-color',  '', 'seshaa-logo-title-color');
                    setLogoSuffixColor('');  applyCssStr('--logo-suffix-color', '', 'seshaa-logo-suffix-color');
                    applyFontPreset('default');
                    setCustomFontName('');
                    localStorage.removeItem('seshaa-logo-font-name');
                    localStorage.removeItem('seshaa-logo-font-data');
                    const styleEl = document.getElementById('seshaa-custom-font-face');
                    if (styleEl) styleEl.textContent = '';
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Reset to defaults
                </button>
                {cssFontMsg && <span className="text-xs text-violet-300">{cssFontMsg}</span>}
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

        {/* ── Behaviour Analytics tab ──────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="p-6 space-y-8 w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-purple-400" /> User Behaviour Analytics
              </h2>
              <button
                onClick={() => {
                  setBehaviourStats(null); setPrognosisData(null); setSessionData(null);
                  setAnalyticsLoading(true);
                  Promise.all([analyticsApi.admin(), analyticsApi.prognosis(), analyticsApi.sessions()])
                    .then(([s, p, se]) => { setBehaviourStats(s.data as BehaviourStats); setPrognosisData(p.data as PrognosisData); setSessionData(se.data as SessionData); })
                    .catch(() => {}).finally(() => setAnalyticsLoading(false));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors">
                <RefreshCw size={13} className={analyticsLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {analyticsLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-t-transparent border-purple-500 rounded-full animate-spin" />
              </div>
            )}

            {!analyticsLoading && !behaviourStats && (
              <div className="text-center py-20 text-gray-600">
                <Activity size={36} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
                <p className="text-sm font-medium">No analytics data yet</p>
                <p className="text-xs mt-1">Events will appear here once users start browsing Seshaa.</p>
                <p className="text-xs mt-1 text-gray-700">The <code className="text-purple-500">UserEvent</code> table is now created and ready.</p>
              </div>
            )}

            {!analyticsLoading && behaviourStats && (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'All-time events',  value: behaviourStats.totals.allTime.toLocaleString(),     color: 'text-purple-400' },
                    { label: 'Pageviews (7d)',   value: behaviourStats.totals.pageviews7d.toLocaleString(),  color: 'text-blue-400'   },
                    { label: 'Searches (7d)',    value: behaviourStats.totals.searches7d.toLocaleString(),   color: 'text-cyan-400'   },
                  ].map(k => (
                    <div key={k.label} className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/40">
                      <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                      <p className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Events per day bar chart */}
                <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/40">
                  <p className="text-sm font-semibold text-white mb-4">Events per day (last 30 days)</p>
                  {behaviourStats.eventsPerDay.length === 0
                    ? <p className="text-xs text-gray-500 text-center py-6">No events yet</p>
                    : (() => {
                        const maxVal = Math.max(...behaviourStats.eventsPerDay.map(d => parseInt(d.count)), 1);
                        return (
                          <div className="flex items-end gap-0.5 h-28 overflow-hidden">
                            {behaviourStats.eventsPerDay.map(d => {
                              const pct = Math.round((parseInt(d.count) / maxVal) * 100);
                              return (
                                <div key={d.day} title={`${d.day}: ${d.count}`}
                                  className="flex-1 min-w-0 rounded-t group relative cursor-default transition-all duration-300"
                                  style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: 'rgb(168 85 247 / 0.7)' }}>
                                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white bg-gray-900 px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                                    {d.count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                  }
                </div>

                {/* 2-col grid: top pages + searches */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/40">
                    <p className="text-sm font-semibold text-white mb-3">Top Pages (30d)</p>
                    {behaviourStats.topPages.length === 0
                      ? <p className="text-xs text-gray-500">No data yet</p>
                      : (() => {
                          const max = Math.max(...behaviourStats.topPages.map(p => parseInt(p.count)), 1);
                          return behaviourStats.topPages.map(p => (
                            <div key={p.path} className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-300 truncate flex-1 min-w-0 font-mono">{p.path || '/'}</span>
                              <div className="w-24 h-2 bg-gray-700 rounded-full shrink-0">
                                <div className="h-2 rounded-full bg-purple-500 transition-all" style={{ width: `${Math.round(parseInt(p.count)/max*100)}%` }} />
                              </div>
                              <span className="text-xs tabular-nums text-gray-400 w-8 text-right">{p.count}</span>
                            </div>
                          ));
                        })()
                    }
                  </div>
                  <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/40">
                    <p className="text-sm font-semibold text-white mb-3">Top Searches (30d)</p>
                    {behaviourStats.topSearches.length === 0
                      ? <p className="text-xs text-gray-500">No data yet</p>
                      : (() => {
                          const max = Math.max(...behaviourStats.topSearches.map(s => parseInt(s.count)), 1);
                          return behaviourStats.topSearches.map(s => (
                            <div key={s.value} className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-300 truncate flex-1 min-w-0">{s.value}</span>
                              <div className="w-24 h-2 bg-gray-700 rounded-full shrink-0">
                                <div className="h-2 rounded-full bg-cyan-500 transition-all" style={{ width: `${Math.round(parseInt(s.count)/max*100)}%` }} />
                              </div>
                              <span className="text-xs tabular-nums text-gray-400 w-8 text-right">{s.count}</span>
                            </div>
                          ));
                        })()
                    }
                  </div>
                </div>

                {/* 2-col: device + country */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/40">
                    <p className="text-sm font-semibold text-white mb-3">Device Breakdown (30d)</p>
                    {behaviourStats.deviceBreakdown.map(d => {
                      const icons: Record<string, string> = { mobile: '📱', tablet: '💻', desktop: '🖥️' };
                      return (
                        <div key={d.device} className="flex items-center gap-2 mb-2">
                          <span className="text-base">{icons[d.device] ?? '❓'}</span>
                          <span className="text-xs text-gray-300 capitalize flex-1">{d.device ?? 'unknown'}</span>
                          <span className="text-sm font-semibold text-white tabular-nums">{parseInt(d.count).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/40">
                    <p className="text-sm font-semibold text-white mb-3">Top Countries (30d)</p>
                    {behaviourStats.countryBreakdown.length === 0
                      ? <p className="text-xs text-gray-500">No data yet</p>
                      : (() => {
                          const max = Math.max(...behaviourStats.countryBreakdown.map(c => parseInt(c.count)), 1);
                          return behaviourStats.countryBreakdown.map(c => (
                            <div key={c.country} className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-300 uppercase w-6 shrink-0 font-mono">{c.country}</span>
                              <div className="flex-1 h-2 bg-gray-700 rounded-full">
                                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.round(parseInt(c.count)/max*100)}%` }} />
                              </div>
                              <span className="text-xs tabular-nums text-gray-400 w-10 text-right">{parseInt(c.count).toLocaleString()}</span>
                            </div>
                          ));
                        })()
                    }
                  </div>
                </div>

                {/* Active hours heatmap */}
                <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/40">
                  <p className="text-sm font-semibold text-white mb-4">Active Hours UTC (7d)</p>
                  <div className="flex items-end gap-1 h-20">
                    {Array.from({ length: 24 }, (_, h) => {
                      const entry = behaviourStats.activeHours.find(e => e.hour === h);
                      const val   = entry ? parseInt(String(entry.count)) : 0;
                      const maxH  = Math.max(...behaviourStats.activeHours.map(e => parseInt(String(e.count))), 1);
                      const pct   = Math.round((val / maxH) * 100);
                      return (
                        <div key={h} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t transition-all"
                            style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: `rgba(99,102,241,${0.2 + pct/130})` }}
                            title={`${h}:00 — ${val} events`} />
                          {h % 6 === 0 && <span className="text-[9px] text-gray-500 tabular-nums">{h}h</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Admin Behaviour Section ── */}
                {((behaviourStats.adminActions?.length ?? 0) > 0 || (behaviourStats.adminTabVisits?.length ?? 0) > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-2xl p-5 border border-purple-500/20">
                      <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                        <Shield size={14} className="text-red-400" /> Admin Tab Usage (30d)
                      </p>
                      <p className="text-xs text-gray-500 mb-3">Which tabs you visit most</p>
                      {(behaviourStats.adminTabVisits ?? []).map(a => (
                        <div key={a.target} className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-gray-300 capitalize flex-1 truncate">{a.target.replace('tab:', '')}</span>
                          <span className="text-xs tabular-nums text-purple-400 font-semibold">{a.count}×</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-800/50 rounded-2xl p-5 border border-purple-500/20">
                      <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                        <Activity size={14} className="text-purple-400" /> All Admin Actions (30d)
                      </p>
                      <p className="text-xs text-gray-500 mb-3">Every tracked admin button press</p>
                      {(behaviourStats.adminActions ?? []).slice(0, 10).map(a => (
                        <div key={a.target} className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-gray-300 font-mono flex-1 truncate">{a.target}</span>
                          <span className="text-xs tabular-nums text-purple-400 font-semibold">{a.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Prognosis / Forecast ─────────────────────────────────── */}
            {!analyticsLoading && prognosisData && (
              <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/40">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-white">14-day Forecast</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    prognosisData.trend === 'growing'  ? 'bg-emerald-500/20 text-emerald-400' :
                    prognosisData.trend === 'declining' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-600/40 text-gray-400'
                  }`}>
                    {prognosisData.trend === 'growing' ? '📈' : prognosisData.trend === 'declining' ? '📉' : '➡️'} {prognosisData.trend} (slope {prognosisData.slope > 0 ? '+' : ''}{prognosisData.slope})
                  </span>
                </div>
                <div className="flex items-end gap-0.5 h-24">
                  {[...prognosisData.daily.slice(-14).map(d => ({ label: d.day.slice(5), val: parseInt(d.count), forecast: false })),
                    ...prognosisData.forecast.map(f => ({ label: `+${f.day}`, val: f.predicted, forecast: true }))
                  ].map((item, i) => {
                    const allVals = [
                      ...prognosisData.daily.slice(-14).map(d => parseInt(d.count)),
                      ...prognosisData.forecast.map(f => f.predicted),
                    ];
                    const maxV = Math.max(...allVals, 1);
                    const pct  = Math.round((item.val / maxV) * 100);
                    return (
                      <div key={i} title={`${item.label}: ${item.val}`}
                        className="flex-1 rounded-t transition-all"
                        style={{
                          height: `${Math.max(pct, 2)}%`,
                          backgroundColor: item.forecast ? 'rgba(251,191,36,0.55)' : 'rgba(99,102,241,0.7)',
                        }} />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>← 14 days history</span>
                  <span className="text-yellow-500/80">14-day forecast →</span>
                </div>
              </div>
            )}

            {/* ── Session log ────────────────────────────────────────────── */}
            {!analyticsLoading && sessionData && sessionData.sessions.length > 0 && (
              <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/40">
                <p className="text-sm font-semibold text-white mb-4">Recent Sessions (7d)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-gray-300">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-700">
                        <th className="text-left pb-2 pr-3">User</th>
                        <th className="text-right pb-2 pr-3">Events</th>
                        <th className="text-right pb-2 pr-3">Duration</th>
                        <th className="text-right pb-2">Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionData.sessions.slice(0, 20).map((s, i) => (
                        <tr key={i} className="border-b border-gray-800/60 hover:bg-gray-700/20">
                          <td className="py-1.5 pr-3 truncate max-w-[120px]">{s.name || 'guest'}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{s.eventCount}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">
                            {s.durationSeconds ? `${Math.round(parseFloat(String(s.durationSeconds))/60)}m` : '—'}
                          </td>
                          <td className="py-1.5 text-right text-gray-500">
                            {new Date(s.startedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Admin WPM log ──────────────────────────────────────────── */}
            {!analyticsLoading && sessionData && sessionData.keystrokeSessions.length > 0 && (
              <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/40">
                <p className="text-sm font-semibold text-white mb-4">Admin Keystroke WPM Log (7d)</p>
                <div className="flex items-end gap-1 h-20 mb-2">
                  {(() => {
                    const wpmVals = sessionData.keystrokeSessions.slice(0, 50).map(k => parseInt(String(k.wpm)) || 0);
                    const maxW = Math.max(...wpmVals, 1);
                    return wpmVals.map((w, i) => (
                      <div key={i} className="flex-1 rounded-t transition-all"
                        style={{ height: `${Math.round(w/maxW*100)}%`, backgroundColor: 'rgba(251,191,36,0.7)' }}
                        title={`${w} WPM — ${sessionData.keystrokeSessions[i]?.name}`} />
                    ));
                  })()}
                </div>
                <p className="text-xs text-gray-500">Avg WPM: {
                  Math.round(sessionData.keystrokeSessions.slice(0, 50).reduce((s, k) => s + (parseInt(String(k.wpm)) || 0), 0)
                    / Math.max(sessionData.keystrokeSessions.slice(0, 50).length, 1))
                } · Sampled every 10 seconds</p>
              </div>
            )}

            {!analyticsLoading && !behaviourStats && (
              <p className="text-center text-gray-500 py-10 text-sm">No behaviour data collected yet — events will appear here once users interact with the app.</p>
            )}

            {/* Refresh button */}
            <div className="flex justify-end">
              <button
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-xl px-4 py-2 hover:border-gray-600 transition-colors"
                onClick={() => {
                  setBehaviourStats(null);
                  setPrognosisData(null);
                  setSessionData(null);
                  setAnalyticsLoading(true);
                  Promise.all([analyticsApi.admin(), analyticsApi.prognosis(), analyticsApi.sessions()])
                    .then(([s, p, se]) => {
                      setBehaviourStats(s.data as BehaviourStats);
                      setPrognosisData(p.data as PrognosisData);
                      setSessionData(se.data as SessionData);
                    }).catch(() => {}).finally(() => setAnalyticsLoading(false));
                }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>
        )}
        {tab === 'banking' && (
          <div className="p-6 space-y-10 w-full">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCard size={20} className="text-emerald-400" /> Seshaa Financial Products
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Roadmap to launch <span className="text-emerald-300 font-semibold">seshaa.wallet</span>, <span className="text-emerald-300 font-semibold">seshaa.pay</span> and <span className="text-emerald-300 font-semibold">seshaa.bank</span> — from first API integration to full banking licence.
                </p>
              </div>
              <a href="https://www.seshaa.africa" target="_blank" rel="noreferrer"
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors">
                seshaa.bank ↗
              </a>
            </div>

            {/* ── Phase roadmap ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">3-Phase Launch Roadmap</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    phase: '01', title: 'Seshaa Wallet', timeframe: '0 – 6 months',
                    color: 'border-emerald-500/40 bg-emerald-500/5',
                    badge: 'Phase 1 · Now',
                    badgeColor: 'bg-emerald-500/20 text-emerald-300',
                    items: [
                      'Integrate Paystack / Flutterwave payments',
                      'In-app wallet via BaaS partner (Sudo Africa / Bloc)',
                      'Virtual account per user (receive transfers)',
                      'KYC flow (BVN / NIN for Nigeria, National ID)',
                      'Wallet top-up (card, bank transfer, mobile money)',
                      'P2P transfer between Seshaa users',
                      'Pay for listings, bookings & ads with wallet',
                    ],
                  },
                  {
                    phase: '02', title: 'Seshaa Pay', timeframe: '6 – 18 months',
                    color: 'border-blue-500/40 bg-blue-500/5',
                    badge: 'Phase 2 · Next',
                    badgeColor: 'bg-blue-500/20 text-blue-300',
                    items: [
                      'Merchant payment acceptance (QR / link)',
                      'Connect M-Pesa, MTN MoMo, Airtel Money',
                      'Multi-currency (NGN, KES, GHS, XOF, ZAR)',
                      'Payouts to ambassadors & sales reps',
                      'Micro-loans to verified businesses',
                      'Diaspora remittance product',
                      'Apply for PSP licences (NG, KE, GH)',
                    ],
                  },
                  {
                    phase: '03', title: 'Seshaa Bank', timeframe: '18 – 36 months',
                    color: 'border-purple-500/40 bg-purple-500/5',
                    badge: 'Phase 3 · Future',
                    badgeColor: 'bg-purple-500/20 text-purple-300',
                    items: [
                      'Apply for e-money / digital bank licence',
                      'Launch seshaa.bank domain & brand',
                      'Interest-bearing savings accounts',
                      'BNPL (Buy Now Pay Later) for bookings',
                      'Business banking for listed companies',
                      'African cross-border payments network',
                      'Pan-African card (Visa/Mastercard co-brand)',
                    ],
                  },
                ].map(p => (
                  <div key={p.phase} className={`rounded-2xl border p-5 ${p.color}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl font-black text-white/10">{p.phase}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.badgeColor}`}>{p.badge}</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-0.5">{p.title}</h4>
                    <p className="text-xs text-gray-500 mb-4">{p.timeframe}</p>
                    <ul className="space-y-2">
                      {p.items.map(item => (
                        <li key={item} className="flex items-start gap-2 text-xs text-gray-300">
                          <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* ── BaaS Partners (start here — no licence needed) ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Step 1 — Banking as a Service (BaaS) Partners
              </h3>
              <p className="text-xs text-gray-500 mb-4">Launch Seshaa Wallet without a banking licence — ride on an existing licensed infrastructure partner.</p>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  {
                    name: 'Sudo Africa',       flag: '🇳🇬', coverage: 'Nigeria',
                    what: 'Virtual bank accounts, virtual & physical cards (Visa/Mastercard), multi-currency wallets. Best for: NGN wallet + card issuing.',
                    docs: 'https://docs.sudo.africa',
                    signup: 'https://app.sudo.africa/register',
                    tag: '⭐ Recommended start',
                    tagColor: 'bg-emerald-500/20 text-emerald-300',
                  },
                  {
                    name: 'Bloc (Blochq)',     flag: '🇳🇬', coverage: 'Nigeria',
                    what: 'Core banking infrastructure, virtual accounts, KYC, compliance, cards. Used by fintechs to launch in days.',
                    docs: 'https://docs.blochq.io',
                    signup: 'https://blochq.io/contact',
                    tag: 'Full-stack BaaS',
                    tagColor: 'bg-blue-500/20 text-blue-300',
                  },
                  {
                    name: 'OnePipe',           flag: '🇳🇬', coverage: 'Nigeria',
                    what: 'API aggregator — access multiple banks + fintech APIs in one integration. Accounts, transfers, bill payments.',
                    docs: 'https://docs.onepipe.io',
                    signup: 'https://onepipe.io',
                    tag: 'Multi-bank aggregator',
                    tagColor: 'bg-orange-500/20 text-orange-300',
                  },
                  {
                    name: 'Stitch Money',      flag: '🇿🇦', coverage: 'South Africa, Nigeria',
                    what: 'Open banking — link bank accounts, instant bank payments (no card needed), account verification.',
                    docs: 'https://docs.stitch.money',
                    signup: 'https://stitch.money/contact',
                    tag: 'Open banking',
                    tagColor: 'bg-purple-500/20 text-purple-300',
                  },
                  {
                    name: 'Mono',              flag: '🇳🇬🇬🇭🇰🇪', coverage: 'Nigeria, Ghana, Kenya',
                    what: 'Open banking — connect user bank accounts, read transactions, verify identity via bank data.',
                    docs: 'https://docs.mono.co',
                    signup: 'https://app.mono.co/signup',
                    tag: 'Open banking + KYC',
                    tagColor: 'bg-cyan-500/20 text-cyan-300',
                  },
                  {
                    name: 'Bankly',            flag: '🇳🇬', coverage: 'Nigeria',
                    what: 'Agent banking infrastructure, wallet management, USSD APIs. Good for offline/rural reach.',
                    docs: 'https://developer.bankly.ng',
                    signup: 'https://bankly.ng',
                    tag: 'Agent banking',
                    tagColor: 'bg-yellow-500/20 text-yellow-300',
                  },
                ].map(p => (
                  <div key={p.name} className="rounded-xl border border-gray-700/40 bg-gray-800/30 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{p.flag} {p.name}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${p.tagColor}`}>{p.tag}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{p.coverage}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-3 leading-relaxed">{p.what}</p>
                    <div className="flex gap-2">
                      <a href={p.docs} target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700/60 text-gray-300 hover:bg-gray-700 transition-colors border border-gray-600/40">
                        📄 Docs
                      </a>
                      <a href={p.signup} target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors border border-emerald-500/30">
                        → Get started
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Mobile Money APIs ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Step 2 — Mobile Money API Integrations
              </h3>
              <p className="text-xs text-gray-500 mb-4">Connect the largest mobile money networks in Africa — covering 700M+ mobile money accounts across 54 countries.</p>
              <div className="space-y-2">
                {[
                  {
                    name: 'M-Pesa Daraja API', flag: '🇰🇪🇹🇿🇲🇿🇬🇭🇱🇸🇪🇬🇨🇩',
                    coverage: 'Kenya, Tanzania, Mozambique, Ghana, Lesotho, Egypt, DRC',
                    users: '51M+', type: 'STK Push, C2B, B2C, Reversal, Balance',
                    docs: 'https://developer.safaricom.co.ke',
                    signup: 'https://developer.safaricom.co.ke/MyApps',
                    pricing: 'Transaction % — varies by market',
                    note: 'Largest single mobile money network. Sandbox free, instant access.',
                    color: 'border-green-700/40',
                  },
                  {
                    name: 'MTN MoMo API', flag: '🇳🇬🇬🇭🇨🇮🇨🇲🇺🇬🇷🇼🇿🇲🇧🇯🇬🇳',
                    coverage: '17 African countries',
                    users: '290M+', type: 'Collections, Disbursements, Remittances, Sandbox',
                    docs: 'https://momodeveloper.mtn.com',
                    signup: 'https://momodeveloper.mtn.com/signup',
                    pricing: 'Free sandbox · Production: revenue share',
                    note: 'Largest mobile money network by country coverage. Sandbox: instant signup.',
                    color: 'border-yellow-700/40',
                  },
                  {
                    name: 'Airtel Money API', flag: '🇳🇬🇰🇪🇹🇿🇺🇬🇷🇼🇿🇲🇿🇼🇲🇼🇲🇬',
                    coverage: '14 African countries',
                    users: '35M+', type: 'Collections, Disbursements, Airtime, Balance',
                    docs: 'https://developers.airtel.africa',
                    signup: 'https://developers.airtel.africa/user/register',
                    pricing: 'Per transaction',
                    note: 'Strong coverage across East & Central Africa.',
                    color: 'border-red-700/40',
                  },
                  {
                    name: 'Orange Money API', flag: '🇸🇳🇨🇮🇲🇱🇧🇫🇨🇲🇲🇷🇲🇩🇬🇳',
                    coverage: 'Senegal, Côte d\'Ivoire, Mali, Burkina Faso, Cameroon + more',
                    users: '20M+', type: 'Push/pull payments, P2P, bill pay, merchant',
                    docs: 'https://developer.orange.com/apis/om-webpay',
                    signup: 'https://developer.orange.com/user/register',
                    pricing: 'Revenue share model',
                    note: 'Essential for West Africa francophone markets.',
                    color: 'border-orange-700/40',
                  },
                  {
                    name: 'Wave API', flag: '🇸🇳🇲🇱🇨🇮🇧🇫🇺🇬',
                    coverage: 'Senegal, Mali, Côte d\'Ivoire, Burkina Faso, Uganda',
                    users: '10M+', type: 'Merchant payments, disbursements',
                    docs: 'https://wave.com/en/api',
                    signup: 'https://wave.com/en/business',
                    pricing: '1% per transaction',
                    note: 'Zero-fee model disrupting West Africa. Fastest growing mobile money.',
                    color: 'border-blue-700/40',
                  },
                ].map(p => (
                  <div key={p.name} className={`rounded-xl border ${p.color} bg-gray-800/20 p-4`}>
                    <div className="flex flex-wrap items-start gap-3 justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-white text-sm">{p.name}</span>
                          <span className="text-base leading-none" title={p.coverage}>{p.flag}</span>
                          <span className="text-[10px] text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full">{p.users} users</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mb-1">{p.coverage}</p>
                        <p className="text-xs text-gray-400 mb-1"><span className="text-gray-500">API: </span>{p.type}</p>
                        <p className="text-xs text-emerald-400/70">{p.note}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <span className="text-[10px] text-gray-500">{p.pricing}</span>
                        <div className="flex gap-2">
                          <a href={p.docs} target="_blank" rel="noreferrer"
                            className="text-xs px-2.5 py-1 rounded-lg bg-gray-700/60 text-gray-300 hover:bg-gray-700 transition-colors border border-gray-600/40">
                            📄 Docs
                          </a>
                          <a href={p.signup} target="_blank" rel="noreferrer"
                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors border border-emerald-500/30">
                            → Sign up
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Payment Gateways ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Step 3 — Payment Gateway Integrations
              </h3>
              <p className="text-xs text-gray-500 mb-4">Accept card payments, bank transfers and mobile money through a single unified API — these gateways aggregate multiple payment methods.</p>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  {
                    name: 'Paystack',    flag: '🇳🇬🇬🇭🇰🇪🇿🇦', coverage: 'Nigeria, Ghana, Kenya, South Africa',
                    what: 'Cards, bank transfer, USSD, QR, mobile money. Owned by Stripe. Best dev experience on the continent.',
                    pricing: '1.5% + ₦100 (NG) · 1.95% (GH/KE/ZA)',
                    docs: 'https://paystack.com/docs',
                    signup: 'https://dashboard.paystack.com/#/signup',
                    tag: '⭐ Start here', tagColor: 'bg-emerald-500/20 text-emerald-300',
                  },
                  {
                    name: 'Flutterwave', flag: '🇳🇬🇬🇭🇰🇪🇿🇦🇺🇬🇹🇿🇷🇼🇿🇲', coverage: '34 African countries',
                    what: 'Cards, mobile money, bank transfers, USSD, POS, virtual accounts, multi-currency. Best cross-border coverage.',
                    pricing: '1.4% cards · 1% mobile money',
                    docs: 'https://developer.flutterwave.com',
                    signup: 'https://app.flutterwave.com/register',
                    tag: 'Best coverage', tagColor: 'bg-blue-500/20 text-blue-300',
                  },
                  {
                    name: 'Interswitch', flag: '🇳🇬🇰🇪🇺🇬🇹🇿', coverage: 'Nigeria, East Africa',
                    what: 'Nigeria\'s oldest payment network. Verve cards, Quickteller, ISW Switch (ATM network), Webpay online.',
                    pricing: 'Enterprise pricing',
                    docs: 'https://developer.interswitchgroup.com',
                    signup: 'https://developer.interswitchgroup.com/docs/register',
                    tag: 'Nigeria backbone', tagColor: 'bg-orange-500/20 text-orange-300',
                  },
                  {
                    name: 'Cellulant Tingg', flag: '🇳🇬🇰🇪🇬🇭🇿🇦🇹🇿🇺🇬🇷🇼', coverage: '18 African countries',
                    what: 'Unified payment API across 18 markets — mobile money, cards, bank transfers, USSD all in one.',
                    pricing: 'Per transaction (custom)',
                    docs: 'https://developer.cellulant.io',
                    signup: 'https://www.tingg.africa/contact',
                    tag: '18 countries', tagColor: 'bg-purple-500/20 text-purple-300',
                  },
                  {
                    name: 'DPO Group', flag: '🇳🇬🇰🇪🇿🇦🇬🇭🇹🇿🇺🇬🇿🇲🇲🇼', coverage: '19 African countries',
                    what: 'Online payments across 19 African markets. Strong in East + Southern Africa. Owned by Network International.',
                    pricing: '3.8% per transaction (varies)',
                    docs: 'https://docs.dpogroup.com',
                    signup: 'https://www.dpogroup.com/register',
                    tag: 'East + Southern Africa', tagColor: 'bg-cyan-500/20 text-cyan-300',
                  },
                  {
                    name: 'Onafriq (MFS Africa)', flag: '🌍', coverage: '35+ countries, 500+ M-Money wallets',
                    what: 'The largest mobile money hub in Africa — connect once, reach 500M+ mobile money accounts across 35 countries.',
                    pricing: 'Enterprise / revenue share',
                    docs: 'https://www.onafriq.com/developers',
                    signup: 'https://www.onafriq.com/contact-us',
                    tag: 'Pan-Africa hub', tagColor: 'bg-amber-500/20 text-amber-300',
                  },
                ].map(p => (
                  <div key={p.name} className="rounded-xl border border-gray-700/40 bg-gray-800/30 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{p.flag} {p.name}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${p.tagColor}`}>{p.tag}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{p.coverage}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-1 leading-relaxed">{p.what}</p>
                    <p className="text-[10px] text-emerald-400/70 mb-3">💰 {p.pricing}</p>
                    <div className="flex gap-2">
                      <a href={p.docs} target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700/60 text-gray-300 hover:bg-gray-700 transition-colors border border-gray-600/40">
                        📄 Docs
                      </a>
                      <a href={p.signup} target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors border border-emerald-500/30">
                        → Get access
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Regulatory Checklist ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Step 4 — Regulatory Licences by Market
              </h3>
              <p className="text-xs text-gray-500 mb-4">Required licences to legally operate a payment service, e-wallet or digital bank in each major African market. BaaS partner handles this for Phase 1.</p>
              <div className="space-y-2">
                {[
                  {
                    country: '🇳🇬 Nigeria', regulator: 'CBN — Central Bank of Nigeria',
                    licence: 'Payment Service Provider (PSP) Licence — Category 3 (Super Agent) or Category 1 (PSSP)',
                    requirement: 'Min ₦100M capital (PSSP) · ₦250M (Mobile Money)',
                    timeline: '6–12 months',
                    link: 'https://www.cbn.gov.ng/supervision/licensing.asp',
                    priority: 'high',
                  },
                  {
                    country: '🇰🇪 Kenya', regulator: 'CBK — Central Bank of Kenya',
                    licence: 'Payment Service Provider Licence (National Payment System Act)',
                    requirement: 'Min KES 20M capital · CBK approval required',
                    timeline: '3–6 months',
                    link: 'https://www.centralbank.go.ke/payment-systems/licensing/',
                    priority: 'high',
                  },
                  {
                    country: '🇬🇭 Ghana', regulator: 'BoG — Bank of Ghana',
                    licence: 'Payment Service Provider Licence (Tier 2 or 3)',
                    requirement: 'Min GHS 500K capital (Tier 2)',
                    timeline: '3–9 months',
                    link: 'https://www.bog.gov.gh/financial-stability/payment-systems/',
                    priority: 'high',
                  },
                  {
                    country: '🇿🇦 South Africa', regulator: 'SARB — South African Reserve Bank',
                    licence: 'National Payment System (NPS) Operator Registration',
                    requirement: 'Registration under PASA (Payment Association of SA)',
                    timeline: '6–18 months',
                    link: 'https://www.resbank.co.za/en/home/what-we-do/payments/payment-system-oversight',
                    priority: 'medium',
                  },
                  {
                    country: '🇸🇳 Senegal / West Africa (UEMOA)', regulator: 'BCEAO — Central Bank of West African States',
                    licence: 'E-Money Issuer Authorization (covers 8 WAEMU countries)',
                    requirement: 'Capital CFA 300M · local entity required',
                    timeline: '6–12 months',
                    link: 'https://www.bceao.int/en/content/electronic-money',
                    priority: 'medium',
                  },
                  {
                    country: '🇹🇿 Tanzania', regulator: 'BoT — Bank of Tanzania',
                    licence: 'Payment System Licence (Payment Systems (Electronic Money) Regulations)',
                    requirement: 'TZS 500M capital',
                    timeline: '3–6 months',
                    link: 'https://www.bot.go.tz/PaymentSystems/Licensing',
                    priority: 'medium',
                  },
                  {
                    country: '🇷🇼 Rwanda', regulator: 'BNR — National Bank of Rwanda',
                    licence: 'Payment Service Provider Licence',
                    requirement: 'RWF 50M capital · pro-innovation regulator',
                    timeline: '2–4 months (fast-track available)',
                    link: 'https://www.bnr.rw/financial-system/payment-systems/',
                    priority: 'medium',
                  },
                ].map(r => (
                  <div key={r.country} className={`rounded-xl border p-4 ${r.priority === 'high' ? 'border-amber-700/40 bg-amber-500/5' : 'border-gray-700/40 bg-gray-800/20'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-white text-sm">{r.country}</span>
                          {r.priority === 'high' && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-semibold">Priority market</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 mb-1">{r.regulator}</p>
                        <p className="text-xs text-gray-300 mb-1">{r.licence}</p>
                        <p className="text-xs text-gray-500">💰 {r.requirement}</p>
                        <p className="text-xs text-blue-400/70">⏱ {r.timeline}</p>
                      </div>
                      <a href={r.link} target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700/60 text-gray-300 hover:bg-gray-700 transition-colors border border-gray-600/40 shrink-0">
                        📋 Apply ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Phase 1 launch checklist ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Phase 1 Launch Checklist — Seshaa Wallet
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    group: '🔧 Technical', color: 'border-blue-700/40',
                    items: [
                      { done: false, text: 'Sign up for Paystack — get test API keys' },
                      { done: false, text: 'Sign up for Sudo Africa BaaS account' },
                      { done: false, text: 'Build wallet balance model in DB (User → Wallet → Transaction)' },
                      { done: false, text: 'Add wallet UI to user profile page' },
                      { done: false, text: 'Implement top-up flow (card → wallet)' },
                      { done: false, text: 'Implement P2P transfer between users' },
                      { done: false, text: 'Pay for listings/bookings with wallet balance' },
                    ],
                  },
                  {
                    group: '🪪 KYC & Compliance', color: 'border-amber-700/40',
                    items: [
                      { done: false, text: 'Integrate BVN verification (for Nigeria users)' },
                      { done: false, text: 'NIN lookup (NIMC API via Dojah or Smile ID)' },
                      { done: false, text: 'Ghana Card / National ID for Ghana users' },
                      { done: false, text: 'Set daily/monthly transaction limits for unverified users' },
                      { done: false, text: 'Build KYC status into user profiles' },
                      { done: false, text: 'Privacy policy update for financial data' },
                      { done: false, text: 'Terms of service for wallet product' },
                    ],
                  },
                  {
                    group: '📱 Mobile Money Connect', color: 'border-green-700/40',
                    items: [
                      { done: false, text: 'Register on MTN MoMo Developer Portal' },
                      { done: false, text: 'Register on M-Pesa Daraja API (for KE/TZ)' },
                      { done: false, text: 'Register on Airtel Money Developer Portal' },
                      { done: false, text: 'Test Collections (receive money from phone)' },
                      { done: false, text: 'Test Disbursements (send to phone wallet)' },
                      { done: false, text: 'Go-live approval from MTN/Safaricom' },
                      { done: false, text: 'Webhook handlers for payment notifications' },
                    ],
                  },
                  {
                    group: '🏦 Business Setup', color: 'border-purple-700/40',
                    items: [
                      { done: false, text: 'Register company in Nigeria or Kenya (or both)' },
                      { done: false, text: 'Open business bank account (Access, GTBank, Equity)' },
                      { done: false, text: 'Register seshaa.bank domain (Namecheap/GoDaddy)' },
                      { done: false, text: 'Apply for CBN PSP licence (Phase 2 prep)' },
                      { done: false, text: 'Anti-Money Laundering (AML) policy document' },
                      { done: false, text: 'Data Protection Officer (NDPR compliance — Nigeria)' },
                      { done: false, text: 'Cybersecurity assessment & pen test before launch' },
                    ],
                  },
                ].map(g => (
                  <div key={g.group} className={`rounded-xl border ${g.color} bg-gray-800/20 p-4`}>
                    <h4 className="text-sm font-semibold text-white mb-3">{g.group}</h4>
                    <ul className="space-y-2">
                      {g.items.map(item => (
                        <li key={item.text} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] ${item.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-600'}`}>
                            {item.done ? '✓' : ''}
                          </span>
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* ── KYC Providers ── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                KYC / Identity Verification Providers
              </h3>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  {
                    name: 'Smile ID',    flag: '🌍', coverage: '30+ African countries',
                    what: 'BVN, NIN, Ghana Card, Driver\'s License, passport, liveness checks, document OCR.',
                    docs: 'https://docs.usesmileid.com',
                    signup: 'https://usesmileid.com',
                    tag: '⭐ Best for Africa', tagColor: 'bg-emerald-500/20 text-emerald-300',
                  },
                  {
                    name: 'Dojah',      flag: '🇳🇬🇬🇭🇰🇪', coverage: 'Nigeria, Ghana, Kenya',
                    what: 'BVN, NIN, CAC lookup, Ghana Card, KRA PIN. Very affordable pricing.',
                    docs: 'https://docs.dojah.io',
                    signup: 'https://app.dojah.io/signup',
                    tag: 'Affordable', tagColor: 'bg-blue-500/20 text-blue-300',
                  },
                  {
                    name: 'Onfido',     flag: '🌍', coverage: 'Global (all Africa)',
                    what: 'AI document verification, liveness detection, global ID coverage. Enterprise-grade.',
                    docs: 'https://documentation.onfido.com',
                    signup: 'https://onfido.com/contact',
                    tag: 'Enterprise', tagColor: 'bg-purple-500/20 text-purple-300',
                  },
                ].map(p => (
                  <div key={p.name} className="rounded-xl border border-gray-700/40 bg-gray-800/30 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">{p.flag} {p.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${p.tagColor}`}>{p.tag}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-2">{p.coverage}</p>
                    <p className="text-xs text-gray-400 mb-3 leading-relaxed">{p.what}</p>
                    <div className="flex gap-2">
                      <a href={p.docs} target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700/60 text-gray-300 hover:bg-gray-700 transition-colors border border-gray-600/40">
                        📄 Docs
                      </a>
                      <a href={p.signup} target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors border border-emerald-500/30">
                        → Sign up
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Quick links ── */}
            <div className="rounded-xl border border-gray-700/40 bg-gray-800/20 p-5">
              <h3 className="text-sm font-semibold text-white mb-3">📚 Quick Reference Links</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { label: 'Paystack Docs',          href: 'https://paystack.com/docs' },
                  { label: 'Flutterwave Docs',        href: 'https://developer.flutterwave.com' },
                  { label: 'M-Pesa Daraja',           href: 'https://developer.safaricom.co.ke' },
                  { label: 'MTN MoMo Developer',      href: 'https://momodeveloper.mtn.com' },
                  { label: 'Airtel Money Dev',        href: 'https://developers.airtel.africa' },
                  { label: 'Sudo Africa BaaS',        href: 'https://docs.sudo.africa' },
                  { label: 'Smile ID KYC',            href: 'https://usesmileid.com' },
                  { label: 'Dojah KYC',               href: 'https://dojah.io' },
                  { label: 'CBN PSP Licence (NG)',    href: 'https://www.cbn.gov.ng/supervision/licensing.asp' },
                  { label: 'CBK Licence (KE)',        href: 'https://www.centralbank.go.ke/payment-systems/licensing/' },
                  { label: 'BoG Licence (GH)',        href: 'https://www.bog.gov.gh/financial-stability/payment-systems/' },
                  { label: 'Stitch Open Banking',     href: 'https://stitch.money' },
                  { label: 'Mono Open Banking',       href: 'https://mono.co' },
                  { label: 'Onafriq (MFS Africa)',    href: 'https://www.onafriq.com' },
                  { label: 'Cellulant Tingg',         href: 'https://developer.cellulant.io' },
                  { label: 'DPO Group',               href: 'https://docs.dpogroup.com' },
                  { label: 'Bloc BaaS',               href: 'https://blochq.io' },
                  { label: 'OnePipe Nigeria',         href: 'https://onepipe.io' },
                ].map(l => (
                  <a key={l.href} href={l.href} target="_blank" rel="noreferrer"
                    className="text-xs px-3 py-2 rounded-lg bg-gray-700/40 text-gray-300 hover:bg-gray-700/70 hover:text-white transition-colors border border-gray-700/30 flex items-center justify-between gap-1">
                    {l.label} <ArrowUpRight size={11} className="shrink-0 opacity-50" />
                  </a>
                ))}
              </div>
            </div>

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
