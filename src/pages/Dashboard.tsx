import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';

export default function Dashboard() {
  const { userRole, loading, user, signOut } = useAuth();

  // Check for intended doctor booking after login
  useEffect(() => {
    if (user && userRole === 'patient' && !loading) {
      const intendedDoctorId = localStorage.getItem('intended_doctor_id');
      if (intendedDoctorId) {
        localStorage.removeItem('intended_doctor_id');
        window.location.href = `/book/${intendedDoctorId}`;
        return;
      }
    }
  }, [user, userRole, loading]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Cargando...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoadingSpinner />
            <div className="text-sm text-muted-foreground">
              <p>Usuario: {user?.email || 'No detectado'}</p>
              <p>Rol: {userRole || 'No detectado'}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Cerrar Sesión (Forzar)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sin Rol Detectado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Usuario: {user?.email || 'No detectado'}</p>
              <p>Rol: {userRole || 'No detectado'}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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