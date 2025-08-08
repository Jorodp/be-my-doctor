import { useState, useEffect } from "react";
import logger from "@/lib/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Crown, Zap, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface SubscriptionData {
  subscribed: boolean;
  plan: string;
  status: string;
  ends_at?: string;
  amount?: number;
}

const SubscriptionSection = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('verify-doctor-subscription');
      if (error) throw error;
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar el estado de la suscripción",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (planType: 'monthly' | 'annual') => {
    try {
      setActionLoading(true);
      logger.info(`Starting ${planType} subscription process...`);
      
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast({
          title: "Error de autenticación",
          description: "Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        });
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('create-doctor-subscription', {
        body: { plan_type: planType },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('Error from edge function:', error);
        
        // Handle specific errors
        if (error.message?.includes("Authentication")) {
          toast({
            title: "Error de autenticación",
            description: "Por favor, inicia sesión nuevamente.",
            variant: "destructive",
          });
        } else if (error.message?.includes("Invalid JSON") || error.message?.includes("plan_type is required")) {
          toast({
            title: "Error de configuración",
            description: "Error en la configuración del plan. Inténtalo de nuevo.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message || 'Error al crear la sesión de pago',
            variant: "destructive",
          });
        }
        return;
      }
      
      if (!data?.url) {
        toast({
          title: "Error",
          description: "No se recibió la URL de checkout",
          variant: "destructive",
        });
        return;
      }
      
      logger.info('Received checkout URL');
      
      // Redirect directly to Stripe checkout
      window.location.href = data.url;
      
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la sesión de pago",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      setActionLoading(true);
      const { data, error } = await supabase.functions.invoke('doctor-customer-portal');
      if (error) throw error;
      
      // Open customer portal in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "No se pudo abrir el portal de gestión",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  const isActive = subscriptionData?.subscribed && subscriptionData?.status === 'active';
  const planName = subscriptionData?.plan === 'monthly' ? 'Mensual' : 
                   subscriptionData?.plan === 'annual' ? 'Anual' : 'Ninguno';
  const monthlyPrice = 200000; // $2,000 MXN (in cents)
  const annualPrice = 2000000; // $20,000 MXN (in cents)

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle>Estado de Suscripción</CardTitle>
            </div>
            <Button 
              variant="outline" 
              onClick={checkSubscription}
              disabled={loading}
            >
              Actualizar
            </Button>
          </div>
          <CardDescription>
            Gestiona tu suscripción para acceder a todas las funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isActive ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-green-800">Suscripción Activa</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Plan {planName}
                  </Badge>
                </div>
                {subscriptionData?.ends_at && (
                  <p className="text-sm text-green-600 mt-1">
                    Renovación: {new Date(subscriptionData.ends_at).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={openCustomerPortal}
                disabled={actionLoading}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Gestionar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div className="flex-1">
                <span className="font-semibold text-amber-800">Sin Suscripción Activa</span>
                <p className="text-sm text-amber-600 mt-1">
                  Suscríbete para acceder a todas las funcionalidades
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      {!isActive && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Plan Mensual</CardTitle>
              </div>
              <CardDescription>
                Facturación mensual con flexibilidad total
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  ${(monthlyPrice / 100).toLocaleString('es-MX')}
                </div>
                <div className="text-sm text-muted-foreground">MXN por mes</div>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Gestión completa de pacientes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Calendario de citas ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Chat con pacientes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Historial médico digital
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Soporte prioritario
                </li>
              </ul>

              <Button 
                className="w-full" 
                onClick={() => createSubscription('monthly')}
                disabled={actionLoading}
              >
                <Zap className="h-4 w-4 mr-2" />
                Suscribirse Mensual
              </Button>
            </CardContent>
          </Card>

          {/* Annual Plan */}
          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                Ahorra $4,000 MXN
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle>Plan Anual</CardTitle>
              </div>
              <CardDescription>
                Facturación anual con descuento especial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  ${(annualPrice / 100).toLocaleString('es-MX')}
                </div>
                <div className="text-sm text-muted-foreground">MXN por año</div>
                <div className="text-xs text-green-600 font-medium mt-1">
                  (~${((annualPrice / 100) / 12).toLocaleString('es-MX')} MXN/mes)
                </div>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Todo lo del plan mensual
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  2 meses GRATIS
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Soporte prioritario VIP
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Funciones beta tempranas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Consultor de éxito dedicado
                </li>
              </ul>

              <Button 
                className="w-full" 
                onClick={() => createSubscription('annual')}
                disabled={actionLoading}
              >
                <Crown className="h-4 w-4 mr-2" />
                Suscribirse Anual
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SubscriptionSection;