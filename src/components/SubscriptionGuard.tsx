import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CheckCircle, Clock, CreditCard, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentSettings, setPaymentSettings] = useState<{
    monthly_price: number;
    annual_price: number;
  } | null>(null);
  const [physicalPaymentEnabled, setPhysicalPaymentEnabled] = useState(false);

  useEffect(() => {
    console.log("SubscriptionGuard: Effect triggered", { user: user?.id, role: profile?.role });
    if (user && profile?.role === "doctor") {
      checkSubscription();
      fetchPaymentSettings();
      checkPhysicalPayment();
    } else {
      console.log("SubscriptionGuard: Not a doctor or no user, setting loading to false");
      setLoading(false);
    }
  }, [user, profile]);

  const checkPhysicalPayment = async () => {
    try {
      const { data, error } = await supabase
        .from("doctor_physical_payments")
        .select("enabled")
        .eq("doctor_user_id", user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Physical payment query error:", error);
        return;
      }

      setPhysicalPaymentEnabled(data?.enabled || false);
    } catch (error) {
      console.error("Error checking physical payment:", error);
    }
  };

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
      
      // Primero verificar en doctor_profiles.subscription_status
      const { data: doctorProfile, error: doctorError } = await supabase
        .from('doctor_profiles')
        .select('subscription_status, subscription_expires_at')
        .eq('user_id', user?.id)
        .single();

      if (doctorError && doctorError.code !== 'PGRST116') {
        console.error("Doctor profile query error:", doctorError);
        throw doctorError;
      }

      console.log("Doctor profile subscription:", doctorProfile);

      // Si el doctor tiene subscription_status = 'active' en doctor_profiles
      if (doctorProfile?.subscription_status === 'active') {
        const now = new Date();
        const expiresAt = doctorProfile.subscription_expires_at ? new Date(doctorProfile.subscription_expires_at) : null;
        
        // Si no hay fecha de expiración o aún no ha expirado
        if (!expiresAt || expiresAt >= now) {
          console.log("Active subscription found in doctor_profiles");
          setSubscription({
            id: 'doctor-profile',
            plan: 'active',
            status: 'active',
            ends_at: doctorProfile.subscription_expires_at || new Date(Date.now() + 365*24*60*60*1000).toISOString(),
            amount: 0
          });
          return;
        }
      }
      
      // Si no hay suscripción activa en doctor_profiles, verificar tabla subscriptions
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
      console.log(`🚀 Starting ${plan} subscription process...`);
      console.log('🔑 Auth token available:', !!supabase.auth.getSession());
      
      // Get current session to validate auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.error('❌ No valid session found:', sessionError);
        throw new Error('No hay una sesión válida. Por favor, inicia sesión nuevamente.');
      }
      
      console.log('✅ Valid session found, token length:', session.access_token.length);
      console.log('📤 Calling edge function with plan_type:', plan);
      
      const { data, error } = await supabase.functions.invoke('create-doctor-subscription', {
        body: { plan_type: plan },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📥 Edge function response:', { data, error });
      
      if (error) {
        console.error('❌ Error from edge function:', error);
        
        // Check if it's a network/connectivity error
        if (error.message?.includes('fetch')) {
          throw new Error('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
        }
        
        // Check if it's an auth error
        if (error.message?.includes('authentication') || error.message?.includes('Authentication')) {
          throw new Error('Error de autenticación. Inicia sesión nuevamente.');
        }
        
        throw new Error(error.message || 'Error al crear la sesión de pago');
      }
      
      console.log('✅ Edge function success, checking URL...');
      
      if (!data?.url) {
        console.error('❌ No checkout URL received:', data);
        throw new Error('No se recibió la URL de checkout de Stripe');
      }
      
      console.log('🔍 Received URL:', data.url);
      
      // Validate URL before redirecting
      if (!data.url || data.url === "https://checkout.stripe.com/test-session-url") {
        console.warn('⚠️ Test URL detected or invalid URL');
        toast({
          title: "Función en modo de prueba",
          description: "La función está funcionando pero en modo de prueba. Contacte al administrador.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('🎯 Redirecting to Stripe checkout:', data.url);
      
      // Redirect to Stripe checkout
      window.location.href = data.url;
      
    } catch (error: any) {
      console.error("❌ Error creating subscription:", error);
      
      // More specific error handling
      let errorMessage = "No se pudo crear la sesión de pago";
      
      if (error.message?.includes('authentication') || error.message?.includes('Authentication')) {
        errorMessage = "Error de autenticación. Por favor, inicia sesión nuevamente.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = "Error de conexión. Verifica tu internet e inténtalo de nuevo.";
      } else if (error.message?.includes('Stripe')) {
        errorMessage = "Error en el sistema de pagos. Inténtalo más tarde.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
  
  // If no active subscription, show subscription prompt
  console.log("SubscriptionGuard: No active subscription found, showing subscription prompt");
  
  if (!paymentSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Botón de regreso */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Regresar al Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Suscripción Requerida</CardTitle>
          <CardDescription>
            Para acceder al dashboard médico, necesitas una suscripción activa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Plan */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg">Plan Mensual</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${paymentSettings.monthly_price.toLocaleString()}</span>
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
                onClick={() => handleSubscribe('monthly')}
                disabled={loading}
              >
                {loading ? (
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
            </div>

            {/* Annual Plan */}
            <div className="border rounded-lg p-6 space-y-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="default" className="bg-blue-600">Recomendado</Badge>
                </div>
                <h3 className="font-semibold text-lg">Plan Anual</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${paymentSettings.annual_price.toLocaleString()}</span>
                  <span className="text-muted-foreground"> MXN/año</span>
                </div>
                <p className="text-sm text-green-600 font-medium mt-1">
                  Ahorra ${((paymentSettings.monthly_price * 12) - paymentSettings.annual_price).toLocaleString()} MXN
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
                  2 meses gratis incluidos
                </li>
              </ul>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                onClick={() => handleSubscribe('annual')}
                disabled={loading}
              >
                {loading ? (
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
            </div>
          </div>

          {/* Opción de pago físico */}
          {physicalPaymentEnabled && (
            <div className="mt-8 border-t pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">¿Prefieres pagar en efectivo o tarjeta?</h3>
                <p className="text-muted-foreground">
                  Solicita asistencia de un representante Be My Doctor para realizar el pago de manera presencial.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/customer-support', { 
                    state: { reason: 'Solicitar Pago en Efectivo/Tarjeta' } 
                  })}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
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