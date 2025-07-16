import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, MapPin, User, CheckCircle2, AlertCircle, Star } from 'lucide-react';

interface ConsultationProgressProps {
  appointment: {
    id: string;
    consultation_status: string;
    patient_arrived_at?: string;
    consultation_started_at?: string;
    consultation_ended_at?: string;
    waiting_time_minutes?: number;
    consultation_duration_minutes?: number;
    total_clinic_time_minutes?: number;
    starts_at: string;
  };
  showPatientView?: boolean;
}

export const ConsultationProgress: React.FC<ConsultationProgressProps> = ({ 
  appointment, 
  showPatientView = false 
}) => {
  
  const getStatusInfo = (status: string) => {
    const statusMap = {
      'scheduled': {
        icon: Clock,
        label: 'Programada',
        color: 'bg-blue-500',
        progress: 0,
        description: 'Tu cita está programada'
      },
      'waiting': {
        icon: MapPin,
        label: 'Esperando',
        color: 'bg-yellow-500',
        progress: 25,
        description: 'Has llegado, esperando ser llamado'
      },
      'in_progress': {
        icon: User,
        label: 'En consulta',
        color: 'bg-green-500',
        progress: 75,
        description: 'Tu consulta está en curso'
      },
      'completed': {
        icon: CheckCircle2,
        label: 'Finalizada',
        color: 'bg-primary',
        progress: 100,
        description: 'Consulta finalizada exitosamente'
      },
      'cancelled': {
        icon: AlertCircle,
        label: 'Cancelada',
        color: 'bg-red-500',
        progress: 0,
        description: 'La cita fue cancelada'
      }
    };
    
    return statusMap[status as keyof typeof statusMap] || statusMap.scheduled;
  };

  const statusInfo = getStatusInfo(appointment.consultation_status);
  const StatusIcon = statusInfo.icon;

  const getTimeDisplay = () => {
    const scheduledTime = new Date(appointment.starts_at).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (appointment.consultation_status === 'scheduled') {
      return `Programada para las ${scheduledTime}`;
    }

    if (appointment.patient_arrived_at) {
      const arrivedTime = new Date(appointment.patient_arrived_at).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });

      if (appointment.consultation_status === 'waiting') {
        return `Llegaste a las ${arrivedTime}`;
      }

      if (appointment.consultation_started_at) {
        const startedTime = new Date(appointment.consultation_started_at).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        });

        if (appointment.consultation_status === 'in_progress') {
          return `Consulta iniciada a las ${startedTime}`;
        }

        if (appointment.consultation_ended_at) {
          const endedTime = new Date(appointment.consultation_ended_at).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          });
          return `Consulta finalizada a las ${endedTime}`;
        }
      }
    }

    return `Programada para las ${scheduledTime}`;
  };

  const steps = [
    {
      key: 'scheduled',
      icon: '🗓️',
      label: 'Programada',
      isActive: true,
      isCompleted: ['waiting', 'in_progress', 'completed'].includes(appointment.consultation_status)
    },
    {
      key: 'waiting',
      icon: '🚶‍♂️',
      label: 'Has llegado',
      isActive: appointment.consultation_status === 'waiting',
      isCompleted: ['in_progress', 'completed'].includes(appointment.consultation_status)
    },
    {
      key: 'in_progress',
      icon: '🩺',
      label: 'En consulta',
      isActive: appointment.consultation_status === 'in_progress',
      isCompleted: appointment.consultation_status === 'completed'
    },
    {
      key: 'completed',
      icon: '✅',
      label: 'Finalizada',
      isActive: appointment.consultation_status === 'completed',
      isCompleted: appointment.consultation_status === 'completed'
    }
  ];

  if (appointment.consultation_status === 'cancelled') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-800">Cita Cancelada</h3>
            <p className="text-sm text-red-700">Esta cita fue cancelada</p>
          </div>
        </div>
      </div>
    );
  }

  if (showPatientView) {
    return (
      <div className="bg-gradient-to-r from-background to-muted/20 rounded-lg p-6 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Estado de tu consulta</h3>
            <Badge variant="outline" className={`${statusInfo.color} text-white`}>
              {statusInfo.label}
            </Badge>
          </div>
          <Progress value={statusInfo.progress} className="h-2" />
        </div>

        {/* Timeline */}
        <div className="flex justify-between items-center relative">
          {steps.map((step, index) => (
            <div key={step.key} className="flex flex-col items-center space-y-2 relative z-10">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-lg
                ${step.isCompleted ? 'bg-primary text-white' : 
                  step.isActive ? 'bg-yellow-100 border-2 border-yellow-500' : 
                  'bg-muted text-muted-foreground'}
              `}>
                {step.icon}
              </div>
              <span className={`text-xs text-center font-medium
                ${step.isCompleted || step.isActive ? 'text-foreground' : 'text-muted-foreground'}
              `}>
                {step.label}
              </span>
            </div>
          ))}
          {/* Connection line */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted -z-0"></div>
        </div>

        {/* Time Info */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{getTimeDisplay()}</p>
          {statusInfo.description && (
            <p className="text-sm font-medium mt-1">{statusInfo.description}</p>
          )}
        </div>

        {/* Metrics */}
        {appointment.consultation_status === 'completed' && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            {appointment.waiting_time_minutes && (
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">
                  {Math.round(appointment.waiting_time_minutes)}min
                </p>
                <p className="text-xs text-muted-foreground">Tiempo de espera</p>
              </div>
            )}
            {appointment.consultation_duration_minutes && (
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">
                  {Math.round(appointment.consultation_duration_minutes)}min
                </p>
                <p className="text-xs text-muted-foreground">Duración consulta</p>
              </div>
            )}
            {appointment.total_clinic_time_minutes && (
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">
                  {Math.round(appointment.total_clinic_time_minutes)}min
                </p>
                <p className="text-xs text-muted-foreground">Tiempo total</p>
              </div>
            )}
          </div>
        )}

        {/* Rating CTA */}
        {appointment.consultation_status === 'completed' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <Star className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <h4 className="font-medium text-yellow-800">¡Califica tu experiencia!</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Tu opinión nos ayuda a mejorar nuestro servicio
            </p>
          </div>
        )}
      </div>
    );
  }

  // Doctor/Assistant view - compact version
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className={`w-3 h-3 rounded-full ${statusInfo.color}`}></div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4" />
          <span className="font-medium">{statusInfo.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{getTimeDisplay()}</p>
      </div>
      {appointment.consultation_status === 'completed' && (
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {appointment.consultation_duration_minutes && 
              `${Math.round(appointment.consultation_duration_minutes)}min`}
          </p>
        </div>
      )}
    </div>
  );
};