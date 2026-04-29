import { Component, useEffect, Suspense, lazy, useState } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './i18n';
import Navbar from './components/layout/Navbar';
import MobileTabBar from './components/layout/MobileTabBar';
import Footer from './components/layout/Footer';
import { useThemeStore } from './store/theme';
import { useInterestsStore } from './store/interests';
import InterestSurvey from './components/ads/InterestSurvey';

// Primary tabs — loaded eagerly once, kept alive in the background
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ChatPage from './pages/ChatPage';
import BookingsPage from './pages/BookingsPage';
import NewsPage from './pages/NewsPage';
import ClassifiedsPage from './pages/ClassifiedsPage';
import PriceComparePage from './pages/PriceComparePage';
import AdvertiserPortal from './pages/portals/AdvertiserPortal';
import AmbassadorPortal from './pages/portals/AmbassadorPortal';
import SalesRepPortal from './pages/portals/SalesRepPortal';
import AdminPortal from './pages/portals/AdminPortal';

// Detail/modal pages — still lazy-loaded (rarely visited)
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));

// Tab paths — all kept mounted simultaneously
const TAB_PATHS = [
  '/', '/search', '/news', '/classifieds', '/prices',
  '/messages', '/bookings', '/advertise',
  '/ambassador', '/salesrep', '/admin',
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

  // Map path → component, each wrapped in its own Error Boundary
  const TABS = [
    { path: '/',            el: <ErrorBoundary key="home"><HomePage /></ErrorBoundary> },
    { path: '/search',      el: <ErrorBoundary key="search"><SearchPage /></ErrorBoundary> },
    { path: '/news',        el: <ErrorBoundary key="news"><NewsPage /></ErrorBoundary> },
    { path: '/classifieds', el: <ErrorBoundary key="classifieds"><ClassifiedsPage /></ErrorBoundary> },
    { path: '/prices',      el: <ErrorBoundary key="prices"><PriceComparePage /></ErrorBoundary> },
    { path: '/messages',    el: <ErrorBoundary key="messages"><ChatPage /></ErrorBoundary> },
    { path: '/bookings',    el: <ErrorBoundary key="bookings"><BookingsPage /></ErrorBoundary> },
    { path: '/advertise',   el: <ErrorBoundary key="advertise"><AdvertiserPortal /></ErrorBoundary> },
    { path: '/ambassador',  el: <ErrorBoundary key="ambassador"><AmbassadorPortal /></ErrorBoundary> },
    { path: '/salesrep',    el: <ErrorBoundary key="salesrep"><SalesRepPortal /></ErrorBoundary> },
    { path: '/admin',       el: <ErrorBoundary key="admin"><AdminPortal /></ErrorBoundary> },
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
            <Route path="/verify/:code" element={<VerifyPage />} />
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
  const { detectFromIP, applyTheme, countryCode } = useThemeStore();
  const { surveyDone } = useInterestsStore();
  const [showSurvey, setShowSurvey] = useState(false);

  useEffect(() => {
    applyTheme(countryCode);
    detectFromIP();
    if (!surveyDone) {
      const t = setTimeout(() => setShowSurvey(true), 3000);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <main className="flex-1 pb-16 md:pb-0">
            <TabContainer />
          </main>
          <Footer />
          <MobileTabBar />
          {showSurvey && <InterestSurvey onClose={() => setShowSurvey(false)} />}
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
