import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi, shipmentsApi, returnsApi, consolidationApi } from '../services/api';
import { DashboardCard, ErrorDisplay } from '../components';
import { SkeletonCard } from '../components/Skeleton/Skeleton';

// Type definitions
interface Order {
  id: string;
  shopifyOrderId?: string;
  customerName: string;
  status: 'pending' | 'shipped' | 'delivered' | 'returned';
  lineItems?: Array<unknown>;
}

interface Shipment {
  id: string;
  status: 'created' | 'in_transit' | 'label_generated' | 'delivered';
}

interface ReturnItem {
  id: string;
  status: 'pending' | 'in_transit' | 'received';
}

interface ConsolidationOpportunity {
  id: string;
  savings: number;
}

interface ApiResponse<T> {
  items?: T[];
  data?: T;
}

export function DashboardPage() {
  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery<ApiResponse<Order>>({
    queryKey: ['orders', 'dashboard'],
    queryFn: () => ordersApi.list({ page: 1, limit: 100 }) as Promise<ApiResponse<Order>>,
  });

  // Fetch shipments
  const { data: shipmentsData, isLoading: shipmentsLoading, error: shipmentsError } = useQuery<ApiResponse<Shipment>>({
    queryKey: ['shipments', 'dashboard'],
    queryFn: () => shipmentsApi.list({ page: 1, limit: 100 }) as Promise<ApiResponse<Shipment>>,
  });

  // Fetch returns
  const { data: returnsData, isLoading: returnsLoading } = useQuery<ApiResponse<ReturnItem>>({
    queryKey: ['returns', 'dashboard'],
    queryFn: () => returnsApi.list() as Promise<ApiResponse<ReturnItem>>,
  });

  // Fetch consolidation opportunities
  const { data: consolidationData, isLoading: consolidationLoading } = useQuery<ApiResponse<ConsolidationOpportunity>>({
    queryKey: ['consolidation', 'dashboard'],
    queryFn: () => consolidationApi.opportunities() as Promise<ApiResponse<ConsolidationOpportunity>>,
  });

  const isLoading = ordersLoading || shipmentsLoading || returnsLoading || consolidationLoading;
  const hasError = ordersError || shipmentsError;

  if (hasError) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard"
        message="There was an error loading your dashboard data. Please try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Calculate metrics
  const orders = ordersData?.items || [];
  const shipments = shipmentsData?.items || [];
  const returns = returnsData?.items || [];
  const consolidationOpportunities = Array.isArray(consolidationData?.data) 
    ? consolidationData.data as ConsolidationOpportunity[]
    : [];

  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const shippedOrders = orders.filter((o) => o.status === 'shipped').length;
  const returnedOrders = orders.filter((o) => o.status === 'returned').length;
  const activeShipments = shipments.filter((s) => s.status !== 'delivered').length;
  const deliveredShipments = shipments.filter((s) => s.status === 'delivered').length;
  const createdShipments = shipments.filter((s) => s.status === 'created').length;
  const inTransitShipments = shipments.filter((s) => s.status === 'in_transit').length;
  const labelGeneratedShipments = shipments.filter((s) => s.status === 'label_generated').length;
  const pendingReturns = returns.filter((r) => r.status === 'pending').length;
  const returnsInTransit = returns.filter((r) => r.status === 'in_transit').length;
  const receivedReturns = returns.filter((r) => r.status === 'received').length;
  
  const potentialSavings = consolidationOpportunities.reduce(
    (sum, opp) => sum + (opp.savings || 0), 
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of your shipping operations</p>
      </div>

      {/* KPI Cards - Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Pending Orders"
            value={pendingOrders}
            subtitle="Awaiting shipment"
          />
          <DashboardCard
            title="In Transit"
            value={activeShipments}
            subtitle="Active shipments"
          />
          <DashboardCard
            title="Delivered"
            value={deliveredShipments}
            subtitle="This month"
          />
          <DashboardCard
            title="Potential Savings"
            value={`$${potentialSavings.toFixed(2)}`}
            subtitle={`${consolidationOpportunities.length} opportunities`}
          />
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Orders by Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Pending</span>
              <span className="font-medium text-gray-900 dark:text-white">{pendingOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Shipped</span>
              <span className="font-medium text-gray-900 dark:text-white">{shippedOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Returned</span>
              <span className="font-medium text-gray-900 dark:text-white">{returnedOrders}</span>
            </div>
          </div>
        </div>

        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Shipment Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Created</span>
              <span className="font-medium text-gray-900 dark:text-white">{createdShipments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">In Transit</span>
              <span className="font-medium text-gray-900 dark:text-white">{inTransitShipments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Label Generated</span>
              <span className="font-medium text-gray-900 dark:text-white">{labelGeneratedShipments}</span>
            </div>
          </div>
        </div>

        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Returns</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Pending</span>
              <span className="font-medium text-gray-900 dark:text-white">{pendingReturns}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">In Transit</span>
              <span className="font-medium text-gray-900 dark:text-white">{returnsInTransit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Received</span>
              <span className="font-medium text-gray-900 dark:text-white">{receivedReturns}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
          <Link to="/orders" className="text-sm text-ship-accent hover:text-sky-600">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order ID</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Items</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {order.shopifyOrderId || order.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {order.customerName}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {order.lineItems?.length || 0} items
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/orders"
          className="card hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Orders</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage incoming orders</p>
            </div>
          </div>
        </Link>

        <Link
          to="/shipments"
          className="card hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Shipments</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track & create shipments</p>
            </div>
          </div>
        </Link>

        <Link
          to="/consolidation"
          className="card hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Consolidation</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{consolidationOpportunities.length} opportunities</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// Status Badge Component with dark mode support
function StatusBadge({ status }: { status: Order['status'] }) {
  const styles: Record<Order['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    returned: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
