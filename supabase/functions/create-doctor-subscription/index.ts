import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

  console.log("🚀 CREATE-DOCTOR-SUBSCRIPTION FUNCTION CALLED!");
  console.log("Request method:", req.method);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));

  try {
    // Parse request body
    const body = await req.json();
    console.log("Body received:", body);

    // Validate plan_type is required
    const { plan_type } = body;
    if (!plan_type || !["monthly", "annual"].includes(plan_type)) {
      return new Response(
        JSON.stringify({ error: "plan_type is required and must be 'monthly' or 'annual'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    console.log("Environment check:", {
      hasStripeKey: !!stripeKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasAnonKey: !!anonKey
    });

    if (!stripeKey || !supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("Missing environment variables!");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    console.log("Authenticating user with token length:", token.length);
    
    const { data: userData, error: authError } = await authClient.auth.getUser(token);

    if (authError || !userData.user?.email) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    console.log("User authenticated:", { id: user.id, email: user.email });

    // Verify doctor role with SERVICE_ROLE_KEY client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    console.log("Checking doctor role for user:", user.id);
    
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("Profile query result:", { profile, profileError });

    if (profileError || !profile || profile.role !== "doctor") {
      console.error("Doctor role verification failed:", { profileError, profile });
      return new Response(
        JSON.stringify({ error: "Only doctors can subscribe" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Doctor role verified successfully");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Price IDs
    const priceIds = {
      monthly: "price_1RlLZh2QFgncbl10moSdGhjZ",
      annual: "price_1RlLaW2QFgncbl10pCwWOFFM"
    };

    const priceId = priceIds[plan_type as keyof typeof priceIds];
    console.log("Using price ID:", priceId);

    // Check for existing Stripe customer
    let customerId;
    console.log("Checking for existing Stripe customer...");
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    } else {
      console.log("No existing customer found, will create new one at checkout");
    }

    // Create checkout session
    console.log("Creating Stripe checkout session...");
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
        plan: plan_type, // También agregamos "plan" para compatibilidad con el webhook
        user_id: user.id
      }
    });

    console.log("✅ Checkout session created successfully:", { 
      sessionId: session.id, 
      url: session.url,
      metadata: session.metadata 
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Error in create-doctor-subscription:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({ 
        error: "Server error occurred",
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});