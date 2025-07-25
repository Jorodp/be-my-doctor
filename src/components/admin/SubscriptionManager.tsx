import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  CreditCard, 
  Calendar, 
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Settings
} from 'lucide-react';
import { format, addDays, addMonths, addYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { PhysicalPaymentValidator } from './PhysicalPaymentValidator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Doctor {
  doctor_user_id: string;
  full_name: string;
  specialty: string;
  verification_status: string;
  subscription_status: string;
  profile_complete: boolean;
}

interface DoctorProfile {
  id: string;
  user_id: string;
  subscription_status: string;
  verification_status?: string;
  subscription_expires_at?: string;
  grace_ends_at?: string;
}

interface SubscriptionHistory {
  doctor_profile_id: string;
  status: string;
  expires_at: string;
  admin_id: string;
  changed_at: string;
}

interface SubscriptionManagerProps {
  doctor: Doctor;
  doctorProfile: DoctorProfile;
  subscriptionHistory: SubscriptionHistory[];
  onSubscriptionUpdate: () => void;
}

export const SubscriptionManager = ({
  doctor,
  doctorProfile,
  subscriptionHistory,
  onSubscriptionUpdate
}: SubscriptionManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(doctorProfile.subscription_status);
  const [verificationStatus, setVerificationStatus] = useState(doctorProfile.verification_status || doctor.verification_status || 'pending');
  const [durationType, setDurationType] = useState('months');
  const [durationValue, setDurationValue] = useState('1');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Activa
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary">
            <PauseCircle className="w-3 h-3 mr-1" />
            Inactiva
          </Badge>
        );
      case 'grace':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            <Clock className="w-3 h-3 mr-1" />
            Período de Gracia
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Expirada
          </Badge>
        );
      case 'past_due':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Vencida
          </Badge>
        );
      case 'canceled':
        return (
          <Badge variant="destructive">
            <StopCircle className="w-3 h-3 mr-1" />
            Cancelada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateNewExpirationDate = (fromExisting: boolean = false) => {
    const baseDate = fromExisting && doctorProfile.subscription_expires_at 
      ? new Date(doctorProfile.subscription_expires_at)
      : new Date();
    const value = parseInt(durationValue);
    
    switch (durationType) {
      case 'days':
        return addDays(baseDate, value);
      case 'months':
        return addMonths(baseDate, value);
      case 'years':
        return addYears(baseDate, value);
      default:
        return addMonths(baseDate, 1);
    }
  };

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      let expiresAt: string | undefined;
      
      if (newStatus === 'active') {
        expiresAt = calculateNewExpirationDate().toISOString();
      }
      
      // Actualizar doctor_profiles
      const { error } = await supabase
        .from('doctor_profiles')
        .update({
          subscription_status: newStatus,
          verification_status: verificationStatus,
          subscription_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', doctor.doctor_user_id);

      if (error) throw error;

      toast({
        title: 'Actualización exitosa',
        description: 'Los estados del doctor se actualizaron correctamente'
      });

      onSubscriptionUpdate();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la información',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const extendSubscription = async () => {
    setLoading(true);
    try {
      const newExpirationDate = calculateNewExpirationDate(true);
      
      const { error } = await supabase
        .from('doctor_profiles')
        .update({
          subscription_status: 'active',
          subscription_expires_at: newExpirationDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', doctor.doctor_user_id);

      if (error) throw error;

      toast({
        title: 'Suscripción extendida',
        description: `Se agregó ${durationValue} ${durationType === 'days' ? 'días' : durationType === 'months' ? 'meses' : 'años'} a la suscripción`
      });

      onSubscriptionUpdate();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast({
        title: 'Error',
        description: 'No se pudo extender la suscripción',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuickActions = () => {
    const currentStatus = doctorProfile.subscription_status;
    
    const actions = [];
    
    if (currentStatus === 'inactive') {
      actions.push({
        label: 'Activar Suscripción',
        icon: PlayCircle,
        status: 'active',
        variant: 'default' as const,
        description: 'Activar la suscripción del médico'
      });
    }
    
    if (currentStatus === 'active') {
      actions.push({
        label: 'Pausar Suscripción',
        icon: PauseCircle,
        status: 'inactive',
        variant: 'outline' as const,
        description: 'Pausar temporalmente la suscripción'
      });
    }
    
    if (currentStatus === 'active' || currentStatus === 'inactive') {
      actions.push({
        label: 'Cancelar Suscripción',
        icon: StopCircle,
        status: 'expired',
        variant: 'destructive' as const,
        description: 'Cancelar permanentemente la suscripción'
      });
    }
    
    if (currentStatus === 'expired' || currentStatus === 'inactive') {
      actions.push({
        label: 'Renovar Suscripción',
        icon: RefreshCw,
        status: 'active',
        variant: 'default' as const,
        description: 'Renovar y activar la suscripción'
      });
    }
    
    return actions;
  };

  const isExpiringSoon = () => {
    if (!doctorProfile.subscription_expires_at) return false;
    const expirationDate = new Date(doctorProfile.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 7 && daysUntilExpiration > 0;
  };

  const isExpired = () => {
    if (!doctorProfile.subscription_expires_at) return false;
    const expirationDate = new Date(doctorProfile.subscription_expires_at);
    const now = new Date();
    return expirationDate < now;
  };

  const handlePaymentValidated = async () => {
    // Refresh subscription data after payment validation
    onSubscriptionUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Physical Payment Validation */}
      <PhysicalPaymentValidator 
        doctorUserId={doctor.doctor_user_id}
        onPaymentValidated={handlePaymentValidated}
      />

      {/* Estado y Configuración Rápida */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Estado y Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado de verificación</Label>
              <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="verified">Verificado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado de suscripción</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                  <SelectItem value="grace">Período de Gracia</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                  <SelectItem value="past_due">Vencida</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleStatusUpdate}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Actualizando...' : 'Aplicar Cambios'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Estado Actual de Suscripción
            </span>
            {getStatusBadge(doctorProfile.subscription_status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <p className="font-medium">{doctorProfile.subscription_status}</p>
            </div>
            
            {doctorProfile.subscription_expires_at && (
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Expiración</p>
                <p className="font-medium">
                  {format(new Date(doctorProfile.subscription_expires_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
              </div>
            )}
            
            {doctorProfile.grace_ends_at && (
              <div>
                <p className="text-sm text-muted-foreground">Fin del Período de Gracia</p>
                <p className="font-medium">
                  {format(new Date(doctorProfile.grace_ends_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
              </div>
            )}
          </div>

          {/* Alerts */}
          {isExpiringSoon() && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                La suscripción expira pronto. Considera renovarla para evitar interrupciones.
              </span>
            </div>
          )}

          {isExpired() && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800">
                La suscripción ha expirado. El médico no puede recibir nuevas citas.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extender Suscripción */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Extender Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Agrega tiempo a la fecha de expiración actual. Si no hay fecha de expiración, se calcula desde ahora.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="extend-duration-value">Cantidad</Label>
              <Input
                id="extend-duration-value"
                type="number"
                min="1"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="extend-duration-type">Tipo</Label>
              <Select value={durationType} onValueChange={setDurationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Días</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                  <SelectItem value="years">Años</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    Extender
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Extender Suscripción</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Confirmas que quieres agregar {durationValue} {durationType === 'days' ? 'días' : durationType === 'months' ? 'meses' : 'años'} a la suscripción de Dr. {doctor.full_name}?
                      <br /><br />
                      <strong>Nueva fecha de expiración:</strong> {' '}
                      {format(calculateNewExpirationDate(true), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={extendSubscription}>
                      Confirmar Extensión
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nueva fecha de expiración:</strong> {' '}
              {format(calculateNewExpirationDate(true), 'dd/MM/yyyy HH:mm', { locale: es })}
            </p>
          </div>
        </CardContent>
      </Card>


      {/* Subscription History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historial de Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subscriptionHistory.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(entry.status)}
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </span>
                  </div>
                  {entry.expires_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expira: {format(new Date(entry.expires_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Admin: {entry.admin_id.slice(0, 8)}...
                </div>
              </div>
            ))}
            
            {subscriptionHistory.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No hay historial de cambios de suscripción
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};