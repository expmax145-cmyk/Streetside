import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { DataProvider } from '@/contexts/DataContext';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { SearchPage } from '@/pages/SearchPage';
import { VendorProfilePage } from '@/pages/VendorProfilePage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { MapPage } from '@/pages/MapPage';
import { FoodTrailsPage } from '@/pages/FoodTrailsPage';
import { TrailDetailPage } from '@/pages/TrailDetailPage';
import { OffersPage } from '@/pages/OffersPage';
import { EventsPage } from '@/pages/EventsPage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { RewardsPage } from '@/pages/RewardsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { VendorRegisterPage } from '@/pages/VendorRegisterPage';
import { VendorDashboardPage } from '@/pages/VendorDashboardPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <DataProvider>
          <AuthProvider>
            <FavoritesProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/vendor/:id" element={<VendorProfilePage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/trails" element={<FoodTrailsPage />} />
                  <Route path="/trails/:id" element={<TrailDetailPage />} />
                  <Route path="/offers" element={<OffersPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/events/:id" element={<EventDetailPage />} />
                  <Route path="/rewards" element={<RewardsPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/vendor-register" element={<VendorRegisterPage />} />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/vendor-dashboard"
                    element={
                      <ProtectedRoute roles={['vendor', 'admin']}>
                        <VendorDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute roles={['admin']}>
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            </FavoritesProvider>
          </AuthProvider>
        </DataProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
