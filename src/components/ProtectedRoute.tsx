import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface ProtectedRouteProps {
  children: ReactNode;
  role: UserRole;
}

export const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !profile) {
    return <Navigate to="/auth" replace />;
  }

  if (profile.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};