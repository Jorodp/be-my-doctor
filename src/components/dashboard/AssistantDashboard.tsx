import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, UserCheck, Phone } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

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
        .select(`
          *,
          profiles!patient_user_id (full_name, phone)
        `)
        .eq('doctor_user_id', doctorUserId)
        .gte('starts_at', today.toISOString())
        .lt('starts_at', tomorrow.toISOString())
        .order('starts_at', { ascending: true });

      if (error) throw error;

      setTodayAppointments(appointments || []);
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

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
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
      <header className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Panel del Asistente</h1>
              <p className="text-muted-foreground">Gestiona la agenda del médico asignado</p>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Citas de Hoy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Citas de Hoy
            </CardTitle>
            <CardDescription>
              Pacientes programados para el día actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay citas programadas para hoy
              </p>
            ) : (
              <div className="grid gap-4">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{appointment.patient_profile?.full_name || 'Paciente'}</span>
                        </div>
                        {appointment.patient_profile?.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {appointment.patient_profile.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-col">
                        <Badge>{appointment.status}</Badge>
                        {appointment.status === 'scheduled' && (
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            >
                              Completar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Herramientas para gestionar la agenda médica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button className="h-20 flex flex-col gap-2">
                <Calendar className="h-6 w-6" />
                Agendar Cita
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <UserCheck className="h-6 w-6" />
                Lista de Pacientes
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Clock className="h-6 w-6" />
                Gestionar Horarios
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};