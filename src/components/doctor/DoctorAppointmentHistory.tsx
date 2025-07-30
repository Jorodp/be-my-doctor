import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EnhancedChatInterface } from '@/components/doctor/EnhancedChatInterface';
import { 
  Search, 
  Calendar, 
  User, 
  Clock, 
  MessageSquare,
  FileText,
  Star,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInMexicoTZ } from '@/utils/dateUtils';
import { debugTimezone } from '@/utils/timezoneDebug';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AppointmentHistory {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes?: string;
  consultation_duration_minutes?: number;
  waiting_time_minutes?: number;
  patient_user_id: string;
  patient_profile?: {
    full_name: string;
    profile_image_url?: string;
    phone?: string;
  };
  consultation_notes?: {
    diagnosis?: string;
    prescription?: string;
    recommendations?: string;
  };
  rating?: {
    stars: number;
    comment?: string;
  };
}

export const DoctorAppointmentHistory = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentHistory[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('30');
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentHistory | null>(null);

  useEffect(() => {
    fetchAppointmentHistory();
  }, [user, dateFilter]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, appointments]);

  const fetchAppointmentHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const daysBack = parseInt(dateFilter);
      const fromDate = startOfDay(subDays(new Date(), daysBack));
      const toDate = endOfDay(new Date());

      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          id,
          starts_at,
          ends_at,
          status,
          notes,
          consultation_duration_minutes,
          waiting_time_minutes,
          patient_user_id
        `)
        .eq('doctor_user_id', user.id)
        .lte('ends_at', toDate.toISOString())
        .gte('starts_at', fromDate.toISOString())
        .in('status', ['completed', 'cancelled'])
        .order('starts_at', { ascending: false });

      if (error) throw error;

      // Fetch patient profiles and consultation notes separately
      const processedAppointments = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          // Fetch patient profile
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('full_name, profile_image_url, phone')
            .eq('user_id', appointment.patient_user_id)
            .single();

          // Fetch consultation notes
          const { data: consultationNotes } = await supabase
            .from('consultation_notes')
            .select('diagnosis, prescription, recommendations')
            .eq('appointment_id', appointment.id)
            .single();

          // Fetch rating
          const { data: rating } = await supabase
            .from('doctor_ratings')
            .select('rating, comment')
            .eq('appointment_id', appointment.id)
            .single();

          return {
            ...appointment,
            patient_profile: patientProfile,
            consultation_notes: consultationNotes,
            rating: rating ? {
              stars: rating.rating,
              comment: rating.comment
            } : undefined
          };
        })
      );

      setAppointments(processedAppointments);
    } catch (error) {
      console.error('Error fetching appointment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = appointments;

    // Filtro por nombre
    if (searchTerm.trim()) {
      filtered = filtered.filter(appointment =>
        appointment.patient_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    setFilteredAppointments(filtered);
  };

  const handleChatClick = async (appointment: AppointmentHistory) => {
    if (appointment.status !== 'completed') {
      return; // Solo permitir chat en citas completadas
    }
    
    setSelectedAppointment(appointment);
    setChatOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'scheduled':
        return 'Programada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Historial de Citas
        </CardTitle>
        <CardDescription>
          Revisa tus citas pasadas y comunícate con pacientes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="scheduled">Programadas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 3 meses</SelectItem>
                <SelectItem value="365">Último año</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchAppointmentHistory}>
              <Filter className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {/* Lista de citas */}
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <p>
                {searchTerm || statusFilter !== 'all' 
                  ? 'No se encontraron citas con los filtros aplicados' 
                  : 'No tienes citas en este período'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
               {filteredAppointments.map((appointment) => {
                 return (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar>
                        <AvatarImage src={appointment.patient_profile?.profile_image_url} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">
                            {appointment.patient_profile?.full_name || 'Paciente sin nombre'}
                          </h4>
                        <Badge variant={getStatusBadgeVariant(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {(() => {
                              // Las citas se almacenan como hora local de México pero marcadas como UTC
                              // Por eso las tomamos tal como están sin conversión de timezone
                              const dateStr = appointment.starts_at.replace('Z', '').replace('+00:00', '');
                              const localDate = new Date(dateStr);
                              
                              return localDate.toLocaleString('es-MX', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              });
                            })()}
                          </div>
                          
                          {appointment.consultation_duration_minutes && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Duración: {appointment.consultation_duration_minutes} min
                            </div>
                          )}
                          
                          {appointment.patient_profile?.phone && (
                            <div className="flex items-center gap-2">
                              <span>📞</span>
                              {appointment.patient_profile.phone}
                            </div>
                          )}
                          
                          {appointment.rating && (
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              {appointment.rating.stars}/5 estrellas
                            </div>
                          )}
                        </div>

                        {appointment.consultation_notes && (
                          <div className="bg-muted p-3 rounded-md mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium text-sm">Notas de consulta</span>
                            </div>
                            {appointment.consultation_notes.diagnosis && (
                              <p className="text-sm mb-1">
                                <strong>Diagnóstico:</strong> {appointment.consultation_notes.diagnosis}
                              </p>
                            )}
                            {appointment.consultation_notes.prescription && (
                              <p className="text-sm mb-1">
                                <strong>Prescripción:</strong> {appointment.consultation_notes.prescription}
                              </p>
                            )}
                          </div>
                        )}

                        {appointment.rating?.comment && (
                          <div className="bg-blue-50 p-3 rounded-md mb-3">
                            <p className="text-sm italic">"{appointment.rating.comment}"</p>
                          </div>
                        )}

                        {appointment.notes && (
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm">{appointment.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {appointment.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChatClick(appointment)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chat
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Enhanced Chat Interface */}
        {selectedAppointment && (
          <EnhancedChatInterface
            isOpen={chatOpen}
            onClose={() => {
              setChatOpen(false);
              setSelectedAppointment(null);
            }}
            appointmentId={selectedAppointment.id}
            patientName={selectedAppointment.patient_profile?.full_name || 'Paciente'}
            patientId={selectedAppointment.patient_user_id}
            doctorId={user?.id || ''}
          />
        )}
      </CardContent>
    </Card>
  );
};