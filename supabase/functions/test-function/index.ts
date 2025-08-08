import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info("test-function invoked", { method: req.method });

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Test function works",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (_error) {
    logger.error("test-function error");
    return new Response(
      JSON.stringify({ error: "Internal error", hint: "test-function failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
