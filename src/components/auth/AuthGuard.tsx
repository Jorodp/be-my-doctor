import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type UserRole = Database['public']['Enums']['user_role'];

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  requireVerified?: boolean;
}

export const AuthGuard = ({ children, requiredRole, requireVerified = false }: AuthGuardProps) => {
  const { user, profile, doctorProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect to auth if not authenticated
  if (!user || !profile) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(profile.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check verification requirements for doctors
  if (requireVerified && profile.role === 'doctor') {
    if (!doctorProfile || doctorProfile.verification_status !== 'verified') {
      return <Navigate to="/pending-verification" replace />;
    }
  }

  return <>{children}</>;
};