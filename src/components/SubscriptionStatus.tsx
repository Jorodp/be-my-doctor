import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, CreditCard, RefreshCw, Crown, CheckCircle, Settings, MessageCircle, HandCoins } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  ends_at: string;
  amount: number;
}

export function SubscriptionStatus() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [prices, setPrices] = useState({ monthly: 2000, annual: 20000 });
  const [physicalPaymentEnabled, setPhysicalPaymentEnabled] = useState(false);

  useEffect(() => {
    if (user && profile?.role === "doctor") {
      checkSubscription();
      fetchPrices();
      checkPhysicalPaymentEnabled();
    }
  }, [user, profile]);

  const fetchPrices = async () => {
    try {
      console.log("Fetching prices from payment_settings...");
      // Obtener precios desde payment_settings para mostrar los correctos
      const { data, error } = await supabase
        .from('payment_settings')
        .select('monthly_price, annual_price')
        .single();
      
      console.log("Payment settings response:", { data, error });
      
      if (!error && data) {
        const newPrices = {
          monthly: data.monthly_price,
          annual: data.annual_price
        };
        console.log("Setting new prices:", newPrices);
        setPrices(newPrices);
      } else {
        console.error("Error fetching payment settings:", error);
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  const checkSubscription = async () => {
    try {
      setLoading(true);
      console.log("SubscriptionStatus: Checking subscription for user:", user?.id);
      
      // Primero verificar en doctor_profiles si tiene suscripción local activa
      const { data: doctorProfile, error: profileError } = await supabase
        .from('doctor_profiles')
        .select('subscription_status, subscription_expires_at')
        .eq('user_id', user?.id)
        .single();

      if (!profileError && doctorProfile?.subscription_status === 'active') {
        console.log("SubscriptionStatus: Found active subscription in doctor_profiles:", doctorProfile);
        setSubscription({
          id: 'local-subscription',
          plan: 'active',
          status: 'active',
          ends_at: doctorProfile.subscription_expires_at || '',
          amount: 0
        });
        setLoading(false);
        return;
      }

      // Si no tiene suscripción local activa, verificar con Stripe
      const { data, error } = await supabase.functions.invoke('verify-doctor-subscription');
      if (error) {
        console.error("SubscriptionStatus: Error from verify-doctor-subscription:", error);
        throw error;
      }
      
      console.log("SubscriptionStatus: Subscription response:", data);
      
      if (data?.subscribed && data?.status === 'active') {
        setSubscription({
          id: 'stripe-subscription',
          plan: data.plan || 'active',
          status: data.status,
          ends_at: data.ends_at || '',
          amount: data.amount || 0
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      toast({
        title: "Error",
        description: "No se pudo verificar el estado de la suscripción.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (plan: 'monthly' | 'annual') => {
    try {
      setCreatingSubscription(true);
      const { data, error } = await supabase.functions.invoke("create-doctor-subscription", {
        body: { 
          plan_type: plan
        }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Redirigiendo a Stripe",
        description: "Se ha abierto una nueva ventana para procesar tu suscripción.",
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la suscripción. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setCreatingSubscription(false);
    }
  };

  const handleRenew = async () => {
    if (!subscription) return;
    
    try {
      setCreatingSubscription(true);
      const { data, error } = await supabase.functions.invoke("create-doctor-subscription", {
        body: { 
          plan_type: subscription.plan
        }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Redirigiendo a Stripe",
        description: "Se ha abierto una nueva ventana para renovar tu suscripción.",
      });
    } catch (error) {
      console.error("Error renewing subscription:", error);
      toast({
        title: "Error",
        description: "No se pudo renovar la suscripción. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setCreatingSubscription(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      setOpeningPortal(true);
      const { data, error } = await supabase.functions.invoke("doctor-customer-portal");

      if (error) throw error;

      // Open Stripe customer portal in a new tab
      window.open(data.url, '_blank');
      
      toast({
        title: "Abriendo portal de gestión",
        description: "Se ha abierto una nueva ventana para gestionar tu suscripción.",
      });
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Error",
        description: "No se pudo abrir el portal de gestión. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const checkPhysicalPaymentEnabled = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('doctor_physical_payments')
        .select('enabled')
        .eq('doctor_user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking physical payment status:', error);
        return;
      }

      setPhysicalPaymentEnabled(data?.enabled || false);
    } catch (error) {
      console.error('Error checking physical payment status:', error);
    }
  };

  const handlePhysicalPaymentRequest = () => {
    navigate('/customer-support?reason=physical_payment');
  };

  if (profile?.role !== "doctor") {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Estado de Suscripción
              </CardTitle>
              <CardDescription>
                Gestiona tu suscripción a la plataforma Be My Doctor
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkSubscription}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Suscripción Activa</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Plan</span>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <Badge variant="default">
                      {subscription.plan === "monthly" ? "Mensual" : 
                       subscription.plan === "annual" ? "Anual" : "Activo"}
                    </Badge>
                  </div>
                </div>
                
                {subscription.amount > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Monto</span>
                    <span className="font-semibold text-lg">
                      ${subscription.amount.toLocaleString()} MXN
                    </span>
                  </div>
                )}
              </div>

              {subscription.ends_at && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {subscription.plan === "monthly" ? "Próxima renovación" : 
                     subscription.plan === "annual" ? "Renovación anual" : "Activa hasta"}
                  </span>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(subscription.ends_at), "dd 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">Solicitar pago físico</p>
                <p className="text-sm text-muted-foreground">
                  Si prefieres pagar en efectivo o tarjeta de manera presencial, solicita asistencia de nuestro equipo.
                </p>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={handlePhysicalPaymentRequest}
                >
                  <HandCoins className="h-4 w-4 mr-2" />
                  Solicitar Pago en Efectivo/Tarjeta
                </Button>
              </div>

            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Suscripción Requerida</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Para acceder a todas las funciones de la plataforma, necesitas una suscripción activa.
                </p>
              </div>

              {physicalPaymentEnabled && (
                <div className="mt-4">
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={handlePhysicalPaymentRequest}
                  >
                    <HandCoins className="h-4 w-4 mr-2" />
                    Solicitar Pago en Efectivo/Tarjeta
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Contacta a nuestro equipo para realizar el pago presencialmente
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Plans Card - Siempre mostrar los planes */}
      <Card>
        <CardHeader>
          <CardTitle>Planes de Suscripción</CardTitle>
          <CardDescription>
            {subscription ? 
              "Puedes cambiar o renovar tu suscripción actual" : 
              "Elige el plan que mejor se adapte a tus necesidades"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg">Plan Mensual</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${prices.monthly.toLocaleString()}</span>
                  <span className="text-muted-foreground"> MXN/mes</span>
                </div>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Acceso completo a la plataforma
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Gestión ilimitada de citas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Soporte técnico
                </li>
              </ul>
              
              <Button 
                className="w-full" 
                onClick={() => createSubscription('monthly')}
                disabled={creatingSubscription}
              >
                {creatingSubscription ? "Procesando..." : 
                 subscription ? "Agregar 1 mes" : "Suscribirse Mensual"}
              </Button>
            </div>

            {/* Annual Plan */}
            <div className="border rounded-lg p-4 space-y-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="default" className="bg-blue-600">Recomendado</Badge>
                </div>
                <h3 className="font-semibold text-lg">Plan Anual</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${prices.annual.toLocaleString()}</span>
                  <span className="text-muted-foreground"> MXN/año</span>
                </div>
                <p className="text-sm text-green-600 font-medium mt-1">
                  Ahorra ${((prices.monthly * 12) - prices.annual).toLocaleString()} MXN
                </p>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Acceso completo a la plataforma
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Gestión ilimitada de citas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Soporte técnico prioritario
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Paga 10 meses y recibe 12 de servicio
                </li>
              </ul>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                onClick={() => createSubscription('annual')}
                disabled={creatingSubscription}
              >
                {creatingSubscription ? "Procesando..." : 
                 subscription ? "Agregar 1 año" : "Suscribirse Anual"}
              </Button>
            </div>
          </div>

          {/* Botón de pago físico */}
          {physicalPaymentEnabled && (
            <div className="mt-6 pt-6 border-t">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">¿Prefieres pagar en efectivo o tarjeta?</h3>
                <p className="text-muted-foreground">
                  Solicita asistencia de un representante Be My Doctor para realizar el pago de manera presencial.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full max-w-md"
                  onClick={handlePhysicalPaymentRequest}
                >
                  <HandCoins className="h-4 w-4 mr-2" />
                  Solicitar Pago en Efectivo/Tarjeta
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}