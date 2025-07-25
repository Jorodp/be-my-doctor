import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Stethoscope, 
  User, 
  Clock, 
  Calendar,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  Save,
  History,
  Timer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ConsultationNotesForm } from './ConsultationNotesForm';
import { useDoctorAPI } from '@/hooks/useDoctorAPI';

interface ConsultationWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onConsultationComplete: () => void;
}

interface PatientProfile {
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  date_of_birth: string;
  profile_image_url: string;
  email: string;
}

interface PatientHistory {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  consultation_notes?: {
    diagnosis: string;
    prescription: string;
    recommendations: string;
    follow_up_date: string;
  }[];
}

export function ConsultationWorkspace({
  isOpen,
  onClose,
  appointment,
  onConsultationComplete,
}: ConsultationWorkspaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { completeAppointment, loading: apiLoading } = useDoctorAPI();
  
  const [loading, setLoading] = useState(false);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientHistory[]>([]);
  const [consultationStartTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (isOpen && appointment) {
      fetchPatientData();
    }
  }, [isOpen, appointment]);

  // Timer para tiempo transcurrido
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - consultationStartTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, consultationStartTime]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      // Obtener perfil del paciente
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', appointment.patient_user_id)
        .single();

      if (profileError) throw profileError;
      setPatientProfile(profile);

      // Obtener historial del paciente (últimas 5 citas completadas)
      const { data: history, error: historyError } = await supabase
        .from('appointments')
        .select(`
          id,
          starts_at,
          ends_at,
          status,
          consultation_notes (
            diagnosis,
            prescription,
            recommendations,
            follow_up_date
          )
        `)
        .eq('patient_user_id', appointment.patient_user_id)
        .eq('status', 'completed')
        .neq('id', appointment.id)
        .order('ends_at', { ascending: false })
        .limit(5);

      if (historyError) throw historyError;
      setPatientHistory(history || []);

    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del paciente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 'No especificada';
    const today = new Date();
    const birth = new Date(dateOfBirth);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishConsultation = async () => {
    try {
      setLoading(true);
      
      // Verificar que existan notas de consulta
      const { data: notes, error: notesError } = await supabase
        .from('consultation_notes')
        .select('diagnosis')
        .eq('appointment_id', appointment.id)
        .single();

      if (notesError || !notes?.diagnosis?.trim()) {
        toast({
          title: "Notas requeridas",
          description: "Debes completar al menos el diagnóstico antes de finalizar la consulta",
          variant: "destructive",
        });
        return;
      }

      // Completar la cita usando el hook de la API
      await completeAppointment(appointment.id);
      
      toast({
        title: "Consulta Finalizada",
        description: "La consulta se ha completado exitosamente",
      });

      onConsultationComplete();
      onClose();

    } catch (error) {
      console.error('Error finishing consultation:', error);
      toast({
        title: "Error",
        description: "No se pudo finalizar la consulta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-6 w-6 text-primary" />
              <span>Consulta en Progreso</span>
              <Badge variant="default" className="bg-green-600">
                <Timer className="h-3 w-3 mr-1" />
                {formatElapsedTime(elapsedTime)}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onClose}
            >
              Minimizar
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del Paciente */}
          <div className="lg:col-span-1 space-y-4">
            {patientProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información del Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {patientProfile.full_name?.split(' ').map(n => n[0]).join('') || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="font-semibold">{patientProfile.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {calculateAge(patientProfile.date_of_birth)} años
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{patientProfile.phone || 'No especificado'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {patientProfile.date_of_birth 
                          ? format(new Date(patientProfile.date_of_birth), 'dd/MM/yyyy', { locale: es })
                          : 'No especificada'
                        }
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{patientProfile.address || 'No especificada'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historial del Paciente */}
            {patientHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historial Reciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patientHistory.slice(0, 3).map((history) => (
                      <div key={history.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">
                            {format(new Date(history.ends_at), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Completada
                          </Badge>
                        </div>
                        {history.consultation_notes?.[0]?.diagnosis && (
                          <p className="text-sm text-muted-foreground">
                            {history.consultation_notes[0].diagnosis.substring(0, 80)}
                            {history.consultation_notes[0].diagnosis.length > 80 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Formulario de Notas de Consulta */}
          <div className="lg:col-span-2">
            <ConsultationNotesForm
              appointmentId={appointment.id}
              patientName={patientProfile?.full_name || 'Paciente'}
              onSave={() => {
                // Opcional: podrías actualizar algo aquí
              }}
            />
            
            {/* Botón para finalizar consulta */}
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">Finalizar Consulta</h3>
                    <p className="text-sm text-muted-foreground">
                      Una vez finalizada, las notas se guardarán y el paciente podrá ver la información.
                    </p>
                  </div>
                  <Button 
                    onClick={handleFinishConsultation}
                    disabled={loading || apiLoading}
                    size="lg"
                    className="gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    {loading || apiLoading ? 'Finalizando...' : 'Finalizar Consulta'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}