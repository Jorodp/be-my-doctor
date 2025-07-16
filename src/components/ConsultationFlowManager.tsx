import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConsultationProgress } from '@/components/ConsultationProgress';
import { 
  Users, 
  Clock, 
  Calendar,
  Play,
  Square,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Appointment {
  id: string;
  patient_user_id: string;
  doctor_user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  consultation_status: string;
  patient_arrived_at?: string;
  consultation_started_at?: string;
  consultation_ended_at?: string;
  waiting_time_minutes?: number;
  consultation_duration_minutes?: number;
  total_clinic_time_minutes?: number;
  patient_profile?: {
    full_name: string;
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
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const markPatientArrived = async (appointmentId: string) => {
    if (!user) return;
    
    setLoading(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          patient_arrived_at: new Date().toISOString(),
          marked_arrived_by: user.id,
          consultation_status: 'waiting'
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Paciente registrado",
        description: "Se ha marcado la llegada del paciente",
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
    
    setLoading(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          consultation_started_at: new Date().toISOString(),
          consultation_started_by: user.id,
          consultation_status: 'in_progress'
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Consulta iniciada",
        description: "Se ha iniciado la consulta médica",
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
    
    setLoading(appointmentId);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('appointments')
        .update({
          consultation_ended_at: now,
          consultation_ended_by: user.id,
          consultation_status: 'completed',
          status: 'completed'
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Consulta finalizada",
        description: "Se ha finalizado la consulta médica",
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
            className="gap-2"
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
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {loading === appointment.id ? 'Iniciando...' : 'Iniciar consulta'}
            </Button>
          );
        }
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Esperando
          </Badge>
        );

      case 'in_progress':
        if (userRole === 'doctor') {
          return (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => endConsultation(appointment.id)}
              disabled={loading === appointment.id}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              {loading === appointment.id ? 'Finalizando...' : 'Finalizar consulta'}
            </Button>
          );
        }
        return (
          <Badge variant="default" className="gap-1">
            <Users className="h-3 w-3" />
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

  const getWaitingTime = (appointment: Appointment) => {
    if (appointment.patient_arrived_at && !appointment.consultation_started_at) {
      const arrivedTime = new Date(appointment.patient_arrived_at);
      const now = new Date();
      const waitingMinutes = Math.floor((now.getTime() - arrivedTime.getTime()) / 60000);
      return `${waitingMinutes}min esperando`;
    }
    return null;
  };

  // Sort appointments by consultation flow priority
  const sortedAppointments = [...appointments].sort((a, b) => {
    const statusPriority = {
      'in_progress': 0,
      'waiting': 1,
      'scheduled': 2,
      'completed': 3,
      'cancelled': 4
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
          Gestiona el flujo de consultas del día
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
          <div className="space-y-3">
            {sortedAppointments.map((appointment) => (
              <Card key={appointment.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={appointment.patient_profile?.profile_image_url} 
                          alt={appointment.patient_profile?.full_name || 'Paciente'} 
                        />
                        <AvatarFallback>
                          {appointment.patient_profile?.full_name?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold">
                          {appointment.patient_profile?.full_name || 'Paciente'}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(appointment.starts_at).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {getWaitingTime(appointment) && (
                            <span className="text-orange-600 font-medium">
                              {getWaitingTime(appointment)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getActionButton(appointment)}
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <ConsultationProgress 
                      appointment={appointment} 
                      showPatientView={false} 
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};