import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log('=== UPDATE ASSISTANT ASSIGNMENT REQUEST ===');
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    const { assistant_user_id, doctor_id } = await req.json();
    console.log('Request data:', { assistant_user_id, doctor_id });

    if (!assistant_user_id || !doctor_id) {
      return new Response(
        JSON.stringify({ error: "assistant_user_id and doctor_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    console.log(`Updating assistant profile: ${assistant_user_id} -> doctor: ${doctor_id}`);

    // Update the profile to include assigned_doctor_id
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        assigned_doctor_id: doctor_id
      })
      .eq("user_id", assistant_user_id)
      .eq("role", "assistant");

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Error updating assistant profile: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Assistant profile updated successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Assistant profile updated successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("=== ERROR IN UPDATE ASSISTANT ===");
    console.error("Error details:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});