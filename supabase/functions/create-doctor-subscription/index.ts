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
  console.log("URL:", req.url);
  
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 CREATE-DOCTOR-SUBSCRIPTION FUNCTION CALLED!");
    console.log("Processing request...");
    
    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log("Body received:", JSON.stringify(body));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate required environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    console.log("Environment check:", {
      hasStripeKey: !!stripeKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey
    });

    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is not set");
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY is not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header found");
      return new Response(JSON.stringify({ error: "Authorization header is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("Authorization header found");

    // Create Supabase client
    let supabase;
    try {
      supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", { 
        auth: { persistSession: false } 
      });
      console.log("Supabase client created successfully");
    } catch (clientError) {
      console.error("Failed to create Supabase client:", clientError);
      return new Response(JSON.stringify({ error: "Failed to initialize Supabase client" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    console.log("Authenticating user with token length:", token.length);
    
    let userData;
    try {
      const result = await supabase.auth.getUser(token);
      userData = result.data;
      
      if (result.error) {
        console.error("User authentication failed:", result.error);
        return new Response(JSON.stringify({ error: `Authentication failed: ${result.error.message}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    } catch (authError) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = userData.user;
    if (!user?.email) {
      console.error("User data invalid:", userData);
      return new Response(JSON.stringify({ error: "User not authenticated or email not available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("User authenticated successfully:", { userId: user.id, email: user.email });

    // Verify user role
    console.log("Checking user role...");
    let profile;
    try {
      const result = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      profile = result.data;
      
      if (result.error) {
        console.error("Profile fetch error:", result.error);
        return new Response(JSON.stringify({ error: "Could not verify user role" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    } catch (profileError) {
      console.error("Profile query error:", profileError);
      return new Response(JSON.stringify({ error: "Could not verify user role" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (profile?.role !== "doctor") {
      console.error("User is not a doctor, role:", profile?.role);
      return new Response(JSON.stringify({ error: "Only doctors can subscribe" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    console.log("Doctor authorization verified");

    // Initialize Stripe
    console.log("Initializing Stripe client...");
    let stripe;
    try {
      stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      console.log("Stripe client initialized successfully");
    } catch (stripeInitError) {
      console.error("Failed to initialize Stripe:", stripeInitError);
      return new Response(JSON.stringify({ error: "Failed to initialize Stripe" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Get origin for URLs
    const origin = req.headers.get("origin") || "https://bemy.com.mx";
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
      return new Response(JSON.stringify({ error: "Invalid plan type. Must be 'monthly' or 'annual'" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Creating checkout session with:", { priceId, planType });

    // Check for existing Stripe customer
    let customerId;
    try {
      console.log("Checking for existing Stripe customer...");
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("Existing customer found:", customerId);
      } else {
        console.log("No existing customer found, will create new one");
      }
    } catch (customerError) {
      console.error("Error checking for existing customer:", customerError);
      // Continue without existing customer
    }

    // Create Stripe session parameters
    const sessionParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription" as const,
      success_url: `${origin}/dashboard/doctor?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/doctor`,
      client_reference_id: user.id,
      metadata: {
        userRole: "doctor",
        plan_type: planType,
        user_id: user.id
      }
    };

    console.log("Stripe session parameters:", JSON.stringify(sessionParams, null, 2));

    // Create checkout session
    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
      console.log("Checkout session created successfully:", { sessionId: session.id, url: session.url });
    } catch (stripeError) {
      console.error("Stripe checkout session creation failed:", stripeError);
      return new Response(JSON.stringify({ 
        error: `Failed to create checkout session: ${stripeError.message}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Return success response
    const response = { url: session.url };
    console.log("Returning test response:", JSON.stringify(response));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("=== UNEXPECTED ERROR in create-doctor-subscription ===");
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