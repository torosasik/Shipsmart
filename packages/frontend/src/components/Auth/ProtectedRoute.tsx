import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'user')[];
}

const TEST_MODE = import.meta.env.VITE_TEST_MODE === 'true';
const TEST_EMAIL = import.meta.env.VITE_TEST_EMAIL || '';
const TEST_PASSWORD = import.meta.env.VITE_TEST_PASSWORD || '';

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuthStore();

  useEffect(() => {
    if (TEST_MODE && TEST_EMAIL && TEST_PASSWORD && !isAuthenticated && !isLoading) {
      login(TEST_EMAIL, TEST_PASSWORD).catch(() => {});
    }
  }, [isAuthenticated, isLoading, login]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
