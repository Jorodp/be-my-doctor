import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionData {
  subscribed: boolean;
  plan: string;
  status: string;
  ends_at?: string;
  amount?: number;
}

export const useDoctorSubscription = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("useDoctorSubscription: Checking subscription for user:", user?.id);
      
      // Consulta directa a la tabla subscriptions para incluir suscripciones manuales
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("useDoctorSubscription: Subscription query error:", error);
        throw error;
      }

      console.log("useDoctorSubscription: Subscriptions found:", subscriptions);

      // Verificar si hay alguna suscripción activa y no expirada
      const now = new Date();
      const activeSubscription = subscriptions?.find(sub => {
        const endsAt = new Date(sub.ends_at);
        const isActive = sub.status === 'active' && endsAt >= now;
        console.log(`useDoctorSubscription: Subscription ${sub.id}: status=${sub.status}, ends_at=${sub.ends_at}, active=${isActive}`);
        return isActive;
      });

      if (activeSubscription) {
        console.log("useDoctorSubscription: Active subscription found:", activeSubscription);
        setSubscriptionData({
          subscribed: true,
          plan: activeSubscription.plan,
          status: activeSubscription.status,
          ends_at: activeSubscription.ends_at,
          amount: activeSubscription.amount
        });
      } else {
        console.log("useDoctorSubscription: No active subscription found");
        setSubscriptionData({
          subscribed: false,
          plan: "none",
          status: "inactive"
        });
      }
    } catch (error) {
      console.error('useDoctorSubscription: Error checking subscription:', error);
      // Set default values on error
      setSubscriptionData({
        subscribed: false,
        plan: "none",
        status: "inactive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  const isSubscribed = subscriptionData?.subscribed && subscriptionData?.status === 'active';

  return {
    subscriptionData,
    loading,
    isSubscribed,
    checkSubscription
  };
};