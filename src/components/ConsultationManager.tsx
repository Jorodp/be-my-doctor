import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatTimeInMexicoTZ } from '@/utils/dateUtils';
import { 
  Clock, 
  User, 
  Play, 
  CheckCircle, 
  FileText, 
  Save,
  Timer,
  X,
  Calendar
} from 'lucide-react';

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  patient_user_id: string;
  doctor_user_id: string;
  patient_profile?: {
    full_name: string;
    phone: string;
  };
}

interface ConsultationNote {
  id: string;
  appointment_id: string;
  diagnosis: string | null;
  prescription: string | null;
  recommendations: string | null;
  follow_up_date: string | null;
}

interface ConsultationManagerProps {
  appointments: Appointment[];
  currentUserId: string;
  onAppointmentUpdated: () => void;
}

export const ConsultationManager = ({ 
  appointments, 
  currentUserId, 
  onAppointmentUpdated 
}: ConsultationManagerProps) => {
  const { toast } = useToast();
  const [activeConsultation, setActiveConsultation] = useState<string | null>(null);
  const [consultationTimer, setConsultationTimer] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [notesForm, setNotesForm] = useState({
    diagnosis: '',
    prescription: '',
    recommendations: '',
    follow_up_date: ''
  });
  const [existingNotes, setExistingNotes] = useState<ConsultationNote | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter today's appointments with valid statuses
  const todayAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.starts_at);
    const today = new Date();
    const isToday = appointmentDate.toDateString() === today.toDateString();
    const validStatuses = ['scheduled', 'in_progress'];
    
    return isToday && validStatuses.includes(appointment.status);
  }).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  useEffect(() => {
    // Clean up timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const startTimer = () => {
    const interval = setInterval(() => {
      setConsultationTimer(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchExistingNotes = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('consultation_notes')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (data) {
        setExistingNotes(data);
        setNotesForm({
          diagnosis: data.diagnosis || '',
          prescription: data.prescription || '',
          recommendations: data.recommendations || '',
          follow_up_date: data.follow_up_date || ''
        });
      } else {
        setExistingNotes(null);
        setNotesForm({
          diagnosis: '',
          prescription: '',
          recommendations: '',
          follow_up_date: ''
        });
      }
    } catch (error) {
      console.error('Error fetching existing notes:', error);
    }
  };

  const handleStartConsultation = async (appointmentId: string) => {
    try {
      setLoading(true);

      // Update appointment status to in_progress
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .eq('doctor_user_id', currentUserId); // Ensure doctor can only update their own appointments

      if (error) {
        console.error('Error starting consultation:', error);
        throw error;
      }

      // Set active consultation and start timer
      setActiveConsultation(appointmentId);
      setConsultationTimer(0);
      startTimer();

      // Fetch existing notes for this appointment
      await fetchExistingNotes(appointmentId);

      toast({
        title: "Consulta iniciada",
        description: "La consulta ha comenzado. Puedes agregar notas médicas.",
      });

      onAppointmentUpdated();
    } catch (error: any) {
      console.error('Error starting consultation:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo iniciar la consulta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndConsultation = async (appointmentId: string) => {
    try {
      setLoading(true);

      // Validate required diagnosis
      if (!notesForm.diagnosis.trim()) {
        toast({
          title: "Campo requerido",
          description: "El diagnóstico es obligatorio para terminar la consulta",
          variant: "destructive"
        });
        return;
      }

      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) {
        throw new Error('Cita no encontrada');
      }

      // Save or update consultation notes
      const noteData = {
        appointment_id: appointmentId,
        doctor_user_id: currentUserId,
        patient_user_id: appointment.patient_user_id,
        diagnosis: notesForm.diagnosis.trim(),
        prescription: notesForm.prescription.trim() || null,
        recommendations: notesForm.recommendations.trim() || null,
        follow_up_date: notesForm.follow_up_date || null
      };

      if (existingNotes) {
        // Update existing notes
        const { error: notesError } = await supabase
          .from('consultation_notes')
          .update(noteData)
          .eq('id', existingNotes.id);

        if (notesError) throw notesError;
      } else {
        // Create new notes
        const { error: notesError } = await supabase
          .from('consultation_notes')
          .insert(noteData);

        if (notesError) throw notesError;
      }

      // Update appointment status to completed
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .eq('doctor_user_id', currentUserId);

      if (appointmentError) throw appointmentError;

      // Reset consultation state
      setActiveConsultation(null);
      stopTimer();
      setConsultationTimer(0);
      setNotesForm({
        diagnosis: '',
        prescription: '',
        recommendations: '',
        follow_up_date: ''
      });
      setExistingNotes(null);

      toast({
        title: "Consulta finalizada",
        description: "La consulta ha sido completada y las notas médicas guardadas.",
      });

      onAppointmentUpdated();
    } catch (error: any) {
      console.error('Error ending consultation:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo finalizar la consulta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Programada</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">En progreso</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
      case 'no_show':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">No se presentó</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isAppointmentActionable = (appointment: Appointment) => {
    return ['scheduled', 'in_progress'].includes(appointment.status);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Citas de Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes citas programadas para hoy</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`border rounded-lg p-4 ${
                    ['cancelled', 'no_show'].includes(appointment.status) 
                      ? 'opacity-50 bg-gray-50' 
                      : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {appointment.patient_profile?.full_name || 'Paciente sin nombre'}
                        </span>
                        {getStatusBadge(appointment.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTimeInMexicoTZ(appointment.starts_at)} - 
                          {formatTimeInMexicoTZ(appointment.ends_at)}
                        </span>
                        {appointment.patient_profile?.phone && (
                          <>
                            <span>•</span>
                            <span>{appointment.patient_profile.phone}</span>
                          </>
                        )}
                      </div>
                      
                      {activeConsultation === appointment.id && (
                        <div className="flex items-center gap-2 text-sm">
                          <Timer className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 font-medium">
                            Tiempo transcurrido: {formatTimer(consultationTimer)}
                          </span>
                        </div>
                      )}
                    </div>

                    {isAppointmentActionable(appointment) && (
                      <div className="flex gap-2">
                        {appointment.status === 'scheduled' && (
                          <Button
                            onClick={() => handleStartConsultation(appointment.id)}
                            disabled={loading || activeConsultation !== null}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Iniciar Consulta
                          </Button>
                        )}
                        
                        {appointment.status === 'in_progress' && activeConsultation === appointment.id && (
                          <Button
                            onClick={() => handleEndConsultation(appointment.id)}
                            disabled={loading}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Terminar Consulta
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consultation Notes Form */}
      {activeConsultation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notas de Consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnóstico *</Label>
                <Textarea
                  id="diagnosis"
                  value={notesForm.diagnosis}
                  onChange={(e) => setNotesForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Describe el diagnóstico del paciente..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prescription">Receta médica</Label>
                <Textarea
                  id="prescription"
                  value={notesForm.prescription}
                  onChange={(e) => setNotesForm(prev => ({ ...prev, prescription: e.target.value }))}
                  placeholder="Medicamentos y dosificación..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendations">Recomendaciones</Label>
                <Textarea
                  id="recommendations"
                  value={notesForm.recommendations}
                  onChange={(e) => setNotesForm(prev => ({ ...prev, recommendations: e.target.value }))}
                  placeholder="Recomendaciones de cuidados, estudios adicionales, etc..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="follow_up_date">Fecha de seguimiento</Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  value={notesForm.follow_up_date}
                  onChange={(e) => setNotesForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveConsultation(null);
                    stopTimer();
                    setConsultationTimer(0);
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleEndConsultation(activeConsultation)}
                  disabled={loading || !notesForm.diagnosis.trim()}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {loading ? 'Guardando...' : 'Guardar y Terminar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};