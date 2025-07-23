import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDoctorAPI } from '@/hooks/useDoctorAPI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  FileText,
  DollarSign
} from 'lucide-react';
import Calendar from 'react-calendar';
import { format, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import 'react-calendar/dist/Calendar.css';

interface Appointment {
  id: string;
  patient_user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  consultation_status?: string;
  price: number | null;
  notes: string | null;
  patient_name?: string;
}

interface PatientSummary {
  patient_user_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  address?: string;
  recent_appointments_count: number;
  last_appointment_date?: string;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    loading,
    getDoctorAppointments,
    getPatientSummary,
    addConsultationNote,
    completeAppointment,
    getAppointmentsByDateRange
  } = useDoctorAPI();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<Appointment[]>([]);
  const [appointmentsByDate, setAppointmentsByDate] = useState<{ [date: string]: Appointment[] }>({});
  const [expandedAppointment, setExpandedAppointment] = useState<string | null>(null);
  const [patientSummaries, setPatientSummaries] = useState<{ [patientId: string]: PatientSummary }>({});
  const [consultationNote, setConsultationNote] = useState('');
  const [consultationPrice, setConsultationPrice] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (user?.id) {
      loadTodayAppointments();
      loadCalendarData();
    }
  }, [user]);

  // Cargar citas cuando cambia la fecha seleccionada
  useEffect(() => {
    if (user?.id) {
      loadAppointmentsForDate(selectedDate);
    }
  }, [selectedDate, user]);

  const loadTodayAppointments = async () => {
    if (!user?.id) return;
    try {
      const appointments = await getDoctorAppointments(user.id);
      setTodayAppointments(appointments);
    } catch (error) {
      console.error('Error loading today appointments:', error);
    }
  };

  const loadCalendarData = async () => {
    if (!user?.id) return;
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
      
      const appointmentsByDateData = await getAppointmentsByDateRange(user.id, startDate, endDate);
      setAppointmentsByDate(appointmentsByDateData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const loadAppointmentsForDate = async (date: Date) => {
    if (!user?.id) return;
    try {
      const dateStr = date.toISOString().split('T')[0];
      const appointments = await getDoctorAppointments(user.id, dateStr);
      setSelectedDateAppointments(appointments);
    } catch (error) {
      console.error('Error loading appointments for date:', error);
    }
  };

  const loadPatientSummary = async (patientUserId: string) => {
    if (patientSummaries[patientUserId]) return;
    
    try {
      const summary = await getPatientSummary(patientUserId);
      if (summary) {
        setPatientSummaries(prev => ({
          ...prev,
          [patientUserId]: summary
        }));
      }
    } catch (error) {
      console.error('Error loading patient summary:', error);
    }
  };

  const handleExpandAppointment = (appointmentId: string, patientUserId: string) => {
    if (expandedAppointment === appointmentId) {
      setExpandedAppointment(null);
    } else {
      setExpandedAppointment(appointmentId);
      loadPatientSummary(patientUserId);
    }
  };

  const handleAddNote = async () => {
    if (!selectedAppointmentId || !consultationNote.trim()) return;

    try {
      const price = consultationPrice ? parseFloat(consultationPrice) : undefined;
      await addConsultationNote(selectedAppointmentId, consultationNote, price);
      
      // Limpiar formulario
      setConsultationNote('');
      setConsultationPrice('');
      setSelectedAppointmentId(null);
      
      // Recargar datos
      loadTodayAppointments();
      loadAppointmentsForDate(selectedDate);
    } catch (error) {
      console.error('Error adding consultation note:', error);
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await completeAppointment(appointmentId);
      loadTodayAppointments();
      loadAppointmentsForDate(selectedDate);
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
  };

  const getStatusBadge = (status: string, consultationStatus?: string) => {
    if (status === 'completed' || consultationStatus === 'completed') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Completada</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="destructive">Cancelada</Badge>;
    }
    if (consultationStatus === 'in_progress') {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">En progreso</Badge>;
    }
    return <Badge variant="secondary">Programada</Badge>;
  };

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm', { locale: es });
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return 'No definido';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0];
      if (appointmentsByDate[dateStr] && appointmentsByDate[dateStr].length > 0) {
        return 'bg-primary/20 hover:bg-primary/30';
      }
    }
    return null;
  };

  const getAppointmentsWithoutNotes = () => {
    return todayAppointments.filter(apt => 
      apt.status !== 'cancelled' && 
      (!apt.notes || apt.notes.trim() === '')
    );
  };

  const getNextAppointment = () => {
    const now = new Date();
    return todayAppointments
      .filter(apt => new Date(apt.starts_at) > now && apt.status !== 'cancelled')
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p>Debes iniciar sesión para acceder al dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appointmentsToShow = isToday(selectedDate) ? todayAppointments : selectedDateAppointments;
  const appointmentsWithoutNotes = getAppointmentsWithoutNotes();
  const nextAppointment = getNextAppointment();

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel lateral */}
        <div className="lg:col-span-1 space-y-4">
          {/* Resumen rápido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Resumen de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total citas</span>
                <Badge variant="outline">{todayAppointments.length}</Badge>
              </div>
              
              {nextAppointment && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Próxima cita</span>
                  <div className="text-sm">
                    <div className="font-medium">{formatTime(nextAppointment.starts_at)}</div>
                    <div className="text-muted-foreground">
                      Paciente: {nextAppointment.patient_user_id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              )}

              {appointmentsWithoutNotes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Alertas</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {appointmentsWithoutNotes.length} citas sin notas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendario */}
          <Card>
            <CardHeader>
              <CardTitle>Calendario</CardTitle>
              <CardDescription>
                Fechas resaltadas tienen citas programadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                onChange={(value) => setSelectedDate(value as Date)}
                value={selectedDate}
                tileClassName={tileClassName}
                locale="es"
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Dashboard de Doctor</h1>
              <p className="text-muted-foreground">
                Citas para {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            <Button onClick={() => {
              loadTodayAppointments();
              loadAppointmentsForDate(selectedDate);
              loadCalendarData();
            }}>
              Actualizar
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Lista de citas */}
          <div className="space-y-4">
            {appointmentsToShow.length > 0 ? (
              appointmentsToShow.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                              {formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}
                            </span>
                          </div>
                          {getStatusBadge(appointment.status, appointment.consultation_status)}
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>Paciente: {appointment.patient_user_id.slice(0, 8)}...</span>
                        </div>

                        {appointment.price && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatPrice(appointment.price)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExpandAppointment(appointment.id, appointment.patient_user_id)}
                        >
                          {expandedAppointment === appointment.id ? 'Ocultar' : 'Ver detalles'}
                        </Button>

                        {appointment.status !== 'completed' && appointment.consultation_status !== 'completed' && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedAppointmentId(appointment.id)}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Agregar Nota
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Agregar Nota de Consulta</DialogTitle>
                                  <DialogDescription>
                                    Añade notas y precio para esta consulta
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="notes">Notas de la consulta</Label>
                                    <Textarea
                                      id="notes"
                                      value={consultationNote}
                                      onChange={(e) => setConsultationNote(e.target.value)}
                                      placeholder="Escribe las notas de la consulta..."
                                      rows={4}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="price">Precio (MXN)</Label>
                                    <Input
                                      id="price"
                                      type="number"
                                      step="0.01"
                                      value={consultationPrice}
                                      onChange={(e) => setConsultationPrice(e.target.value)}
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <Button onClick={handleAddNote} disabled={!consultationNote.trim()}>
                                    Guardar Nota
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              size="sm"
                              onClick={() => handleCompleteAppointment(appointment.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Completar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Información expandida */}
                    {expandedAppointment === appointment.id && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {appointment.notes && (
                          <div>
                            <h4 className="font-medium mb-1">Notas:</h4>
                            <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                          </div>
                        )}

                        {/* Resumen del paciente */}
                        {patientSummaries[appointment.patient_user_id] && (
                          <div>
                            <h4 className="font-medium mb-2">Información del Paciente:</h4>
                            <div className="bg-muted/30 p-3 rounded space-y-1 text-sm">
                              <div><strong>Nombre:</strong> {patientSummaries[appointment.patient_user_id].full_name}</div>
                              {patientSummaries[appointment.patient_user_id].phone && (
                                <div><strong>Teléfono:</strong> {patientSummaries[appointment.patient_user_id].phone}</div>
                              )}
                              {patientSummaries[appointment.patient_user_id].email && (
                                <div><strong>Email:</strong> {patientSummaries[appointment.patient_user_id].email}</div>
                              )}
                              <div><strong>Citas recientes:</strong> {patientSummaries[appointment.patient_user_id].recent_appointments_count}</div>
                              {patientSummaries[appointment.patient_user_id].last_appointment_date && (
                                <div><strong>Última cita:</strong> {format(parseISO(patientSummaries[appointment.patient_user_id].last_appointment_date!), 'dd/MM/yyyy', { locale: es })}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hay citas para esta fecha</h3>
                  <p className="text-muted-foreground">
                    Selecciona otra fecha en el calendario para ver las citas programadas
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}