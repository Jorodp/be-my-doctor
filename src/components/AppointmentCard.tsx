import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AppointmentActions } from '@/components/AppointmentActions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  User,
  Phone,
  Clock,
  Calendar,
  Stethoscope
} from 'lucide-react';

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  doctor_user_id: string;
  patient_user_id: string;
  notes?: string;
  patient_profile?: {
    full_name: string;
    phone: string;
  };
  doctor_profile?: {
    full_name: string;
    specialty: string;
  };
}

interface AppointmentCardProps {
  appointment: Appointment;
  userRole: 'patient' | 'doctor' | 'assistant' | 'admin';
  currentUserId: string;
  onAppointmentUpdated: () => void;
  showPatientInfo?: boolean;
  showDoctorInfo?: boolean;
  compact?: boolean;
}

export function AppointmentCard({
  appointment,
  userRole,
  currentUserId,
  onAppointmentUpdated,
  showPatientInfo = true,
  showDoctorInfo = false,
  compact = false
}: AppointmentCardProps) {
  const appointmentDateTime = new Date(appointment.starts_at);
  const isToday = format(appointmentDateTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isPast = appointmentDateTime < new Date();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'no_show':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programada';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      case 'no_show':
        return 'No asistió';
      default:
        return status;
    }
  };

  if (compact) {
    return (
      <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              {showPatientInfo && appointment.patient_profile && (
                <span className="font-medium text-sm">
                  {appointment.patient_profile.full_name}
                </span>
              )}
              {showDoctorInfo && appointment.doctor_profile && (
                <span className="font-medium text-sm">
                  Dr. {appointment.doctor_profile.full_name}
                </span>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(appointmentDateTime, 'HH:mm')}
                {isToday && <Badge variant="outline" className="text-xs px-1 py-0">Hoy</Badge>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(appointment.status)} className="text-xs">
              {getStatusText(appointment.status)}
            </Badge>
            
            <AppointmentActions
              appointment={appointment}
              userRole={userRole}
              currentUserId={currentUserId}
              onAppointmentUpdated={onAppointmentUpdated}
              showPatientName={showPatientInfo}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${isPast ? 'opacity-75' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {showPatientInfo && appointment.patient_profile ? (
                  appointment.patient_profile.full_name.split(' ').map(n => n[0]).join('')
                ) : showDoctorInfo && appointment.doctor_profile ? (
                  appointment.doctor_profile.full_name.split(' ').map(n => n[0]).join('')
                ) : (
                  <User className="h-6 w-6" />
                )}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2 flex-1">
              {/* Patient/Doctor Info */}
              {showPatientInfo && appointment.patient_profile && (
                <div>
                  <h4 className="font-medium">{appointment.patient_profile.full_name}</h4>
                  {appointment.patient_profile.phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {appointment.patient_profile.phone}
                    </div>
                  )}
                </div>
              )}
              
              {showDoctorInfo && appointment.doctor_profile && (
                <div>
                  <h4 className="font-medium">Dr. {appointment.doctor_profile.full_name}</h4>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Stethoscope className="h-3 w-3" />
                    {appointment.doctor_profile.specialty}
                  </div>
                </div>
              )}
              
              {/* Date and Time */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(appointmentDateTime, 'dd/MM/yyyy', { locale: es })}
                  {isToday && <Badge variant="outline" className="text-xs ml-1">Hoy</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(appointmentDateTime, 'HH:mm')} - {format(new Date(appointment.ends_at), 'HH:mm')}
                </div>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  <strong>Notas:</strong> {appointment.notes.length > 100 ? 
                    `${appointment.notes.substring(0, 100)}...` : 
                    appointment.notes
                  }
                </div>
              )}
            </div>
          </div>
          
          {/* Status and Actions */}
          <div className="flex flex-col items-end gap-3">
            <Badge variant={getStatusColor(appointment.status)}>
              {getStatusText(appointment.status)}
            </Badge>
            
            <AppointmentActions
              appointment={appointment}
              userRole={userRole}
              currentUserId={currentUserId}
              onAppointmentUpdated={onAppointmentUpdated}
              showPatientName={showPatientInfo}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}