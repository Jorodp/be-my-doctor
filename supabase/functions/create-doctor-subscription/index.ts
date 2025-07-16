import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🚀 CREATE-DOCTOR-SUBSCRIPTION FUNCTION CALLED!");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request...");
    
    // Parse request body first
    let body;
    try {
      body = await req.json();
      console.log("Body received:", JSON.stringify(body));
    } catch (parseError) {
      console.error("Failed to parse JSON body:", parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        details: parseError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if plan_type is provided
    if (!body.plan_type) {
      console.error("Missing plan_type in request body");
      return new Response(JSON.stringify({ 
        error: "plan_type is required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Using SERVICE ROLE KEY
    
    console.log("Environment check:", {
      hasStripeKey: !!stripeKey,
      stripeKeyLength: stripeKey?.length || 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey?.length || 0
    });

    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found in environment");
      return new Response(JSON.stringify({ 
        error: "Stripe configuration missing" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!supabaseServiceKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY not found in environment");
      return new Response(JSON.stringify({ 
        error: "Supabase configuration missing" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Check authorization header
    const authHeader = req.headers.get("Authorization");
    console.log("Authorization header check:", {
      hasAuthHeader: !!authHeader,
      authHeaderStart: authHeader?.substring(0, 20) + "...",
      authHeaderLength: authHeader?.length || 0
    });
    
    if (!authHeader) {
      console.error("No Authorization header found");
      return new Response(JSON.stringify({ 
        error: "Authorization header required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Create Supabase client with SERVICE ROLE KEY for admin operations
    let supabaseAdmin;
    try {
      supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, { 
        auth: { persistSession: false } 
      });
      console.log("✅ Supabase ADMIN client created successfully with SERVICE ROLE KEY");
    } catch (clientError) {
      console.error("❌ Failed to create Supabase admin client:", clientError);
      return new Response(JSON.stringify({ 
        error: "Failed to initialize database connection",
        details: clientError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Create a regular client for user authentication
    let supabaseAuth;
    try {
      supabaseAuth = createClient(supabaseUrl!, Deno.env.get("SUPABASE_ANON_KEY")!, { 
        auth: { persistSession: false } 
      });
      console.log("✅ Supabase AUTH client created successfully");
    } catch (authClientError) {
      console.error("❌ Failed to create Supabase auth client:", authClientError);
      return new Response(JSON.stringify({ 
        error: "Failed to initialize auth connection",
        details: authClientError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Authenticate user with the auth client
    const token = authHeader.replace("Bearer ", "");
    console.log("Authenticating user with token length:", token.length);
    
    let userData;
    try {
      const result = await supabaseAuth.auth.getUser(token);
      userData = result.data;
      
      if (result.error) {
        console.error("❌ User authentication failed:", result.error);
        return new Response(JSON.stringify({ 
          error: "Authentication failed",
          details: result.error.message 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    } catch (authError) {
      console.error("❌ Authentication error:", authError);
      return new Response(JSON.stringify({ 
        error: "Authentication error",
        details: authError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = userData.user;
    if (!user?.email) {
      console.error("❌ User data invalid:", userData);
      return new Response(JSON.stringify({ 
        error: "User not authenticated or email missing" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("✅ User authenticated successfully:", { 
      userId: user.id, 
      email: user.email 
    });

    // Verify user role using admin client
    console.log("Checking user role with admin client...");
    let profile;
    try {
      const result = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      
      profile = result.data;
      
      if (result.error) {
        console.error("❌ Profile fetch error:", result.error);
        return new Response(JSON.stringify({ 
          error: "Could not verify user role",
          details: result.error.message 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    } catch (profileError) {
      console.error("❌ Profile query error:", profileError);
      return new Response(JSON.stringify({ 
        error: "Profile lookup failed",
        details: profileError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (!profile || profile.role !== "doctor") {
      console.error("❌ User is not a doctor, role:", profile?.role);
      return new Response(JSON.stringify({ 
        error: "Only doctors can subscribe",
        userRole: profile?.role || "unknown"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    console.log("✅ Doctor authorization verified");

    // Initialize Stripe client
    console.log("Initializing Stripe client...");
    let stripe;
    try {
      stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      console.log("✅ Stripe client initialized successfully");
    } catch (stripeInitError) {
      console.error("❌ Failed to initialize Stripe:", stripeInitError);
      return new Response(JSON.stringify({ 
        error: "Payment system initialization failed",
        details: stripeInitError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Set price IDs and validate plan type
    const priceIds = {
      monthly: "price_1RlLZh2QFgncbl10moSdGhjZ",
      annual: "price_1RlLaW2QFgncbl10pCwWOFFM"
    };

    const planType = body.plan_type;
    const priceId = priceIds[planType as keyof typeof priceIds];
    
    if (!priceId) {
      console.error("❌ Invalid plan type:", planType);
      return new Response(JSON.stringify({ 
        error: "Invalid plan type",
        validTypes: Object.keys(priceIds),
        received: planType 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("✅ Plan validation successful:", { priceId, planType });

    // Get origin for URLs
    const origin = req.headers.get("origin") || "https://bemy.com.mx";
    console.log("Using origin:", origin);

    // Check for existing Stripe customer
    let customerId;
    try {
      console.log("Checking for existing Stripe customer...");
      const customers = await stripe.customers.list({ 
        email: user.email, 
        limit: 1 
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("✅ Existing customer found:", customerId);
      } else {
        console.log("ℹ️ No existing customer found, will create new one");
      }
    } catch (customerError) {
      console.error("⚠️ Error checking for existing customer:", customerError);
      // Continue without existing customer
    }

    // Prepare Stripe session parameters
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

    console.log("🔧 Stripe session parameters:", JSON.stringify(sessionParams, null, 2));

    // FALLBACK TEST: Return fake URL to test if Stripe is the issue
    const enableFallback = false; // Set to true to test
    if (enableFallback) {
      console.log("🧪 FALLBACK MODE: Returning test URL instead of calling Stripe");
      return new Response(JSON.stringify({ 
        url: "https://checkout.stripe.com/test-session-url",
        message: "Function is working correctly",
        body: body
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create checkout session with Stripe
    let session;
    try {
      console.log("🔄 Creating Stripe checkout session...");
      session = await stripe.checkout.sessions.create(sessionParams);
      
      console.log("✅ Stripe checkout session creation SUCCESS");
      console.log("📊 Full Stripe session result:", JSON.stringify({
        id: session.id,
        url: session.url,
        mode: session.mode,
        status: session.status,
        customer: session.customer,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata
      }, null, 2));
      
    } catch (stripeError) {
      console.error("❌ Stripe checkout session creation FAILED:");
      console.error("Error type:", stripeError.constructor.name);
      console.error("Error message:", stripeError.message);
      console.error("Error code:", (stripeError as any).code);
      console.error("Error type detail:", (stripeError as any).type);
      console.error("Full error:", JSON.stringify(stripeError, null, 2));
      
      return new Response(JSON.stringify({ 
        error: "Failed to create payment session",
        details: stripeError.message,
        stripeErrorCode: (stripeError as any).code,
        stripeErrorType: (stripeError as any).type
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Validate session URL
    if (!session.url) {
      console.error("❌ Stripe session created but no URL returned");
      return new Response(JSON.stringify({ 
        error: "Payment session created but redirect URL missing",
        sessionId: session.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Return success response
    const response = { url: session.url };
    console.log("🎉 SUCCESS: Returning checkout URL:", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("💥 UNEXPECTED ERROR in create-doctor-subscription:");
    console.error("Error name:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    const errorResponse = {
      error: "Unexpected server error",
      details: error.message,
      errorType: error.constructor.name
    };
    console.log("🔥 Returning detailed error response:", errorResponse);

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});