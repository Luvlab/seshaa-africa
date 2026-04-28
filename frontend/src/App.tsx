import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import './i18n';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const SalesRepPortal = lazy(() => import('./pages/portals/SalesRepPortal'));
const AdminPortal = lazy(() => import('./pages/portals/AdminPortal'));
const AdvertiserPortal = lazy(() => import('./pages/portals/AdvertiserPortal'));

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/messages" element={<ChatPage />} />
              <Route path="/salesrep" element={<SalesRepPortal />} />
              <Route path="/admin" element={<AdminPortal />} />
              <Route path="/advertise" element={<AdvertiserPortal />} />
              <Route path="*" element={
                <div className="text-center py-20 text-gray-400">
                  <p className="text-5xl mb-4">🌍</p>
                  <p className="text-xl font-semibold">Page not found</p>
                  <a href="/" className="mt-4 inline-block text-green-600 hover:underline">Back to directory</a>
                </div>
              } />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
