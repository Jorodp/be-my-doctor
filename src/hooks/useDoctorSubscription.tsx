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
      
      // Primero verificar en doctor_profiles si tiene suscripción local activa
      const { data: doctorProfile, error: profileError } = await supabase
        .from('doctor_profiles')
        .select('subscription_status, subscription_expires_at')
        .eq('user_id', user?.id)
        .single();

      if (!profileError && doctorProfile?.subscription_status === 'active') {
        console.log("useDoctorSubscription: Found active subscription in doctor_profiles:", doctorProfile);
        
        // Verificar si la suscripción no ha expirado
        const now = new Date();
        const expiresAt = doctorProfile.subscription_expires_at ? new Date(doctorProfile.subscription_expires_at) : null;
        
        if (!expiresAt || expiresAt >= now) {
          setSubscriptionData({
            subscribed: true,
            plan: 'active',
            status: 'active',
            ends_at: doctorProfile.subscription_expires_at || '',
            amount: 0
          });
          setLoading(false);
          return;
        } else {
          console.log("useDoctorSubscription: Local subscription expired, checking with Stripe");
        }
      }

      // Si no tiene suscripción local activa o está expirada, verificar con Stripe
      console.log("useDoctorSubscription: Verifying with Stripe...");
      const { data, error } = await supabase.functions.invoke('verify-doctor-subscription');
      
      if (error) {
        console.error("useDoctorSubscription: Error from verify-doctor-subscription:", error);
        throw error;
      }
      
      console.log("useDoctorSubscription: Stripe verification response:", data);
      
      if (data?.subscribed && data?.status === 'active') {
        console.log("useDoctorSubscription: Active subscription found from Stripe");
        setSubscriptionData({
          subscribed: true,
          plan: data.plan || 'active',
          status: 'active',
          ends_at: data.ends_at || '',
          amount: data.amount || 0
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