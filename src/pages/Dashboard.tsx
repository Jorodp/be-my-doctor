import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { userRole, loading, user, signOut, profile, doctorProfile } = useAuth();
  const navigate = useNavigate();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  // Check profile completeness
  useEffect(() => {
    if (user && userRole && !loading && !hasRedirected) {
      checkProfileCompleteness();
    }
  }, [user, userRole, profile, doctorProfile, loading, hasRedirected]);

  const checkProfileCompleteness = async () => {
    if (!user || !userRole) return;

    try {
      // NEW LOGIC: Direct access to dashboards for all users
      
      // For doctors: Always allow access to dashboard, regardless of verification status
      if (userRole === 'doctor') {
        console.log('Doctor detected, redirecting to dashboard...');
        setProfileComplete(true);
        setHasRedirected(true);
        return;
      }

      // For patients: Always allow access to dashboard
      if (userRole === 'patient') {
        // Check for intended doctor booking first
        const intendedDoctorId = localStorage.getItem('intended_doctor_id');
        if (intendedDoctorId) {
          localStorage.removeItem('intended_doctor_id');
          setHasRedirected(true);
          navigate(`/book/${intendedDoctorId}`, { replace: true });
          return;
        }
        
        console.log('Patient detected, redirecting to dashboard...');
        setProfileComplete(true);
        setHasRedirected(true);
        return;
      }

      // For assistants and admins: Direct access
      if (userRole === 'assistant' || userRole === 'admin') {
        setProfileComplete(true);
        setHasRedirected(true);
        return;
      }

      setProfileComplete(true);
    } catch (error) {
      console.error('Error checking profile completeness:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
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

  // Only redirect to dashboards if profile is complete
  if (profileComplete) {
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

  // If we get here, we're still checking profile completeness
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verificando perfil...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoadingSpinner />
          <div className="text-sm text-muted-foreground">
            <p>Comprobando información del perfil...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}