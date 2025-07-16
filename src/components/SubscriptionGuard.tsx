import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CheckCircle, Clock, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  ends_at: string;
  amount: number;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentSettings, setPaymentSettings] = useState<{
    monthly_price: number;
    annual_price: number;
  } | null>(null);

  useEffect(() => {
    if (user && profile?.role === "doctor") {
      checkSubscription();
      fetchPaymentSettings();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const fetchPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("monthly_price, annual_price")
        .single();

      if (error) throw error;
      console.log("Payment settings loaded:", data);
      setPaymentSettings(data);
    } catch (error) {
      console.error("Error fetching payment settings:", error);
      // Set default values if fetch fails
      setPaymentSettings({
        monthly_price: 799,
        annual_price: 7990
      });
    }
  };

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { action: "check-subscription" }
      });

      if (error) throw error;
      
      if (data.hasActiveSubscription) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: "monthly" | "annual") => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { 
          action: "create-subscription",
          plan 
        }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Redirigiendo a Stripe",
        description: "Se ha abierto una nueva ventana para completar el pago.",
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la suscripción. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If user doesn't have the doctor role, show children
  if (!profile || profile.role !== "doctor") {
    return <>{children}</>;
  }

  // If still loading, show spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // If user has active subscription, show children
  if (subscription) {
    return <>{children}</>;
  }

  // Show subscription required page
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Suscripción Requerida</CardTitle>
          <CardDescription>
            Para acceder a la plataforma como médico, necesitas una suscripción activa.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Plan */}
        <Card className="relative">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Plan Mensual</CardTitle>
            </div>
            <CardDescription>Pago mes a mes, cancela cuando quieras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">
              ${paymentSettings?.monthly_price} <span className="text-sm font-normal text-muted-foreground">MXN/mes</span>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Acceso completo a la plataforma</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Gestión de citas y pacientes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Historial médico digital</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Soporte técnico</span>
              </li>
            </ul>
            <Button 
              className="w-full" 
              onClick={() => handleSubscribe("monthly")}
              disabled={loading}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Suscribirse Mensual
            </Button>
          </CardContent>
        </Card>

        {/* Annual Plan */}
        <Card className="relative border-primary">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
              2 meses gratis
            </span>
          </div>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Plan Anual</CardTitle>
            </div>
            <CardDescription>Ahorra al pagar por año completo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              ${paymentSettings?.annual_price} <span className="text-sm font-normal text-muted-foreground">MXN/año</span>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Equivale a ${Math.round((paymentSettings?.annual_price || 0) / 12)} MXN/mes
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Acceso completo a la plataforma</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Gestión de citas y pacientes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Historial médico digital</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Soporte técnico prioritario</span>
              </li>
            </ul>
            <Button 
              className="w-full" 
              onClick={() => handleSubscribe("annual")}
              disabled={loading}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Suscribirse Anual
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Todos los pagos son procesados de forma segura por Stripe. 
          Puedes cancelar tu suscripción en cualquier momento.
        </p>
      </div>
    </div>
  );
}