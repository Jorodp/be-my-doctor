import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { DashboardHeader } from '@/components/DashboardHeader';
import { PatientDocumentManager } from '@/components/PatientDocumentManager';
import { AssignedDoctorInfo } from '@/components/AssignedDoctorInfo';
import { AssistantScheduleManager } from '@/components/AssistantScheduleManager';
import { AssistantPatientManager } from '@/components/AssistantPatientManager';
import { AssistantAppointmentCreator } from '@/components/AssistantAppointmentCreator';

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  patient_user_id: string;
  patient_profile?: {
    full_name: string;
    phone: string;
  };
}

export const AssistantDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [appointmentPatients, setAppointmentPatients] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      // Get assigned doctor ID from user metadata
      const assignedDoctorId = user.user_metadata?.assigned_doctor_id;
      setDoctorId(assignedDoctorId);
      
      if (assignedDoctorId) {
        fetchTodayAppointments(assignedDoctorId);
      } else {
        setLoading(false);
      }
    }
  }, [user]);

  const fetchTodayAppointments = async (doctorUserId: string) => {
    try {
      // Fetch today's appointments for assigned doctor
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_user_id', doctorUserId)
        .gte('starts_at', today.toISOString())
        .lt('starts_at', tomorrow.toISOString())
        .order('starts_at', { ascending: true });

      if (error) throw error;

      // Fetch patient profiles separately
      const appointmentsWithPatients = await Promise.all(
        (appointments || []).map(async (appointment) => {
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('user_id', appointment.patient_user_id)
            .single();

          return {
            ...appointment,
            patient_profile: patientProfile
          };
        })
      );

      setTodayAppointments(appointmentsWithPatients);
      
      // Extract patient IDs for document validation
      const patientIds = appointmentsWithPatients.map(apt => apt.patient_user_id);
      setAppointmentPatients([...new Set(patientIds)] as string[]); // Remove duplicates
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      // Refresh appointments
      if (doctorId) {
        fetchTodayAppointments(doctorId);
      }

      toast({
        title: "Éxito",
        description: "Estado de la cita actualizado",
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la cita",
        variant: "destructive"
      });
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <DashboardHeader
        title="Panel del Asistente"
        subtitle="Gestiona la agenda del médico asignado"
        onSignOut={signOut}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="schedule">Agenda</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
            <TabsTrigger value="appointments">Nueva Cita</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AssignedDoctorInfo doctorId={doctorId} />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <AssistantScheduleManager doctorId={doctorId} />
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <AssistantPatientManager doctorId={doctorId} />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <AssistantAppointmentCreator doctorId={doctorId} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            {appointmentPatients.length > 0 && (
              <PatientDocumentManager appointmentPatients={appointmentPatients} />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};