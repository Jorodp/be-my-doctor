import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConsultationProgress } from '@/components/ConsultationProgress';
import { ConsultationWorkspace } from '@/components/ConsultationWorkspace';
import { DoctorIdentityValidator } from '@/components/DoctorIdentityValidator';
import {
  Users, 
  Clock, 
  Calendar,
  Play,
  Square,
  UserCheck,
  AlertTriangle,
  Timer,
  Stethoscope,
  CheckCircle,
  Phone,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { differenceInMinutes } from 'date-fns';
import { formatTimeInMexicoTZ, formatDateTimeInMexicoTZ } from '@/utils/dateUtils';
import { es } from 'date-fns/locale';

interface Appointment {
  id: string;
  patient_user_id: string;
  doctor_user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  consultation_status: string;
  identity_validated?: boolean;
  identity_validated_at?: string;
  identity_validated_by?: string;
  patient_arrived_at?: string;
  consultation_started_at?: string;
  consultation_ended_at?: string;
  waiting_time_minutes?: number;
  consultation_duration_minutes?: number;
  total_clinic_time_minutes?: number;
  patient_profile?: {
    full_name: string;
    phone?: string;
    profile_image_url?: string;
  };
}

interface ConsultationFlowManagerProps {
  appointments: Appointment[];
  userRole: 'doctor' | 'assistant';
  onAppointmentUpdate: () => void;
}

export const ConsultationFlowManager: React.FC<ConsultationFlowManagerProps> = ({
  appointments,
  userRole,
  onAppointmentUpdate
}) => {
  // Debug: Log the raw appointment data
  console.log('🔍 Raw appointments data:', appointments);
  if (appointments.length > 0) {
    console.log('🔍 First appointment starts_at:', appointments[0].starts_at);
    console.log('🔍 First appointment starts_at type:', typeof appointments[0].starts_at);
    console.log('🔍 First appointment as Date object:', new Date(appointments[0].starts_at));
  }
  const [loading, setLoading] = useState<string | null>(null);
  const [consultationWorkspaceOpen, setConsultationWorkspaceOpen] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [identityValidatorOpen, setIdentityValidatorOpen] = useState(false);
  const [validatingAppointment, setValidatingAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const markPatientArrived = async (appointmentId: string) => {
    if (!user) return;
    
    setLoading(appointmentId);
    try {
      const arrivalTime = new Date().toISOString();
      const { error } = await supabase
        .from('appointments')
        .update({
          patient_arrived_at: arrivalTime,
          marked_arrived_by: user.id,
          consultation_status: 'waiting'
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Paciente registrado",
        description: `Paciente marcado como presente a las ${formatTimeInMexicoTZ(arrivalTime)}`,
      });

      onAppointmentUpdate();
    } catch (error) {
      console.error('Error marking patient arrived:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la llegada del paciente",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const startConsultation = async (appointmentId: string) => {
    if (!user) return;
    
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment?.patient_arrived_at) {
      toast({
        title: "Error",
        description: "El paciente debe estar marcado como presente antes de iniciar la consulta",
        variant: "destructive"
      });
      return;
    }

    // Check if identity is validated
    if (!appointment.identity_validated) {
      // If doctor role, allow them to validate identity first
      if (userRole === 'doctor') {
        setValidatingAppointment(appointment);
        setIdentityValidatorOpen(true);
        return;
      } else {
        toast({
          title: "Validación Requerida",
          description: "La identidad del paciente debe estar validada antes de iniciar la consulta",
          variant: "destructive"
        });
        return;
      }
    }
    
    setLoading(appointmentId);
    try {
      const consultationStartTime = new Date();
      const arrivalTime = new Date(appointment.patient_arrived_at);
      const waitingTimeMinutes = differenceInMinutes(consultationStartTime, arrivalTime);

      const { error } = await supabase
        .from('appointments')
        .update({
          consultation_started_at: consultationStartTime.toISOString(),
          consultation_started_by: user.id,
          consultation_status: 'in_progress',
          waiting_time_minutes: waitingTimeMinutes
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Consulta iniciada",
        description: `Consulta iniciada. Tiempo de espera: ${waitingTimeMinutes} minutos`,
      });

      onAppointmentUpdate();
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast({
        title: "Error",
        description: "No se pudo iniciar la consulta",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const endConsultation = async (appointmentId: string) => {
    if (!user) return;
    
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment?.consultation_started_at) {
      toast({
        title: "Error",
        description: "La consulta debe estar iniciada para poder finalizarla",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(appointmentId);
    try {
      const consultationEndTime = new Date();
      const consultationStartTime = new Date(appointment.consultation_started_at);
      const consultationDurationMinutes = differenceInMinutes(consultationEndTime, consultationStartTime);
      
      // Calculate total clinic time if patient arrived
      let totalClinicTimeMinutes = null;
      if (appointment.patient_arrived_at) {
        const arrivalTime = new Date(appointment.patient_arrived_at);
        totalClinicTimeMinutes = differenceInMinutes(consultationEndTime, arrivalTime);
      }
      
      const { error } = await supabase
        .from('appointments')
        .update({
          consultation_ended_at: consultationEndTime.toISOString(),
          consultation_ended_by: user.id,
          consultation_status: 'completed',
          status: 'completed',
          consultation_duration_minutes: consultationDurationMinutes,
          total_clinic_time_minutes: totalClinicTimeMinutes
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Consulta finalizada",
        description: `Consulta completada. Duración: ${consultationDurationMinutes} min. Tiempo total: ${totalClinicTimeMinutes || 0} min`,
      });

      onAppointmentUpdate();
    } catch (error) {
      console.error('Error ending consultation:', error);
      toast({
        title: "Error",
        description: "No se pudo finalizar la consulta",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const getActionButton = (appointment: Appointment) => {
    if (appointment.status === 'cancelled') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Cancelada
        </Badge>
      );
    }

    switch (appointment.consultation_status) {
      case 'scheduled':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markPatientArrived(appointment.id)}
            disabled={loading === appointment.id}
            className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 bg-blue-25 shadow-sm"
          >
            <UserCheck className="h-4 w-4" />
            {loading === appointment.id ? 'Registrando...' : 'Paciente llegó'}
          </Button>
        );
      
      case 'waiting':
        if (userRole === 'doctor') {
          return (
            <Button
              variant="default"
              size="sm"
              onClick={() => startConsultation(appointment.id)}
              disabled={loading === appointment.id}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
              {loading === appointment.id ? 'Iniciando...' : 'Iniciar consulta'}
            </Button>
          );
        }
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm">
            <Timer className="h-3 w-3" />
            Esperando
          </Badge>
        );

      case 'in_progress':
        if (userRole === 'doctor') {
          return (
            <Button
              variant="default"
              size="sm"
              onClick={() => openConsultationWorkspace(appointment)}
              disabled={loading === appointment.id}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Stethoscope className="h-4 w-4" />
              Abrir Consulta
            </Button>
          );
        }
        return (
          <Badge variant="default" className="gap-1 bg-green-100 text-green-800">
            <Stethoscope className="h-3 w-3" />
            En consulta
          </Badge>
        );

      case 'completed':
        return (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
            <Calendar className="h-3 w-3" />
            Completada
          </Badge>
        );

      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    const result = formatTimeInMexicoTZ(dateString);
    return result;
  };

  const getWaitingTime = (appointment: Appointment) => {
    if (appointment.patient_arrived_at && !appointment.consultation_started_at) {
      const arrivedTime = new Date(appointment.patient_arrived_at);
      const now = new Date();
      const waitingMinutes = Math.floor((now.getTime() - arrivedTime.getTime()) / 60000);
      return `${waitingMinutes}min esperando`;
    }
    return null;
  };

  const openConsultationWorkspace = (appointment: Appointment) => {
    setActiveAppointment(appointment);
    setConsultationWorkspaceOpen(true);
  };

  const handleIdentityValidationComplete = () => {
    // Refresh appointments and then start consultation
    onAppointmentUpdate();
    if (validatingAppointment) {
      // Use setTimeout to ensure the appointment update has been processed
      setTimeout(() => {
        startConsultation(validatingAppointment.id);
      }, 500);
    }
    setValidatingAppointment(null);
  };

  const getTimelineSteps = (appointment: Appointment) => {
    return [
      {
        label: 'Programada',
        time: formatTime(appointment.starts_at),
        icon: Clock,
        completed: true,
        active: appointment.consultation_status === 'scheduled'
      },
      {
        label: 'Llegó',
        time: appointment.patient_arrived_at ? formatTime(appointment.patient_arrived_at) : '--:--',
        icon: UserCheck,
        completed: !!appointment.patient_arrived_at,
        active: appointment.consultation_status === 'waiting'
      },
      {
        label: 'En Consulta',
        time: appointment.consultation_started_at ? formatTime(appointment.consultation_started_at) : '--:--',
        icon: Stethoscope,
        completed: !!appointment.consultation_started_at,
        active: appointment.consultation_status === 'in_progress'
      },
      {
        label: 'Completada',
        time: appointment.consultation_ended_at ? formatTime(appointment.consultation_ended_at) : '--:--',
        icon: CheckCircle,
        completed: !!appointment.consultation_ended_at,
        active: appointment.consultation_status === 'completed'
      }
    ];
  };

  // Filter and sort appointments - exclude cancelled and completed appointments from flow
  const filteredAppointments = appointments.filter(appointment => 
    appointment.status !== 'cancelled' && 
    appointment.consultation_status !== 'completed'
  );

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const statusPriority = {
      'in_progress': 0,
      'waiting': 1,
      'scheduled': 2
    };

    const aPriority = statusPriority[a.consultation_status as keyof typeof statusPriority] ?? 5;
    const bPriority = statusPriority[b.consultation_status as keyof typeof statusPriority] ?? 5;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Flujo de Consultas - {userRole === 'doctor' ? 'Doctor' : 'Asistente'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Gestiona el flujo de consultas del día con tiempos de espera y duración
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {sortedAppointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No hay citas programadas</h3>
            <p className="text-sm text-muted-foreground">
              No tienes citas programadas para hoy
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAppointments.map((appointment) => {
              const timelineSteps = getTimelineSteps(appointment);
              const waitingTime = getWaitingTime(appointment);
              const isInProgress = appointment.consultation_status === 'in_progress';

              return (
                <div key={appointment.id} className="space-y-4">
                  <Card className="transition-all duration-200 hover:shadow-md">
                    <CardContent className="p-6">
                      {/* Header with patient info */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage 
                              src={appointment.patient_profile?.profile_image_url} 
                              alt={appointment.patient_profile?.full_name || 'Paciente'} 
                            />
                            <AvatarFallback>
                              {appointment.patient_profile?.full_name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <h4 className="font-semibold text-lg">
                              {appointment.patient_profile?.full_name || 'Paciente'}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Programada: {formatTime(appointment.starts_at)}
                              </span>
                              {appointment.patient_profile?.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {appointment.patient_profile.phone}
                                </span>
                              )}
                            </div>
                            {/* Identity validation status */}
                            {appointment.consultation_status === 'waiting' && !appointment.identity_validated && (
                              <div className="flex items-center gap-1 text-amber-600 text-xs mt-1">
                                <Shield className="h-3 w-3" />
                                <span>Identidad sin validar</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {getActionButton(appointment)}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {timelineSteps.map((step, index) => {
                          const Icon = step.icon;
                          return (
                            <div 
                              key={step.label}
                              className={`text-center p-3 rounded-lg transition-all duration-300 ${
                                step.active ? 'bg-blue-50 border-2 border-blue-300 ring-2 ring-blue-200' : 
                                step.completed ? 'bg-green-50 border border-green-200' : 
                                'bg-gray-50 border border-gray-200'
                              }`}
                            >
                              <Icon className={`h-6 w-6 mx-auto mb-1 transition-colors ${
                                step.completed ? 'text-green-600' : 
                                step.active ? 'text-blue-600' : 'text-gray-400'
                              }`} />
                              <p className="text-xs font-medium">{step.label}</p>
                              <p className="text-xs text-muted-foreground">{step.time}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Time information */}
                      {(appointment.waiting_time_minutes || appointment.consultation_duration_minutes || waitingTime) && (
                        <div className="flex gap-4 p-3 bg-muted rounded-lg">
                          {waitingTime && (
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-yellow-600 font-medium">{waitingTime}</span>
                            </div>
                          )}
                          {appointment.waiting_time_minutes && (
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">
                                Esperó: <strong>{appointment.waiting_time_minutes} min</strong>
                              </span>
                            </div>
                          )}
                          {appointment.consultation_duration_minutes && (
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-green-600" />
                              <span className="text-sm">
                                Consulta: <strong>{appointment.consultation_duration_minutes} min</strong>
                              </span>
                            </div>
                          )}
                          {appointment.total_clinic_time_minutes && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-purple-600" />
                              <span className="text-sm">
                                Total: <strong>{appointment.total_clinic_time_minutes} min</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Show consultation workspace button for in-progress consultations */}
                  {isInProgress && userRole === 'doctor' && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        La consulta está en progreso. Haz clic en "Abrir Consulta" para gestionar las notas médicas.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Consultation Workspace Modal */}
      {activeAppointment && (
        <ConsultationWorkspace
          isOpen={consultationWorkspaceOpen}
          onClose={() => setConsultationWorkspaceOpen(false)}
          appointment={activeAppointment}
          onConsultationComplete={() => {
            setConsultationWorkspaceOpen(false);
            setActiveAppointment(null);
            onAppointmentUpdate();
          }}
        />
      )}

      {/* Doctor Identity Validator Modal */}
      {validatingAppointment && (
        <DoctorIdentityValidator
          isOpen={identityValidatorOpen}
          onClose={() => {
            setIdentityValidatorOpen(false);
            setValidatingAppointment(null);
          }}
          appointmentId={validatingAppointment.id}
          patientUserId={validatingAppointment.patient_user_id}
          onValidationComplete={handleIdentityValidationComplete}
        />
      )}
    </Card>
  );
};