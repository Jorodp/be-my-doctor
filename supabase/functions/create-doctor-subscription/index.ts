import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== CREATE-DOCTOR-SUBSCRIPTION FUNCTION STARTED ===");
  console.log("Method:", req.method);
  
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing POST request...");
    console.log("Headers:", Object.fromEntries(req.headers.entries()));
    
    const body = await req.json();
    console.log("Request body parsed successfully:", body);

    // Validate required environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is not set");
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    console.log("Stripe key found, length:", stripeKey.length);

    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header found");
      throw new Error("Authorization header is required");
    }
    console.log("Authorization header found");

    // Authenticate user
    console.log("Authenticating user with token length:", authHeader.replace("Bearer ", "").length);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error("User authentication failed:", userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.email) {
      console.error("User data invalid:", userData);
      throw new Error("User not authenticated or email not available");
    }

    console.log("User authenticated successfully:", { userId: user.id, email: user.email });

    // Verify user role
    console.log("Checking user role...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Could not verify user role");
    }

    if (profile?.role !== "doctor") {
      console.error("User is not a doctor, role:", profile?.role);
      throw new Error("Only doctors can subscribe");
    }

    console.log("Doctor authorization verified");

    // Initialize Stripe
    console.log("Initializing Stripe client...");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check for existing Stripe customer
    console.log("Checking for existing Stripe customer...");
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Existing customer found:", customerId);
    }

    // Get origin for URLs
    const origin = req.headers.get("origin") || "https://5bee6252-13cc-4dc8-849d-50c7ff6e61ad.lovableproject.com";
    console.log("Using origin:", origin);

    // Set correct price IDs
    const priceIds = {
      monthly: "price_1RlLZh2QFgncbl10moSdGhjZ",
      annual: "price_1RlLaW2QFgncbl10pCwWOFFM"
    };

    const planType = body.plan_type;
    const priceId = priceIds[planType as keyof typeof priceIds];
    
    if (!priceId) {
      console.error("Invalid plan type:", planType);
      throw new Error("Invalid plan type. Must be 'monthly' or 'annual'");
    }

    console.log("Creating checkout session with:", { priceId, planType, customerId });

    // Create Stripe session parameters
    const sessionParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard/doctor?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/doctor`,
      client_reference_id: user.id,
      metadata: {
        userRole: "doctor",
        plan_type: planType,
        user_id: user.id
      }
    };

    console.log("Stripe session parameters:", sessionParams);

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Checkout session created successfully:", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== ERROR in create-doctor-subscription ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    const errorResponse = {
      error: error.message || "Unknown error occurred"
    };
    console.log("Returning error response:", errorResponse);

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});