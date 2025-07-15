import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';
import { DoctorDashboard } from '@/components/dashboard/DoctorDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  switch (profile.role) {
    case 'patient':
      return <PatientDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'medical_assistant':
      return <DoctorDashboard />; // Medical assistants use doctor dashboard
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}