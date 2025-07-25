import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/ui/DashboardLayout';
import { AssignedDoctorInfo } from '@/components/AssignedDoctorInfo';
import { AssistantScheduleManager } from '@/components/AssistantScheduleManager';
import { AssistantAppointmentCreator } from '@/components/AssistantAppointmentCreator';
import { AssistantUpcomingAppointments } from '@/components/AssistantUpcomingAppointments';
import { AssistantPaymentManager } from '@/components/AssistantPaymentManager';
import { AssistantAccessGuard } from '@/components/AssistantAccessGuard';
import { AssistantTodayAppointments } from '@/components/AssistantTodayAppointments';


export const AssistantDashboard = () => {
  return (
    <AssistantAccessGuard>
      <AssistantDashboardContent />
    </AssistantAccessGuard>
  );
};

const AssistantDashboardContent = () => {
  const { user, signOut, profile } = useAuth();
  const { toast } = useToast();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      fetchAssignedDoctorId();
    }
  }, [user, profile]);

  const fetchAssignedDoctorId = async () => {
    try {
      if (!user || !profile) return;

      // Get assistant's internal ID
      const { data: assistantProfile } = await supabase
        .from('profiles')
        .select('id, assigned_doctor_id')
        .eq('user_id', user.id)
        .eq('role', 'assistant')
        .single();

      if (!assistantProfile) {
        setLoading(false);
        return;
      }

      let doctorUserId = null;

      // Check for specific clinic assignments (NEW METHOD)
      const { data: clinicAssignments } = await supabase
        .from('clinic_assistants')
        .select('clinic_id')
        .eq('assistant_id', assistantProfile.id);

      if (clinicAssignments && clinicAssignments.length > 0) {
        // Get doctor from the first assigned clinic
        const { data: clinic } = await supabase
          .from('clinics')
          .select('doctor_id')
          .eq('id', clinicAssignments[0].clinic_id)
          .single();

        if (clinic) {
          const { data: doctorProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('id', clinic.doctor_id)
            .single();

          if (doctorProfile) {
            doctorUserId = doctorProfile.user_id;
          }
        }
      }

      // Fallback to legacy assignment
      if (!doctorUserId && assistantProfile.assigned_doctor_id) {
        doctorUserId = assistantProfile.assigned_doctor_id;
      }

      // Check doctor_assistants table as another fallback
      if (!doctorUserId) {
        const { data: doctorAssistantAssignments } = await supabase
          .from('doctor_assistants')
          .select('doctor_id')
          .eq('assistant_id', assistantProfile.id);

        if (doctorAssistantAssignments && doctorAssistantAssignments.length > 0) {
          const { data: doctorProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('id', doctorAssistantAssignments[0].doctor_id)
            .single();

          if (doctorProfile) {
            doctorUserId = doctorProfile.user_id;
          }
        }
      }

      console.log('Assistant assigned doctor ID:', doctorUserId);
      setDoctorId(doctorUserId);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching assigned doctor:', error);
      setLoading(false);
    }
  };


  if (loading) {
    return <LoadingSpinner />;
  }

  if (!doctorId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Configuración Requerida</CardTitle>
            </CardHeader>
            <CardContent>
              <p>No tienes un médico asignado. Contacta al administrador para configurar tu cuenta.</p>
              <Button variant="outline" onClick={() => signOut()} className="mt-4">
                Cerrar Sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Panel del Asistente"
      subtitle="Gestiona la agenda del médico asignado"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="today-appointments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 text-xs">
            <TabsTrigger value="today-appointments">Citas de Hoy</TabsTrigger>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="appointments">Próximas Citas</TabsTrigger>
            <TabsTrigger value="schedule">Agenda</TabsTrigger>
            <TabsTrigger value="new-appointment">Nueva Cita</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
          </TabsList>

          <TabsContent value="today-appointments" className="space-y-6">
            <AssistantTodayAppointments doctorId={doctorId} />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <AssignedDoctorInfo doctorId={doctorId} />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <AssistantUpcomingAppointments doctorId={doctorId} />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            {/* Pasar doctorId solo si hay uno específico asignado, de lo contrario el componente manejará múltiples doctores */}
            <AssistantScheduleManager doctorId={doctorId || undefined} />
          </TabsContent>

          <TabsContent value="new-appointment" className="space-y-6">
            <AssistantAppointmentCreator doctorId={doctorId} />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <AssistantPaymentManager doctorId={doctorId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};