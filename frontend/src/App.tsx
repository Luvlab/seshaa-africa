import { Component, useEffect, Suspense, lazy, useState } from 'react';
import { useAnalytics, usePageview } from './hooks/useAnalytics';
import type { ReactNode, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

// ── Scroll to top on every navigation AND on page refresh ────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();

  // Disable browser's built-in scroll restoration so a refresh doesn't
  // land midway down the page.
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    // Scroll to top on first mount (covers hard refresh of any route)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top on every client-side navigation
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
import './i18n';
import { LANGUAGES } from './i18n';
import Navbar from './components/layout/Navbar';
import MobileTabBar from './components/layout/MobileTabBar';
// ChatFAB removed — chat lives at /messages
import Footer, { initFontSize } from './components/layout/Footer';
import { useThemeStore } from './store/theme';
import { useSeoStore } from './store/seo';
import SeoHead from './components/SeoHead';
import InterestSurvey from './components/ads/InterestSurvey';


// Primary tabs — loaded eagerly once, kept alive in the background
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ChatPage from './pages/ChatPage';
import BookingsPage from './pages/BookingsPage';
import NewsPage from './pages/NewsPage';
import ClassifiedsPage from './pages/ClassifiedsPage';
import PriceComparePage from './pages/PriceComparePage';
import MarketPage from './pages/MarketPage';
import AdvertiserPortal from './pages/portals/AdvertiserPortal';
import AmbassadorPortal from './pages/portals/AmbassadorPortal';
import SalesRepPortal from './pages/portals/SalesRepPortal';
import AdminPortal from './pages/portals/AdminPortal';
import AddListingPage from './pages/AddListingPage';
import TranslatePage from './pages/TranslatePage';
import BusinessPortal from './pages/portals/BusinessPortal';
import EventsPage from './pages/EventsPage';
import DiasporaPage from './pages/DiasporaPage';
import TravelsPage from './pages/TravelsPage';
import ArchivePage from './pages/ArchivePage';
import RadioPage from './pages/RadioPage';
import FooterPlayer from './components/radio/FooterPlayer';
import RidePage from './pages/RidePage';
import DeliveryPage from './pages/DeliveryPage';
import TransportPage from './pages/TransportPage';

// Detail/modal pages — still lazy-loaded (rarely visited)
const ListingDetail    = lazy(() => import('./pages/ListingDetail'));
const VerifyPage       = lazy(() => import('./pages/VerifyPage'));
const AuthPage         = lazy(() => import('./pages/AuthPage'));
const ProfilePage      = lazy(() => import('./pages/ProfilePage'));
const CountryPage      = lazy(() => import('./pages/CountryPage'));
const NewsArticlePage  = lazy(() => import('./pages/NewsArticlePage'));

// Tab paths — all kept mounted simultaneously
const TAB_PATHS = [
  '/', '/search', '/news', '/classifieds', '/prices',
  '/market', '/radio',
  '/messages', '/bookings', '/advertise',
  '/ambassador', '/salesrep', '/admin',
  '/add-listing', '/translate', '/business', '/events', '/diaspora', '/travels', '/archive',
  '/ride', '/delivery', '/transport',
];

// ── Error Boundary ──────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('🔴 Seshaa render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: 'var(--cp, #008751)' }}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--cp, #008751) transparent var(--cp, #008751) var(--cp, #008751)' }} />
    </div>
  );
}

// ── Tab container ────────────────────────────────────────────────────────────
// Renders all tab pages simultaneously; only the active one is visible.
// Each page stays mounted so data, scroll position and component state are preserved.
function TabContainer() {
  const { pathname } = useLocation();
  const isTab = TAB_PATHS.some(p => pathname === p);
  usePageview();
  useAnalytics();

  // Map path → component, each wrapped in its own Error Boundary
  const TABS = [
    { path: '/',            el: <ErrorBoundary key="home"><HomePage /></ErrorBoundary> },
    { path: '/search',      el: <ErrorBoundary key="search"><SearchPage /></ErrorBoundary> },
    { path: '/news',        el: <ErrorBoundary key="news"><NewsPage /></ErrorBoundary> },
    { path: '/classifieds', el: <ErrorBoundary key="classifieds"><ClassifiedsPage /></ErrorBoundary> },
    { path: '/prices',      el: <ErrorBoundary key="prices"><PriceComparePage /></ErrorBoundary> },
    { path: '/market',      el: <ErrorBoundary key="market"><MarketPage /></ErrorBoundary> },
    { path: '/messages',    el: <ErrorBoundary key="messages"><ChatPage /></ErrorBoundary> },
    { path: '/bookings',    el: <ErrorBoundary key="bookings"><BookingsPage /></ErrorBoundary> },
    { path: '/advertise',   el: <ErrorBoundary key="advertise"><AdvertiserPortal /></ErrorBoundary> },
    { path: '/ambassador',  el: <ErrorBoundary key="ambassador"><AmbassadorPortal /></ErrorBoundary> },
    { path: '/salesrep',    el: <ErrorBoundary key="salesrep"><SalesRepPortal /></ErrorBoundary> },
    { path: '/admin',       el: <ErrorBoundary key="admin"><AdminPortal /></ErrorBoundary> },
    { path: '/add-listing', el: <ErrorBoundary key="add-listing"><AddListingPage /></ErrorBoundary> },
    { path: '/translate',   el: <ErrorBoundary key="translate"><TranslatePage /></ErrorBoundary> },
    { path: '/business',    el: <ErrorBoundary key="business"><BusinessPortal /></ErrorBoundary> },
    { path: '/events',      el: <ErrorBoundary key="events"><EventsPage /></ErrorBoundary> },
    { path: '/diaspora',    el: <ErrorBoundary key="diaspora"><DiasporaPage /></ErrorBoundary> },
    { path: '/travels',     el: <ErrorBoundary key="travels"><TravelsPage /></ErrorBoundary> },
    { path: '/archive',     el: <ErrorBoundary key="archive"><ArchivePage /></ErrorBoundary> },
    { path: '/radio',       el: <ErrorBoundary key="radio"><RadioPage /></ErrorBoundary> },
    { path: '/ride',        el: <ErrorBoundary key="ride"><RidePage defaultType="RIDE" /></ErrorBoundary> },
    { path: '/delivery',    el: <ErrorBoundary key="delivery"><DeliveryPage /></ErrorBoundary> },
    { path: '/transport',   el: <ErrorBoundary key="transport"><TransportPage /></ErrorBoundary> },
  ];

  return (
    <>
      {/* All tabs — mounted immediately, hidden unless active */}
      <div style={{ display: isTab ? 'block' : 'none' }}>
        {TABS.map(({ path, el }) => (
          <div key={path} style={{ display: pathname === path ? 'block' : 'none' }}>
            {el}
          </div>
        ))}
      </div>

      {/* Detail pages rendered on top when navigated to */}
      {!isTab && (
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/news/article" element={<NewsArticlePage />} />
            <Route path="/verify/:code" element={<VerifyPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/country/:code" element={<Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" /></div>}><CountryPage /></Suspense>} />
            <Route path="*" element={
              <div className="text-center py-20 text-gray-400">
                <p className="text-6xl mb-4">🌍</p>
                <p className="text-xl font-semibold text-gray-600">Page not found</p>
                <a href="/" className="mt-4 inline-block font-semibold hover:underline" style={{ color: 'var(--cp, #008751)' }}>
                  Back to Seshaa
                </a>
              </div>
            } />
          </Routes>
        </Suspense>
      )}
    </>
  );
}

// ── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  const { detectFromIP, applyTheme, countryCode, loadThemeOverrides } = useThemeStore();
  const loadSeo = useSeoStore(s => s.load);
  const [showSurvey, setShowSurvey] = useState(false);

  useEffect(() => {
    initFontSize(); // restore user's saved text-size preference
    // Restore admin CSS settings
    const root = document.documentElement;
    const logoMainLegacy = localStorage.getItem('seshaa-logo-main');
    const logoMainMobile = localStorage.getItem('seshaa-logo-main-mobile');
    const logoMainTablet = localStorage.getItem('seshaa-logo-main-tablet');
    const logoMainDesktop = localStorage.getItem('seshaa-logo-main-desktop');
    const logoStroke = localStorage.getItem('seshaa-logo-stroke');
    const customCss  = localStorage.getItem('seshaa-custom-css');
    if (logoMainMobile) root.style.setProperty('--logo-main-size-mobile', logoMainMobile + 'rem');
    if (logoMainTablet) root.style.setProperty('--logo-main-size-tablet', logoMainTablet + 'rem');
    if (logoMainDesktop) root.style.setProperty('--logo-main-size-desktop', logoMainDesktop + 'rem');
    if (!logoMainMobile && !logoMainTablet && !logoMainDesktop && logoMainLegacy) {
      root.style.setProperty('--logo-main-size-desktop', logoMainLegacy + 'rem');
    }
    if (logoStroke) root.style.setProperty('--logo-stroke',    logoStroke + 'px');

    // Title font & colors
    const logoTitleColor  = localStorage.getItem('seshaa-logo-title-color');
    const logoSuffixColor = localStorage.getItem('seshaa-logo-suffix-color');
    const logoFontFamily  = localStorage.getItem('seshaa-logo-font-family');
    const logoFontId      = localStorage.getItem('seshaa-logo-font') ?? 'default';
    const logoFontData    = localStorage.getItem('seshaa-logo-font-data');
    const logoFontName    = localStorage.getItem('seshaa-logo-font-name');
    if (logoTitleColor)  root.style.setProperty('--logo-title-color',  logoTitleColor);
    if (logoSuffixColor) root.style.setProperty('--logo-suffix-color', logoSuffixColor);
    if (logoFontFamily)  root.style.setProperty('--logo-font-family',  logoFontFamily);
    // Re-inject Google Fonts link if a preset (non-default, non-custom) was selected
    if (logoFontId && logoFontId !== 'default' && logoFontId !== 'custom') {
      const GFONTS: Record<string, string> = {
        playfair:   'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&display=swap',
        fraunces:   'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,900&display=swap',
        barlow:     'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800&display=swap',
        montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,900&display=swap',
        raleway:    'https://fonts.googleapis.com/css2?family=Raleway:ital,wght@1,900&display=swap',
        josefin:    'https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@1,700&display=swap',
      };
      const url = GFONTS[logoFontId];
      if (url) {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = url;
        link.setAttribute('data-seshaa-font', logoFontId);
        document.head.appendChild(link);
      }
    }
    // Re-inject @font-face for custom uploaded font
    if (logoFontId === 'custom' && logoFontData) {
      const styleEl = document.createElement('style');
      styleEl.id = 'seshaa-custom-font-face';
      styleEl.textContent = `@font-face { font-family: 'SeshaaCustomFont'; src: url('${logoFontData}'); font-weight: 900; font-style: italic; }`;
      document.head.appendChild(styleEl);
      void logoFontName; // referenced for future display
    }

    if (customCss) {
      const el = document.createElement('style');
      el.id = 'seshaa-custom-css';
      el.textContent = customCss;
      document.head.appendChild(el);
    }
    // Restore language direction (RTL for Arabic, etc.)
    const storedLang = localStorage.getItem('seshaa-lang') || 'en';
    const langDir = LANGUAGES.find(l => l.code === storedLang)?.dir || 'ltr';
    document.documentElement.dir = langDir;
    loadThemeOverrides().catch(() => {});
    applyTheme(''); // always start at Africa — detectFromIP will set the real geo country
    detectFromIP();
    loadSeo();          // fetch SEO config → SeoHead picks it up reactively
    // Show personalisation survey only for brand-new signups (flag set by AuthPage after register)
    if (sessionStorage.getItem('seshaa-new-signup')) {
      sessionStorage.removeItem('seshaa-new-signup');
      setShowSurvey(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <SeoHead />
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <main className="flex-1 pt-14 md:pt-[92px]" style={{ paddingBottom: 'calc(4rem + var(--player-bar-h, 0px))' }}>
            <TabContainer />
          </main>
          {/* footer-pull-up slides footer background up over main's paddingBottom gap */}
          <div className="footer-pull-up">
            <Footer />
          </div>
          <MobileTabBar />
          <FooterPlayer />
          {/* Chat is at /messages — no floating overlay needed */}
          {showSurvey && <InterestSurvey onClose={() => setShowSurvey(false)} />}
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
