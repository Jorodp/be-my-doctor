import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatShortDateInMexicoTZ, formatTimeInMexicoTZ } from '@/utils/dateUtils';

interface AppointmentCardProps {
  appointment: {
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    patient_profile?: {
      full_name: string;
      phone: string;
    };
    doctor_profile?: {
      full_name: string;
      specialty: string;
    };
    consultation_fee?: number;
  };
  paymentStatus?: {
    status: string;
    amount: number;
    payment_method: string;
  };
  onAction?: (appointmentId: string, action: string) => void;
  userRole?: string;
  showPayment?: boolean;
}

export const AppointmentCard = ({ 
  appointment, 
  paymentStatus, 
  onAction, 
  userRole,
  showPayment = false 
}: AppointmentCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'in_progress': return 'En progreso';
      default: return status;
    }
  };

  const formatPaymentStatus = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {formatShortDateInMexicoTZ(appointment.starts_at)}
            </div>
          </CardTitle>
          <Badge className={getStatusColor(appointment.status)}>
            {formatStatus(appointment.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                {formatTimeInMexicoTZ(appointment.starts_at)} - 
                {formatTimeInMexicoTZ(appointment.ends_at)}
              </span>
            </div>
            
            {appointment.patient_profile && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span>Paciente: {appointment.patient_profile.full_name}</span>
              </div>
            )}
            
            {appointment.doctor_profile && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span>Dr. {appointment.doctor_profile.full_name}</span>
                <Badge variant="outline" className="text-xs">
                  {appointment.doctor_profile.specialty}
                </Badge>
              </div>
            )}
          </div>

          {showPayment && (
            <div className="space-y-2">
              {appointment.consultation_fee && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span>${appointment.consultation_fee} MXN</span>
                </div>
              )}
              
              {paymentStatus && (
                <div className="flex items-center gap-2">
                  {paymentStatus.status === 'paid' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  <Badge className={getPaymentStatusColor(paymentStatus.status)}>
                    {formatPaymentStatus(paymentStatus.status)}
                  </Badge>
                  {paymentStatus.payment_method && (
                    <span className="text-xs text-muted-foreground">
                      via {paymentStatus.payment_method}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {onAction && (
          <div className="flex gap-2 pt-2">
            {appointment.status === 'scheduled' && userRole !== 'patient' && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => onAction(appointment.id, 'start')}
                  disabled={paymentStatus?.status !== 'paid'}
                >
                  Iniciar Consulta
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onAction(appointment.id, 'cancel')}
                >
                  Cancelar
                </Button>
              </>
            )}
            
            {appointment.status === 'in_progress' && userRole !== 'patient' && (
              <Button 
                size="sm" 
                onClick={() => onAction(appointment.id, 'complete')}
              >
                Completar Consulta
              </Button>
            )}
            
            {userRole === 'patient' && appointment.status === 'scheduled' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onAction(appointment.id, 'cancel')}
              >
                Cancelar Cita
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};