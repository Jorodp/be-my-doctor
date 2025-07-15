import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to specific dashboard based on role
  switch (profile.role) {
    case 'patient':
      return <Navigate to="/dashboard/patient" replace />;
    case 'doctor':
      return <Navigate to="/dashboard/doctor" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'medical_assistant':
      return <Navigate to="/dashboard/doctor" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}