import { useQuery } from '@tanstack/react-query';
import { ordersApi, shipmentsApi } from '../services/api';

export function DashboardPage() {
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list({ page: 1, limit: 10 }),
  });

  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsApi.list({ page: 1, limit: 10 }),
  });

  if (ordersLoading || shipmentsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Pending Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{orders?.total ?? 0}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Active Shipments</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{shipments?.total ?? 0}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Consolidation Savings</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>$0.00</p>
        </div>
      </div>
    </div>
  );
}
