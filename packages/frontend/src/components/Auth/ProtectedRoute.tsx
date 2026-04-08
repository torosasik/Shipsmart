import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'user')[];
}

// AUTH BYPASS: Always allow access without authentication
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
