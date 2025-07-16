import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("TEST FUNCTION STARTED");
    
    const body = await req.json();
    console.log("Body received:", body);
    
    return new Response(JSON.stringify({ 
      status: "success", 
      message: "Test function works",
      body: body 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.log("ERROR in test function:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      status: "error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});