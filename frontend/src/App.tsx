import { useEffect, Suspense, lazy, useState } from 'react';
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

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--cp) transparent var(--cp) var(--cp)' }} />
    </div>
  );
}

// Renders all tab pages simultaneously; only the active one is visible.
// Each page stays mounted so data, scroll position and component state are preserved.
function TabContainer() {
  const { pathname } = useLocation();
  const isTab = TAB_PATHS.some(p => pathname === p);

  // Map path → component
  const TABS = [
    { path: '/',           el: <HomePage /> },
    { path: '/search',     el: <SearchPage /> },
    { path: '/news',       el: <NewsPage /> },
    { path: '/classifieds',el: <ClassifiedsPage /> },
    { path: '/prices',     el: <PriceComparePage /> },
    { path: '/messages',   el: <ChatPage /> },
    { path: '/bookings',   el: <BookingsPage /> },
    { path: '/advertise',  el: <AdvertiserPortal /> },
    { path: '/ambassador', el: <AmbassadorPortal /> },
    { path: '/salesrep',   el: <SalesRepPortal /> },
    { path: '/admin',      el: <AdminPortal /> },
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
                <a href="/" className="mt-4 inline-block font-semibold hover:underline" style={{ color: 'var(--cp)' }}>
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
  );
}
