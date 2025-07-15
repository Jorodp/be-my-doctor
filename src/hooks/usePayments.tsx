import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PaymentData {
  id: string;
  appointment_id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  paid_at: string | null;
}

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  ends_at: string;
  amount: number;
}

export function usePayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPayments();
      fetchSubscription();
    }
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("consultation_payments")
        .select("*")
        .or(`patient_user_id.eq.${user.id},doctor_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      setSubscription(data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { action: "check-subscription" }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error checking subscription:", error);
      return { hasActiveSubscription: false };
    }
  };

  const createSubscription = async (plan: "monthly" | "annual") => {
    try {
      const { data, error } = await supabase.functions.invoke("payments", {
        body: { 
          action: "create-subscription",
          plan 
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  };

  const markCashPayment = async (appointmentId: string, amount: number, patientId: string, doctorId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("payments", {
        body: {
          action: "mark-cash-payment",
          appointmentId,
          amount,
          patientId,
          doctorId,
        }
      });

      if (error) throw error;
      await fetchPayments(); // Refresh payments list
      return data;
    } catch (error) {
      console.error("Error marking cash payment:", error);
      throw error;
    }
  };

  return {
    payments,
    subscription,
    loading,
    fetchPayments,
    fetchSubscription,
    checkSubscriptionStatus,
    createSubscription,
    markCashPayment,
  };
}