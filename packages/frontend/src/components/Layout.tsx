import { Outlet, Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/orders', label: 'Orders' },
  { path: '/shipments', label: 'Shipments' },
  { path: '/returns', label: 'Returns' },
  { path: '/consolidation', label: 'Consolidation' },
];

export function Layout() {
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '240px', backgroundColor: '#1a1a2e', color: '#fff', padding: '16px' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>ShipSmart</h1>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navItems.map((item) => (
            <li key={item.path} style={{ marginBottom: '8px' }}>
              <Link
                to={item.path}
                style={{
                  color: location.pathname === item.path ? '#4fc3f7' : '#fff',
                  textDecoration: 'none',
                  display: 'block',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '24px', backgroundColor: '#f5f5f5' }}>
        <Outlet />
      </main>
    </div>
  );
}
