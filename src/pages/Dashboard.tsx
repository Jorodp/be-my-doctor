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
      // Check for intended doctor booking first
      if (userRole === 'patient') {
        const intendedDoctorId = localStorage.getItem('intended_doctor_id');
        if (intendedDoctorId) {
          localStorage.removeItem('intended_doctor_id');
          setHasRedirected(true);
          navigate(`/book/${intendedDoctorId}`, { replace: true });
          return;
        }
      }

      // Check if profile is complete
      if (userRole === 'patient') {
        // For patients, check required fields: full_name (profile_image_url and id_document_url optional for now)
        const isComplete = profile && 
          profile.full_name && 
          profile.full_name.trim() !== '';
          
        if (!isComplete) {
          setHasRedirected(true);
          navigate('/profile/patient', { replace: true });
          return;
        }
      } else if (userRole === 'doctor') {
        // For doctors, check if doctor profile exists and has basic required fields
        const isComplete = profile && 
          doctorProfile && 
          profile.full_name && 
          profile.full_name.trim() !== '' &&
          doctorProfile.specialty && 
          doctorProfile.specialty.trim() !== '' &&
          doctorProfile.professional_license && 
          doctorProfile.professional_license.trim() !== '';
          
        if (!isComplete) {
          // If doctor profile doesn't exist, redirect to create it
          if (!doctorProfile) {
            setHasRedirected(true);
            navigate('/profile/doctor', { replace: true });
            return;
          }
        }
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