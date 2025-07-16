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
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing POST request...");

    // Get request body
    let body;
    try {
      body = await req.json();
      console.log("Request body parsed successfully:", body);
    } catch (e) {
      console.error("Failed to parse request body:", e);
      throw new Error("Invalid JSON in request body");
    }

    const { plan_type } = body;
    
    if (!plan_type || !['monthly', 'annual'].includes(plan_type)) {
      console.error("Invalid plan_type:", plan_type);
      throw new Error("Invalid plan_type. Must be 'monthly' or 'annual'");
    }

    // Check Stripe key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found in environment");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    console.log("Stripe key found, length:", stripeKey.length);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      throw new Error("No authorization header provided");
    }
    console.log("Authorization header found");

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      throw new Error("Missing Supabase configuration");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, { 
      auth: { persistSession: false } 
    });

    const token = authHeader.replace("Bearer ", "");
    console.log("Authenticating user with token length:", token.length);
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      console.error("Authentication failed:", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      console.error("No user or email found in auth response");
      throw new Error("User not authenticated or email not available");
    }
    console.log("User authenticated successfully:", { userId: user.id, email: user.email });

    // Verify user is a doctor
    console.log("Checking user role...");
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile query error:", profileError);
      throw new Error(`Profile error: ${profileError.message}`);
    }

    if (profile?.role !== "doctor") {
      console.error("User is not a doctor:", { role: profile?.role });
      throw new Error("User is not authorized to create doctor subscriptions");
    }
    console.log("Doctor authorization verified");

    // Initialize Stripe
    console.log("Initializing Stripe client...");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    console.log("Checking for existing Stripe customer...");
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Existing customer found:", customerId);
    } else {
      console.log("Creating new Stripe customer...");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          role: "doctor"
        }
      });
      customerId = customer.id;
      console.log("New customer created:", customerId);
    }

    // Set price IDs
    const selectedPriceId = plan_type === 'monthly' 
      ? "price_1RlLZh2QFgncbl10moSdGhjZ" 
      : "price_1RlLaW2QFgncbl10pCwWOFFM";

    console.log("Creating checkout session with:", { 
      priceId: selectedPriceId, 
      planType: plan_type,
      customerId 
    });

    // Get the app URL
    const origin = req.headers.get("origin") || "https://5bee6252-13cc-4dc8-849d-50c7ff6e61ad.lovableproject.com";
    console.log("Using origin:", origin);
    
    // Create checkout session
    const sessionParams = {
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
    };

    console.log("Stripe session parameters:", sessionParams);
    
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Checkout session created successfully:", { 
      sessionId: session.id, 
      url: session.url,
      mode: session.mode 
    });

    const response = { url: session.url };
    console.log("Returning response:", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("=== ERROR in create-doctor-subscription ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    const errorResponse = { error: error.message };
    console.log("Returning error response:", errorResponse);
    
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});