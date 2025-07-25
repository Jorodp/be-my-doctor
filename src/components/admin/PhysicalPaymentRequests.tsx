import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Phone,
  MapPin,
  DollarSign,
  MessageSquare,
  User
} from 'lucide-react';

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
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export default function PhysicalPaymentRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PhysicalPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PhysicalPaymentRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [actualAmount, setActualAmount] = useState<string>('');
  const [planType, setPlanType] = useState<'monthly' | 'annual'>('monthly');

  const statusColors = {
    pending: 'default',
    in_progress: 'secondary',
    completed: 'outline',
    cancelled: 'destructive'
  } as const;

  const statusLabels = {
    pending: 'Pendiente',
    in_progress: 'En proceso',
    completed: 'Completada',
    cancelled: 'Cancelada'
  };

  const paymentMethodLabels = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia'
  };

  const subscriptionTypeLabels = {
    monthly: 'Mensual',
    annual: 'Anual'
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('physical_payment_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las solicitudes."
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string, notes?: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('physical_payment_requests')
        .update({
          status: newStatus,
          admin_notes: notes,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `La solicitud ha sido marcada como ${statusLabels[newStatus as keyof typeof statusLabels].toLowerCase()}.`
      });

      await fetchRequests();
      setShowDetailModal(false);
      setShowCompletionForm(false);
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado de la solicitud."
      });
    } finally {
      setProcessing(false);
    }
  };

  const completePayment = async () => {
    if (!selectedRequest || !actualAmount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes especificar el monto pagado."
      });
      return;
    }

    setProcessing(true);
    try {
      // Crear el registro de suscripción manualmente
      const amount = parseFloat(actualAmount);
      const expirationDate = new Date();
      
      if (planType === 'monthly') {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      // Insertar en la tabla subscriptions
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: selectedRequest.doctor_user_id,
          plan: planType,
          status: 'active',
          ends_at: expirationDate.toISOString(),
          amount: amount,
          payment_method: 'physical',
          stripe_subscription_id: null,
          stripe_customer_id: null
        });

      if (subscriptionError) throw subscriptionError;

      // Actualizar el estado de la solicitud
      await updateRequestStatus(
        selectedRequest.id, 
        'completed', 
        `Pago completado: $${amount} - Plan ${planType === 'monthly' ? 'mensual' : 'anual'} hasta ${expirationDate.toLocaleDateString()}`
      );

      toast({
        title: "Pago procesado",
        description: `Se ha creado la suscripción ${planType === 'monthly' ? 'mensual' : 'anual'} por $${amount}.`
      });

      // Limpiar formulario
      setActualAmount('');
      setPlanType('monthly');
      
    } catch (error: any) {
      console.error('Error completing payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo completar el pago."
      });
      setProcessing(false);
    }
  };

  const openDetailModal = (request: PhysicalPaymentRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setShowDetailModal(true);
    setShowCompletionForm(false);
  };

  const startCompletion = (request: PhysicalPaymentRequest) => {
    setSelectedRequest(request);
    setActualAmount(request.amount.toString());
    setPlanType(request.subscription_type as 'monthly' | 'annual');
    setShowCompletionForm(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Solicitudes de Pago Físico</h2>
          <p className="text-muted-foreground">
            Gestiona las solicitudes de pago presencial de los doctores
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {requests.length} solicitudes
        </Badge>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay solicitudes</h3>
            <p className="text-muted-foreground text-center">
              No se han recibido solicitudes de pago físico aún.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{request.doctor_name}</CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4" />
                        {paymentMethodLabels[request.preferred_payment_method as keyof typeof paymentMethodLabels]}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {subscriptionTypeLabels[request.subscription_type as keyof typeof subscriptionTypeLabels]} - ${request.amount}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>
                    {request.status === 'pending' && (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{request.doctor_email}</span>
                    </div>
                    {request.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{request.phone}</span>
                      </div>
                    )}
                    {request.preferred_location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{request.preferred_location}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Monto:</span> ${request.amount} MXN
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Suscripción:</span> {subscriptionTypeLabels[request.subscription_type as keyof typeof subscriptionTypeLabels]}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Solicitud: {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDetailModal(request)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalles
                  </Button>
                  
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateRequestStatus(request.id, 'in_progress')}
                        disabled={processing}
                      >
                        Marcar en proceso
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startCompletion(request)}
                        disabled={processing}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completar
                      </Button>
                    </>
                  )}
                  
                  {request.status === 'in_progress' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startCompletion(request)}
                        disabled={processing}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateRequestStatus(request.id, 'cancelled', adminNotes)}
                        disabled={processing}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de detalles */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la solicitud</DialogTitle>
            <DialogDescription>
              Revisa la información completa de la solicitud de {selectedRequest?.doctor_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Información del doctor */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información del Doctor
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Nombre:</span> {selectedRequest.doctor_name}</div>
                  <div><span className="font-medium">Email:</span> {selectedRequest.doctor_email}</div>
                  {selectedRequest.phone && (
                    <div><span className="font-medium">Teléfono:</span> {selectedRequest.phone}</div>
                  )}
                  {selectedRequest.preferred_location && (
                    <div><span className="font-medium">Ubicación preferida:</span> {selectedRequest.preferred_location}</div>
                  )}
                </div>
              </div>

              {/* Detalles del pago */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Detalles del Pago
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Método preferido:</span> {paymentMethodLabels[selectedRequest.preferred_payment_method as keyof typeof paymentMethodLabels]}</div>
                  <div><span className="font-medium">Tipo de suscripción:</span> {subscriptionTypeLabels[selectedRequest.subscription_type as keyof typeof subscriptionTypeLabels]}</div>
                  <div><span className="font-medium">Monto:</span> ${selectedRequest.amount} MXN</div>
                  <div><span className="font-medium">Estado:</span> {statusLabels[selectedRequest.status]}</div>
                </div>
              </div>

              {/* Comentarios del doctor */}
              {selectedRequest.notes && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentarios del Doctor
                  </h4>
                  <p className="text-sm bg-muted p-3 rounded">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Notas del admin */}
              <div>
                <Label htmlFor="admin-notes">Notas de administración</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Añade notas sobre esta solicitud..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => updateRequestStatus(selectedRequest.id, 'in_progress', adminNotes)}
                      disabled={processing}
                    >
                      Marcar en proceso
                    </Button>
                    <Button
                      onClick={() => startCompletion(selectedRequest)}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Completar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'cancelled', adminNotes)}
                      disabled={processing}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
                
                {selectedRequest.status === 'in_progress' && (
                  <>
                    <Button
                      onClick={() => startCompletion(selectedRequest)}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Completar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'cancelled', adminNotes)}
                      disabled={processing}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de completar pago */}
      <Dialog open={showCompletionForm} onOpenChange={setShowCompletionForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Completar Pago Físico</DialogTitle>
            <DialogDescription>
              Especifica el monto pagado y el plazo de la suscripción
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedRequest.doctor_name}</h4>
                <p className="text-sm text-muted-foreground">
                  Monto solicitado: ${selectedRequest.amount} - {subscriptionTypeLabels[selectedRequest.subscription_type as keyof typeof subscriptionTypeLabels]}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual-amount">Monto pagado</Label>
                <Input
                  id="actual-amount"
                  type="number"
                  step="0.01"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  placeholder="Ingresa el monto pagado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-type">Tipo de plan</Label>
                <Select value={planType} onValueChange={(value) => setPlanType(value as 'monthly' | 'annual')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={completePayment}
                  disabled={processing || !actualAmount}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  {processing ? 'Procesando...' : 'Confirmar Pago'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCompletionForm(false)}
                  disabled={processing}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}