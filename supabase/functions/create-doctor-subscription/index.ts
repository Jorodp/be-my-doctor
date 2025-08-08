import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "../_shared/logger.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only handle POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

logger.info("create-doctor-subscription invoked");
  try {
    // Validate plan_type is required
    const { plan_type } = await req.json();
    if (!plan_type || !["monthly", "annual"].includes(plan_type)) {
      return new Response(
        JSON.stringify({ error: "plan_type is required and must be 'monthly' or 'annual'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!stripeKey || !supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(JSON.stringify({ error: "Internal error", hint: "Config missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Authenticate user with ANON_KEY client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey);
    
    const { data: userData, error: authError } = await authClient.auth.getUser(token);

    if (authError || !userData.user?.email) {
      logger.warn("Authentication failed");
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    logger.info("User authenticated", { id: user.id });

    // Verify doctor role with SERVICE_ROLE_KEY client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    logger.info("Checking doctor role", { id: user.id });
    
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "doctor") {
      return new Response(
        JSON.stringify({ error: "Internal error", hint: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Price IDs
    const priceIds = {
      monthly: "price_1Rtbak2QFgncbl10DYmxDhJW",
      annual: "price_1Rtbc02QFgncbl10dAfRnxjY"
    };

    const priceId = priceIds[plan_type as keyof typeof priceIds];

    // Check for existing Stripe customer
    let customerId;
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard/doctor?payment=success`,
      cancel_url: `${req.headers.get("origin")}/dashboard/doctor?payment=cancelled`,
      client_reference_id: user.id,
      metadata: {
        plan_type,
        plan: plan_type,
        user_id: user.id
      }
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal error", hint: "create-doctor-subscription failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});