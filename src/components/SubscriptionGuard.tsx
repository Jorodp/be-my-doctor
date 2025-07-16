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
    console.log("SubscriptionGuard: Effect triggered", { user: user?.id, role: profile?.role });
    if (user && profile?.role === "doctor") {
      checkSubscription();
      fetchPaymentSettings();
    } else {
      console.log("SubscriptionGuard: Not a doctor or no user, setting loading to false");
      setLoading(false);
    }
  }, [user, profile]);

  const fetchPaymentSettings = async () => {
    try {
      console.log("Fetching payment settings...");
      const { data, error } = await supabase
        .from("payment_settings")
        .select("monthly_price, annual_price")
        .maybeSingle();

      if (error) {
        console.error("Payment settings error:", error);
        throw error;
      }
      
      if (data) {
        console.log("Payment settings loaded:", data);
        setPaymentSettings(data);
      } else {
        console.log("No payment settings found, using defaults");
        setPaymentSettings({
          monthly_price: 2000,
          annual_price: 20000
        });
      }
    } catch (error) {
      console.error("Error fetching payment settings:", error);
      // Set default values if fetch fails
      setPaymentSettings({
        monthly_price: 2000,
        annual_price: 20000
      });
    }
  };

  const checkSubscription = async () => {
    try {
      console.log("Checking subscription for user:", user?.id);
      
      // Consulta directa a la tabla subscriptions para incluir suscripciones manuales
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Subscription query error:", error);
        throw error;
      }

      console.log("Subscriptions found:", subscriptions);

      // Verificar si hay alguna suscripción activa y no expirada
      const now = new Date();
      const activeSubscription = subscriptions?.find(sub => {
        const endsAt = new Date(sub.ends_at);
        const isActive = sub.status === 'active' && endsAt >= now;
        console.log(`Subscription ${sub.id}: status=${sub.status}, ends_at=${sub.ends_at}, active=${isActive}`);
        return isActive;
      });

      if (activeSubscription) {
        console.log("Active subscription found:", activeSubscription);
        setSubscription(activeSubscription);
      } else {
        console.log("No active subscription found");
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: "monthly" | "annual") => {
    try {
      setLoading(true);
      console.log(`Starting ${plan} subscription process...`);
      
      const { data, error } = await supabase.functions.invoke('create-doctor-subscription', {
        body: { plan_type: plan }
      });
      
      if (error) {
        console.error('Error from edge function:', error);
        throw new Error(error.message || 'Error al crear la sesión de pago');
      }
      
      if (!data?.url) {
        console.error('No checkout URL received:', data);
        throw new Error('No se recibió la URL de checkout');
      }
      
      console.log('Opening Stripe checkout:', data.url);
      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
      
      
      toast({
        title: "Redirigiendo a Stripe",
        description: "Se abrió una nueva pestaña para completar el pago",
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la sesión de pago",
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
    console.log("SubscriptionGuard: User has active subscription, rendering children");
    return <>{children}</>;
  }

  console.log("SubscriptionGuard: No active subscription, showing subscription required page");

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