import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, CreditCard } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requiredRole?: "doctor";
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  ends_at: string;
  amount: number;
}

export function SubscriptionGuard({ children, requiredRole = "doctor" }: SubscriptionGuardProps) {
  const { userRole, user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (userRole === requiredRole && user) {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, [userRole, user, requiredRole]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { action: "check-subscription" }
      });

      if (error) throw error;

      setSubscription(data.subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
      toast.error("Error al verificar suscripción");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: "monthly" | "annual") => {
    setProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { 
          action: "create-subscription",
          plan 
        }
      });

      if (error) throw error;

      // Redirect to Stripe Checkout
      window.open(data.url, '_blank');
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast.error("Error al procesar el pago");
    } finally {
      setProcessingPayment(false);
    }
  };

  // If not the required role, render children normally
  if (userRole !== requiredRole) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // If has active subscription, render children
  if (subscription && subscription.status === "active") {
    return <>{children}</>;
  }

  // Show subscription required page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Suscripción Requerida
          </h1>
          <p className="text-lg text-gray-600">
            Para acceder a tu dashboard de doctor, necesitas una suscripción activa.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-center">
                Plan Mensual
              </CardTitle>
              <div className="text-center">
                <span className="text-4xl font-bold">$500</span>
                <span className="text-gray-600">/mes</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Dashboard completo</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Gestión de citas ilimitadas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Historial de consultas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Notificaciones automáticas</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Soporte técnico</span>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleSubscribe("monthly")}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Suscribirse Mensual
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Annual Plan */}
          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                2 meses gratis
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-center">
                Plan Anual
              </CardTitle>
              <div className="text-center">
                <span className="text-4xl font-bold">$4,800</span>
                <span className="text-gray-600">/año</span>
              </div>
              <div className="text-center text-sm text-gray-600">
                Equivale a $400/mes
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Todo lo del plan mensual</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>2 meses gratis (20% descuento)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Soporte prioritario</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Acceso a nuevas funcionalidades</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Reportes avanzados</span>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleSubscribe("annual")}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Suscribirse Anual
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Todos los planes incluyen facturación y garantía de reembolso de 30 días.
          </p>
        </div>
      </div>
    </div>
  );
}