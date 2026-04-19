import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ConsolidationPage } from './pages/ConsolidationPage';
import { CarrierSettingsPage } from './pages/CarrierSettingsPage';
import { ShopifySettingsPage } from './pages/ShopifySettingsPage';
import { HealthCheckPage } from './pages/HealthCheckPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="shipments" element={<ShipmentsPage />} />
        <Route path="returns" element={<ReturnsPage />} />
        <Route path="consolidation" element={<ConsolidationPage />} />
        <Route path="settings/carriers" element={<CarrierSettingsPage />} />
        <Route path="settings/shopify" element={<ShopifySettingsPage />} />
        <Route path="health" element={<HealthCheckPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
