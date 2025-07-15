import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type UserRole = 'patient' | 'doctor' | 'assistant' | 'admin';

interface ProtectedRouteProps {
  children: ReactNode;
  role: UserRole;
}

export const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !userRole) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};