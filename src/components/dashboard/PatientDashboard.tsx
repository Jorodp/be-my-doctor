import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Star, FileText } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { RatingModal } from '@/components/RatingModal';

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number;
  doctor_user_id: string;
  doctor_profile?: {
    full_name: string;
    specialty: string;
  };
  consultation_notes?: {
    diagnosis: string;
    prescription: string;
    recommendations: string;
  }[];
  ratings?: {
    rating: number;
    comment: string;
  }[];
}

export const PatientDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;

    try {
      // Fetch upcoming appointments
      const { data: upcoming, error: upcomingError } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!doctor_user_id (full_name),
          consultation_notes (*),
          ratings (rating, comment)
        `)
        .eq('patient_user_id', user.id)
        .eq('status', 'scheduled')
        .gt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true });

      if (upcomingError) throw upcomingError;

      // Fetch past appointments
      const { data: past, error: pastError } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!doctor_user_id (full_name),
          consultation_notes (*),
          ratings (rating, comment)
        `)
        .eq('patient_user_id', user.id)
        .in('status', ['completed'])
        .order('starts_at', { ascending: false });

      if (pastError) throw pastError;

      setUpcomingAppointments(upcoming || []);
      setPastAppointments(past || []);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Panel del Paciente</h1>
              <p className="text-muted-foreground">Gestiona tus citas y consultas médicas</p>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Próximas Citas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Citas
            </CardTitle>
            <CardDescription>
              Citas programadas para los próximos días
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tienes citas programadas
              </p>
            ) : (
              <div className="grid gap-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{appointment.doctor_profile?.full_name || 'Doctor'}</span>
                          <Badge variant="secondary">Especialista</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(appointment.starts_at)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}
                        </div>
                      </div>
                      <Badge>{appointment.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de Consultas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Consultas
            </CardTitle>
            <CardDescription>
              Consultas anteriores y notas médicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pastAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tienes consultas anteriores
              </p>
            ) : (
              <div className="grid gap-4">
                {pastAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{appointment.doctor_profile?.full_name || 'Doctor'}</span>
                          <Badge variant="secondary">Especialista</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(appointment.starts_at)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {appointment.ratings && appointment.ratings.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{appointment.ratings[0].rating}/5</span>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            Calificar
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {appointment.consultation_notes && appointment.consultation_notes.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        {appointment.consultation_notes[0].diagnosis && (
                          <div>
                            <strong>Diagnóstico:</strong> {appointment.consultation_notes[0].diagnosis}
                          </div>
                        )}
                        {appointment.consultation_notes[0].prescription && (
                          <div>
                            <strong>Receta:</strong> {appointment.consultation_notes[0].prescription}
                          </div>
                        )}
                        {appointment.consultation_notes[0].recommendations && (
                          <div>
                            <strong>Recomendaciones:</strong> {appointment.consultation_notes[0].recommendations}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Modal */}
        {selectedAppointment && (
          <RatingModal
            appointmentId={selectedAppointment.id}
            doctorId={selectedAppointment.doctor_user_id}
            onClose={() => setSelectedAppointment(null)}
            onSuccess={() => {
              setSelectedAppointment(null);
              fetchAppointments();
            }}
          />
        )}
      </main>
    </div>
  );
};