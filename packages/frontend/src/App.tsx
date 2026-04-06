import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ConsolidationPage } from './pages/ConsolidationPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="shipments" element={<ShipmentsPage />} />
        <Route path="returns" element={<ReturnsPage />} />
        <Route path="consolidation" element={<ConsolidationPage />} />
      </Route>
    </Routes>
  );
}
