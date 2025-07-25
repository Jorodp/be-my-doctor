import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  MapPin,
  Phone,
  DollarSign,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PhysicalPaymentRequest {
  id: string;
  doctor_user_id: string;
  doctor_name: string;
  doctor_email: string;
  phone?: string;
  preferred_payment_method: string;
  preferred_location?: string;
  subscription_type: string;
  amount: number;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  admin_notes?: string;
  created_at: string;
}

interface PhysicalPaymentValidatorProps {
  doctorUserId: string;
  onPaymentValidated: () => void;
}

export const PhysicalPaymentValidator = ({ 
  doctorUserId, 
  onPaymentValidated 
}: PhysicalPaymentValidatorProps) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PhysicalPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');

  const paymentMethodLabels = {
    cash: 'Efectivo',
    card: 'Tarjeta (Terminal física)',
    transfer: 'Transferencia bancaria'
  };

  const subscriptionTypeLabels = {
    monthly: 'Mensual',
    annual: 'Anual'
  };

  const statusLabels = {
    pending: 'Pendiente',
    in_progress: 'En proceso',
    completed: 'Completada',
    cancelled: 'Cancelada'
  };

  useEffect(() => {
    fetchPaymentRequests();
  }, [doctorUserId]);

  const fetchPaymentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('physical_payment_requests')
        .select('*')
        .eq('doctor_user_id', doctorUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching payment requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const validatePayment = async (requestId: string, subscriptionType: string) => {
    setProcessing(true);
    try {
      // 1. Marcar la solicitud como completada
      const { error: requestError } = await supabase
        .from('physical_payment_requests')
        .update({
          status: 'completed',
          admin_notes: validationNotes,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // 2. Actualizar el estado de suscripción del doctor
      const expirationDate = subscriptionType === 'annual' 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 año
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);  // 30 días

      const { error: profileError } = await supabase
        .from('doctor_profiles')
        .update({
          subscription_status: 'active',
          subscription_expires_at: expirationDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', doctorUserId);

      if (profileError) throw profileError;

      toast({
        title: "Pago validado exitosamente",
        description: `La suscripción ${subscriptionTypeLabels[subscriptionType as keyof typeof subscriptionTypeLabels].toLowerCase()} ha sido activada.`
      });

      // Refrescar datos
      await fetchPaymentRequests();
      onPaymentValidated();
      setValidationNotes('');

    } catch (error: any) {
      console.error('Error validating payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo validar el pago. Inténtalo de nuevo."
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'in_progress':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />En proceso</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Validación de Pago Físico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter(req => req.status === 'pending' || req.status === 'in_progress');
  const completedRequests = requests.filter(req => req.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Validación de Pago Físico
          </span>
          <Badge variant="outline">
            {requests.length} solicitudes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Solicitudes pendientes */}
        {pendingRequests.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 text-orange-600">Solicitudes Pendientes</h4>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{paymentMethodLabels[request.preferred_payment_method as keyof typeof paymentMethodLabels]}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-medium">{subscriptionTypeLabels[request.subscription_type as keyof typeof subscriptionTypeLabels]}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-bold text-green-600">${request.amount} MXN</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Solicitado el {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                    {request.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{request.phone}</span>
                      </div>
                    )}
                    {request.preferred_location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{request.preferred_location}</span>
                      </div>
                    )}
                  </div>

                  {request.notes && (
                    <div className="mb-4">
                      <Label className="text-sm font-medium">Notas del doctor:</Label>
                      <p className="text-sm bg-white p-2 rounded border mt-1">{request.notes}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`validation-notes-${request.id}`}>Notas de validación</Label>
                      <Textarea
                        id={`validation-notes-${request.id}`}
                        value={validationNotes}
                        onChange={(e) => setValidationNotes(e.target.value)}
                        placeholder="Añade notas sobre la validación del pago..."
                        rows={2}
                      />
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700"
                          disabled={processing}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Validar Pago y Activar Suscripción
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Validación de Pago</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Confirmas que el pago físico por <strong>${request.amount} MXN</strong> ha sido recibido 
                            y deseas activar la suscripción <strong>{subscriptionTypeLabels[request.subscription_type as keyof typeof subscriptionTypeLabels].toLowerCase()}</strong>?
                            <br /><br />
                            Esta acción:
                            <br />• Marcará la solicitud como completada
                            <br />• Activará la suscripción del doctor
                            <br />• Establecerá la fecha de expiración correspondiente
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => validatePayment(request.id, request.subscription_type)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Confirmar Validación
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solicitudes completadas */}
        {completedRequests.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 text-green-600">Pagos Validados</h4>
            <div className="space-y-3">
              {completedRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="border rounded-lg p-3 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{paymentMethodLabels[request.preferred_payment_method as keyof typeof paymentMethodLabels]}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{subscriptionTypeLabels[request.subscription_type as keyof typeof subscriptionTypeLabels]}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-semibold">${request.amount} MXN</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Validado el {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  {request.admin_notes && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <strong>Notas:</strong> {request.admin_notes}
                    </div>
                  )}
                </div>
              ))}
              {completedRequests.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  Y {completedRequests.length - 3} pagos validados más...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Sin solicitudes */}
        {requests.length === 0 && (
          <div className="text-center py-6">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-1">Sin solicitudes de pago físico</h3>
            <p className="text-sm text-muted-foreground">
              Este doctor no ha solicitado pago físico aún.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};