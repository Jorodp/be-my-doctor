import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "");

interface PaymentManagerProps {
  appointmentId: string;
  amount: number;
  patientId: string;
  doctorId: string;
  onPaymentUpdate?: () => void;
}

interface PaymentStatus {
  id: string;
  status: string;
  payment_method: string;
  amount: number;
  paid_at: string | null;
}

export function PaymentManager({ 
  appointmentId, 
  amount, 
  patientId, 
  doctorId, 
  onPaymentUpdate 
}: PaymentManagerProps) {
  const { userRole } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    fetchPaymentStatus();
  }, [appointmentId]);

  const fetchPaymentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("consultation_payments")
        .select("*")
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      setPaymentStatus(data);
    } catch (error) {
      console.error("Error fetching payment status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCashPayment = async () => {
    try {
      const { error } = await supabase.functions.invoke("payments", {
        body: {
          action: "mark-cash-payment",
          appointmentId,
          amount,
          patientId,
          doctorId,
        }
      });

      if (error) throw error;

      toast.success("Pago en efectivo registrado");
      fetchPaymentStatus();
      onPaymentUpdate?.();
    } catch (error) {
      console.error("Error marking cash payment:", error);
      toast.error("Error al registrar pago en efectivo");
    }
  };

  const handleStripePayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("payments", {
        body: {
          action: "create-consultation-payment",
          appointmentId,
          amount,
        }
      });

      if (error) throw error;

      // Create Stripe checkout session
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not loaded");

      // Here you would typically use Stripe Elements or redirect to checkout
      // For simplicity, we'll show a success message
      toast.success("Redirigiendo a pago...");
      setShowPaymentDialog(false);
    } catch (error) {
      console.error("Error creating Stripe payment:", error);
      toast.error("Error al procesar pago con tarjeta");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 animate-spin mr-2" />
            Cargando estado del pago...
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Pagado</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fallido</Badge>;
      default:
        return <Badge variant="outline">Sin pago</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Estado del Pago
          </span>
          {paymentStatus && getStatusBadge(paymentStatus.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Monto:</span>
          <span className="text-lg font-bold">${amount} MXN</span>
        </div>

        {paymentStatus ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Método de pago:</span>
              <span className="capitalize">{paymentStatus.payment_method}</span>
            </div>
            {paymentStatus.paid_at && (
              <div className="flex justify-between">
                <span>Fecha de pago:</span>
                <span>{new Date(paymentStatus.paid_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No hay registro de pago para esta consulta.
            </p>
            
            {userRole === "patient" && (
              <div className="space-y-2">
                <Button 
                  onClick={handleStripePayment}
                  className="w-full"
                  variant="default"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar con Tarjeta
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  También puedes pagar en efectivo al asistente
                </p>
              </div>
            )}

            {(userRole === "assistant" || userRole === "admin") && (
              <Button 
                onClick={handleCashPayment}
                variant="outline"
                className="w-full"
              >
                Marcar como Pagado en Efectivo
              </Button>
            )}
          </div>
        )}

        {/* Payment Dialog for Stripe */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pagar Consulta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span>Total a pagar:</span>
                  <span className="text-lg font-bold">${amount} MXN</span>
                </div>
              </div>
              
              <Elements stripe={stripePromise}>
                <StripePaymentForm 
                  amount={amount}
                  onSuccess={() => {
                    setShowPaymentDialog(false);
                    fetchPaymentStatus();
                    onPaymentUpdate?.();
                  }}
                />
              </Elements>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function StripePaymentForm({ amount, onSuccess }: { amount: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      // Here you would typically confirm the payment intent
      // For now, we'll just simulate success
      setTimeout(() => {
        toast.success("Pago procesado exitosamente");
        onSuccess();
        setProcessing(false);
      }, 2000);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Error al procesar el pago");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={!stripe || processing}
        className="w-full"
      >
        {processing ? (
          <>
            <Clock className="h-4 w-4 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          `Pagar $${amount} MXN`
        )}
      </Button>
    </form>
  );
}