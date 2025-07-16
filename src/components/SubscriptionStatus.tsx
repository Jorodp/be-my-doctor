import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CreditCard, RefreshCw } from "lucide-react";
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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && profile?.role === "doctor") {
      checkSubscription();
    }
  }, [user, profile]);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { action: "check-subscription" }
      });

      if (error) throw error;
      
      if (data.hasActiveSubscription) {
        setSubscription(data.subscription);
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

  const handleRenew = async () => {
    if (!subscription) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { 
          action: "create-subscription",
          plan: subscription.plan 
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
      setLoading(false);
    }
  };

  if (profile?.role !== "doctor") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Mi Suscripción
            </CardTitle>
            <CardDescription>
              Estado de tu suscripción a la plataforma
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
            <div className="flex items-center justify-between">
              <span className="font-medium">Plan:</span>
              <Badge variant="default">
                {subscription.plan === "monthly" ? "Mensual" : "Anual"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Estado:</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Activa
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Monto:</span>
              <span className="font-semibold">
                ${subscription.amount.toLocaleString()} MXN
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Vence:</span>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(subscription.ends_at), "dd 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleRenew}
                disabled={loading}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Renovar Suscripción
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              No tienes una suscripción activa
            </p>
            <Badge variant="destructive">
              Suscripción Requerida
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}