import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const body = await req.json();
    console.log("Body received:", JSON.stringify(body));

    // Simulate successful response for testing
    const testResponse = {
      url: "https://checkout.stripe.com/test-session-url",
      message: "Function is working correctly",
      body: body
    };

    console.log("Returning test response:", testResponse);

    return new Response(JSON.stringify(testResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("ERROR:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      message: "Function executed but caught error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});