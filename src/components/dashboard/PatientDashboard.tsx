import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from "@/components/ui/DashboardLayout";
import { PendingRatingValidator } from "@/components/PendingRatingValidator";
import { PatientProfileEditor } from "@/components/patient/PatientProfileEditor";
import { PatientDocuments } from "@/components/patient/PatientDocuments";
import { ConsultationNotesViewer } from "@/components/patient/ConsultationNotesViewer";
import { AppointmentChatButton } from "@/components/patient/AppointmentChatButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, User, Clock, CheckCircle, Stethoscope, XCircle, Edit, AlertTriangle, History } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Appointment {
  id: string;
  doctor_user_id: string;
  patient_user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes?: string;
}

interface DoctorProfile {
  user_id: string;
  specialty: string;
  profile_image_url?: string;
  full_name?: string;
}

export const PatientDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [validatorOpen, setValidatorOpen] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [doctorProfiles, setDoctorProfiles] = useState<Record<string, DoctorProfile>>({});
  const [assignedDoctor, setAssignedDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllAppointments();
    }
  }, [user]);

  const fetchAllAppointments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_user_id', user.id)
        .order('starts_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Separate upcoming and completed appointments
      const now = new Date();
      const upcoming = appointmentsData?.filter(apt => 
        apt.status === 'scheduled' && new Date(apt.starts_at) >= now
      ) || [];
      
      const completed = appointmentsData?.filter(apt => 
        apt.status === 'completed'
      ) || [];

      // Sort upcoming by date ascending, completed by date descending
      upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      completed.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

      setUpcomingAppointments(upcoming);
      setCompletedAppointments(completed);

      // Get unique doctor IDs
      const doctorIds = [...new Set(appointmentsData?.map(apt => apt.doctor_user_id) || [])];
      
      if (doctorIds.length > 0) {
        // Fetch doctor profiles
        const { data: doctorsData, error: doctorsError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', doctorIds);

        if (doctorsError) throw doctorsError;

        // Fetch doctor professional info
        const { data: doctorProfilesData, error: doctorProfilesError } = await supabase
          .from('doctor_profiles')
          .select('user_id, specialty, profile_image_url')
          .in('user_id', doctorIds);

        if (doctorProfilesError) throw doctorProfilesError;

        // Combine doctor data
        const doctorsMap: Record<string, DoctorProfile> = {};
        doctorsData?.forEach(doctor => {
          const professionalInfo = doctorProfilesData?.find(dp => dp.user_id === doctor.user_id);
          doctorsMap[doctor.user_id] = {
            user_id: doctor.user_id,
            full_name: doctor.full_name,
            specialty: professionalInfo?.specialty || 'Medicina General',
            profile_image_url: professionalInfo?.profile_image_url
          };
        });

        setDoctorProfiles(doctorsMap);
      }

      // Check for assigned doctor from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('assigned_doctor_id')
        .eq('user_id', user.id)
        .single();

      if (profileData?.assigned_doctor_id) {
        const assignedDoctorData = doctorProfiles[profileData.assigned_doctor_id];
        if (assignedDoctorData) {
          setAssignedDoctor(assignedDoctorData);
        }
      }

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

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancellation_reason: 'Cancelado por paciente',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Cita cancelada",
        description: "Tu cita ha sido cancelada exitosamente",
      });

      fetchAllAppointments(); // Refresh appointments
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la cita",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatAppointmentTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es });
  };

  const renderAppointmentCard = (appointment: Appointment, showActions = false) => {
    const doctor = doctorProfiles[appointment.doctor_user_id];
    return (
      <div key={appointment.id} className="border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {doctor?.profile_image_url ? (
                <img 
                  src={doctor.profile_image_url} 
                  alt={doctor.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h4 className="font-medium">
                Dr. {doctor?.full_name || 'Doctor'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {doctor?.specialty || 'Medicina General'}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatAppointmentTime(appointment.starts_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(appointment.status)}
            <span className="text-sm capitalize">
              {appointment.status === 'completed' ? 'Completada' : 
               appointment.status === 'scheduled' ? 'Programada' :
               appointment.status === 'cancelled' ? 'Cancelada' : 
               appointment.status}
            </span>
          </div>
        </div>
        
        {appointment.notes && (
          <div className="mt-3 p-3 bg-muted rounded-md">
            <p className="text-sm">{appointment.notes}</p>
          </div>
        )}
        
        {/* Actions for upcoming appointments */}
        {showActions && appointment.status === 'scheduled' && (
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "Función próximamente",
                  description: "La función de reprogramar estará disponible pronto",
                });
              }}
            >
              <Edit className="h-4 w-4 mr-1" />
              Reprogramar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancelAppointment(appointment.id)}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        )}
        
        {/* Chat button - only for completed and scheduled appointments */}
        <AppointmentChatButton
          appointmentId={appointment.id}
          doctorName={doctor?.full_name || 'Doctor'}
          appointmentStatus={appointment.status}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Panel del Paciente"
        subtitle="Gestiona tus citas y consultas médicas"
      >
        <div className="flex justify-center items-center min-h-64">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Panel del Paciente"
      subtitle="Gestiona tus citas y consultas médicas"
    >

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Tabs defaultValue="proximas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="proximas" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Próximas Citas
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="notas" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Notas Médicas
            </TabsTrigger>
            <TabsTrigger value="perfil" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Mi Perfil
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proximas" className="space-y-6">
            {assignedDoctor && (
              <Card>
                <CardHeader>
                  <CardTitle>Doctor Asignado</CardTitle>
                  <CardDescription>
                    Información de tu médico de cabecera
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {assignedDoctor.profile_image_url ? (
                        <img 
                          src={assignedDoctor.profile_image_url} 
                          alt={assignedDoctor.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{assignedDoctor.full_name}</h3>
                      <p className="text-muted-foreground">{assignedDoctor.specialty}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Próximas Citas</CardTitle>
                <CardDescription>
                  {upcomingAppointments.length > 0 
                    ? `Tienes ${upcomingAppointments.length} cita(s) programada(s)`
                    : "No tienes citas programadas"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4" />
                    <p>No hay citas programadas</p>
                    <p className="text-sm mt-2">Las citas futuras aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => renderAppointmentCard(appointment, true))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <PendingRatingValidator 
              onValidationComplete={() => {}}
              isOpen={validatorOpen}
              onClose={() => setValidatorOpen(false)}
            />
          </TabsContent>

          <TabsContent value="historial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Citas</CardTitle>
                <CardDescription>
                  {completedAppointments.length > 0 
                    ? `Tienes ${completedAppointments.length} consulta(s) completada(s)`
                    : "Historial de citas médicas completadas"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4" />
                    <p>No hay citas completadas</p>
                    <p className="text-sm mt-2">Las consultas completadas aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedAppointments.map((appointment) => renderAppointmentCard(appointment, false))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notas">
            <ConsultationNotesViewer showAll={true} />
          </TabsContent>

          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <CardTitle>Mi Perfil</CardTitle>
                <CardDescription>
                  Gestiona tu información personal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PatientProfileEditor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card>
              <CardHeader>
                <CardTitle>Mis Documentos</CardTitle>
                <CardDescription>
                  Gestiona tus documentos de identificación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PatientDocuments />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};