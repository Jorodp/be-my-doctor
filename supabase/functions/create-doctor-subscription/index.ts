import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-DOCTOR-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get request body
    const body = await req.json();
    const { plan_type } = body;
    logStep("Request body parsed", { plan_type });
    
    if (!plan_type || !['monthly', 'annual'].includes(plan_type)) {
      throw new Error("Invalid plan_type. Must be 'monthly' or 'annual'");
    }

    // Check Stripe key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not found");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Stripe key verified");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      throw new Error("No authorization header provided");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    logStep("Getting user from token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("ERROR: Authentication failed", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("ERROR: No user or email found");
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Verify user is a doctor
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || profile?.role !== "doctor") {
      logStep("ERROR: User is not a doctor", { profileError, role: profile?.role });
      throw new Error("User is not authorized to create doctor subscriptions");
    }
    logStep("Doctor authorization verified");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    logStep("Checking for existing customer");
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("Creating new customer");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          role: "doctor"
        }
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Set price IDs based on plan type - USING EXACT PRICE IDs PROVIDED
    const selectedPriceId = plan_type === 'monthly' 
      ? "price_1RlLZh2QFgncbl10moSdGhjZ" 
      : "price_1RlLaW2QFgncbl10pCwWOFFM";

    logStep("Creating checkout session", { priceId: selectedPriceId, planType: plan_type });

    // Get the app URL from request origin or use default
    const origin = req.headers.get("origin") || "https://5bee6252-13cc-4dc8-849d-50c7ff6e61ad.lovableproject.com";
    
    // Create checkout session with EXACT CONFIGURATION as specified
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard/doctor?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/doctor`,
      client_reference_id: user.id,
      metadata: {
        userRole: "doctor",
        plan_type: plan_type,
        user_id: user.id
      }
    });

    logStep("Checkout session created successfully", { 
      sessionId: session.id, 
      url: session.url,
      mode: session.mode 
    });

    // Return the URL as specified
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-doctor-subscription", { 
      message: errorMessage, 
      stack: error instanceof Error ? error.stack : undefined 
    });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});