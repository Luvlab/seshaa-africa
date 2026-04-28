import { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';
import Navbar from './components/layout/Navbar';
import MobileTabBar from './components/layout/MobileTabBar';
import Footer from './components/layout/Footer';
import { useThemeStore } from './store/theme';
import { useInterestsStore } from './store/interests';
import InterestSurvey from './components/ads/InterestSurvey';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const SalesRepPortal = lazy(() => import('./pages/portals/SalesRepPortal'));
const AmbassadorPortal = lazy(() => import('./pages/portals/AmbassadorPortal'));
const AdminPortal = lazy(() => import('./pages/portals/AdminPortal'));
const AdvertiserPortal = lazy(() => import('./pages/portals/AdvertiserPortal'));
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const ClassifiedsPage = lazy(() => import('./pages/ClassifiedsPage'));
const PriceComparePage = lazy(() => import('./pages/PriceComparePage'));

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cp) transparent var(--cp) var(--cp)' }} />
    </div>
  );
}

export default function App() {
  const { detectFromIP, applyTheme, countryCode } = useThemeStore();
  const { surveyDone } = useInterestsStore();
  const [showSurvey, setShowSurvey] = useState(false);

  useEffect(() => {
    applyTheme(countryCode);
    detectFromIP();
    // Show survey after 3 seconds on first visit
    if (!surveyDone) {
      const t = setTimeout(() => setShowSurvey(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/messages" element={<ChatPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/advertise" element={<AdvertiserPortal />} />
              <Route path="/salesrep" element={<SalesRepPortal />} />
              <Route path="/ambassador" element={<AmbassadorPortal />} />
              <Route path="/admin" element={<AdminPortal />} />
              <Route path="/listing/:id" element={<ListingDetail />} />
              <Route path="/verify/:code" element={<VerifyPage />} />
              <Route path="/classifieds" element={<ClassifiedsPage />} />
              <Route path="/prices" element={<PriceComparePage />} />
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
        </main>
        <Footer />
        <MobileTabBar />
        {showSurvey && <InterestSurvey onClose={() => setShowSurvey(false)} />}
      </div>
    </BrowserRouter>
  );
}
