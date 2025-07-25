import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertCircle, UserX } from 'lucide-react';

interface AssistantAccessGuardProps {
  children: React.ReactNode;
}

export const AssistantAccessGuard = ({ children }: AssistantAccessGuardProps) => {
  const { user, profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (user && profile?.role === 'assistant') {
      checkAssistantAccess();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const checkAssistantAccess = async () => {
    try {
      if (!user || !profile) return;

      // Get assistant's internal ID
      const { data: assistantProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, assigned_doctor_id')
        .eq('user_id', user.id)
        .eq('role', 'assistant')
        .single();

      if (profileError || !assistantProfile) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check for specific clinic assignments (NEW METHOD)
      const { data: clinicAssignments } = await supabase
        .from('clinic_assistants')
        .select('clinic_id')
        .eq('assistant_id', assistantProfile.id);

      // Check for general doctor assignment (LEGACY METHOD)
      let doctorAssignments = [];
      if (assistantProfile.assigned_doctor_id) {
        const { data: doctorProfile } = await supabase
          .from('profiles')
          .select('full_name, user_id')
          .eq('user_id', assistantProfile.assigned_doctor_id)
          .single();

        if (doctorProfile) {
          doctorAssignments.push(doctorProfile);
        }
      }

      // Check for doctor_assistants table assignments
      const { data: doctorAssistantAssignments } = await supabase
        .from('doctor_assistants')
        .select('doctor_id')
        .eq('assistant_id', assistantProfile.id);

      // Determine if assistant has any access
      const hasClinicAccess = clinicAssignments && clinicAssignments.length > 0;
      const hasLegacyAccess = doctorAssignments.length > 0;
      const hasDoctorAssistantAccess = doctorAssistantAssignments && doctorAssistantAssignments.length > 0;

      if (!hasClinicAccess && !hasLegacyAccess && !hasDoctorAssistantAccess) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Get doctor name from the first available assignment
      let doctorName = 'Doctor';
      if (hasClinicAccess && clinicAssignments?.[0]) {
        // Get doctor info from the clinic
        const { data: clinic } = await supabase
          .from('clinics')
          .select('doctor_id')
          .eq('id', clinicAssignments[0].clinic_id)
          .single();

        if (clinic) {
          const { data: doctorProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', clinic.doctor_id)
            .single();

          if (doctorProfile) {
            doctorName = doctorProfile.full_name || 'Doctor';
          }
        }
      } else if (hasLegacyAccess) {
        doctorName = doctorAssignments[0].full_name || 'Doctor';
      } else if (hasDoctorAssistantAccess && doctorAssistantAssignments?.[0]) {
        const { data: doctorProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', doctorAssistantAssignments[0].doctor_id)
          .single();

        if (doctorProfile) {
          doctorName = doctorProfile.full_name || 'Doctor';
        }
      }

      setDoctorInfo({ name: doctorName });
      setHasAccess(true);
    } catch (error) {
      console.error('Error checking assistant access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  // If not an assistant, show children
  if (!profile || profile.role !== 'assistant') {
    return <>{children}</>;
  }

  // If still loading, show spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // If assistant has access, show children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show access denied message
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <UserX className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Acceso No Autorizado</CardTitle>
          <CardDescription>
            Tu cuenta de asistente no está asignada a ningún doctor activo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">¿Qué significa esto?</p>
                <ul className="space-y-1 text-xs">
                  <li>• Tu cuenta aún no ha sido asignada a un doctor</li>
                  <li>• El doctor que te invitó puede haberte removido</li>
                  <li>• Tu acceso puede haber sido revocado temporalmente</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>¿Qué puedes hacer?</strong>
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1">
              <li>• Contacta al doctor que te invitó</li>
              <li>• Verifica que tu correo sea el correcto</li>
              <li>• Espera a que el doctor reactive tu acceso</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Verificar Acceso Nuevamente
            </Button>
            <Button variant="secondary" onClick={signOut}>
              Cerrar Sesión
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Si necesitas ayuda, contacta al administrador de la plataforma
          </p>
        </CardContent>
      </Card>
    </div>
  );
};