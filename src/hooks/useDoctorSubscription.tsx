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
      const { data, error } = await supabase.functions.invoke('verify-doctor-subscription');
      if (error) throw error;
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
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