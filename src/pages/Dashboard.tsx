import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Dashboard() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!userRole) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to specific dashboard based on role
  switch (userRole) {
    case 'patient':
      return <Navigate to="/dashboard/patient" replace />;
    case 'doctor':
      return <Navigate to="/dashboard/doctor" replace />;
    case 'assistant':
      return <Navigate to="/dashboard/assistant" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}