import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import WalletProviders from './features/wallet/WalletProviders.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import SystemPage from './pages/SystemPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CompositionPage from './pages/CompositionPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import MethodologyPage from './pages/MethodologyPage.jsx';
import CoinDetailPage from './pages/CoinDetailPage.jsx';

/**
 * App — root component.
 *
 * Provider order (outer → inner):
 *   WalletProviders → AuthProvider → ToastProvider → BrowserRouter → Routes
 *
 * Routing:
 *   PublicLayout (navbar + footer):
 *     /        → HomePage   (landing)
 *     /about   → AboutPage  (metodologi)
 *     /login   → LoginPage  (connect wallet)
 *   /dashboard → DashboardPage (protected, layout sendiri)
 *
 * Kenapa WalletProviders di luar:
 *   Wallet adapter butuh wrap seluruh app supaya `useWallet()` jalan di mana aja.
 */
export default function App() {
  return (
    <WalletProviders>
      <AuthProvider>
        <ToastProvider>
          {/* reducedMotion="user": semua animasi motion otomatis dimatiin
              kalau user set "kurangi gerakan" di OS (aksesibilitas) */}
          <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Halaman publik — pakai shell PublicLayout */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/system" element={<SystemPage />} />
                <Route path="/login" element={<LoginPage />} />
                {/* /connect = alias spec untuk halaman auth */}
                <Route path="/connect" element={<LoginPage />} />
              </Route>

              {/* App — protected, pakai shell AppLayout (Sidebar + topbar) */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/composition" element={<CompositionPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/methodology" element={<MethodologyPage />} />
                <Route path="/coin/:coingeckoId" element={<CoinDetailPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          </MotionConfig>
        </ToastProvider>
      </AuthProvider>
    </WalletProviders>
  );
}
