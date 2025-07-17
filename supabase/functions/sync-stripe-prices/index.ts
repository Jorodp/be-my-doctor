import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing environment variables");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Price IDs from your subscription function
    const priceIds = {
      monthly: "price_1RlLZh2QFgncbl10moSdGhjZ",
      annual: "price_1RlLaW2QFgncbl10pCwWOFFM"
    };

    console.log("Fetching Stripe prices...");

    // Get actual prices from Stripe
    const monthlyPrice = await stripe.prices.retrieve(priceIds.monthly);
    const annualPrice = await stripe.prices.retrieve(priceIds.annual);

    console.log("Stripe prices retrieved:", {
      monthly: {
        id: monthlyPrice.id,
        amount: monthlyPrice.unit_amount,
        currency: monthlyPrice.currency
      },
      annual: {
        id: annualPrice.id,
        amount: annualPrice.unit_amount,
        currency: annualPrice.currency
      }
    });

    // Convert from cents to currency units (for MXN)
    const monthlyAmount = monthlyPrice.unit_amount ? monthlyPrice.unit_amount / 100 : 0;
    const annualAmount = annualPrice.unit_amount ? annualPrice.unit_amount / 100 : 0;

    // Update Supabase payment_settings
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { data, error } = await supabase
      .from('payment_settings')
      .upsert({
        id: true,
        monthly_price: monthlyAmount,
        annual_price: annualAmount,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      throw error;
    }

    console.log("Payment settings updated successfully:", data);

    return new Response(
      JSON.stringify({
        success: true,
        prices: {
          monthly: monthlyAmount,
          annual: annualAmount
        },
        updated: data
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error syncing Stripe prices:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});