import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing assistant assignment request');

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for user management
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create regular client to verify the requesting user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Set the auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !userData.user) {
      console.error('Invalid user token:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is doctor or admin
    const { data: userProfile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single();

    if (profileError || !userProfile || !['doctor', 'admin'].includes(userProfile.role)) {
      console.error('User not authorized:', profileError, userProfile);
      return new Response(
        JSON.stringify({ error: 'Only doctors and admins can assign assistants' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { assistantUserId, doctorUserId, action } = await req.json();

    if (!assistantUserId || !doctorUserId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: assistantUserId, doctorUserId, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${action} for assistant ${assistantUserId} and doctor ${doctorUserId}`);

    // Verify assistant exists and has correct role
    const { data: assistantProfile, error: assistantError } = await supabaseServiceRole
      .from('profiles')
      .select('role')
      .eq('user_id', assistantUserId)
      .single();

    if (assistantError || !assistantProfile || assistantProfile.role !== 'assistant') {
      console.error('Invalid assistant:', assistantError, assistantProfile);
      return new Response(
        JSON.stringify({ error: 'Invalid assistant user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify doctor exists and has correct role
    const { data: doctorProfile, error: doctorError } = await supabaseServiceRole
      .from('profiles')
      .select('role')
      .eq('user_id', doctorUserId)
      .single();

    if (doctorError || !doctorProfile || doctorProfile.role !== 'doctor') {
      console.error('Invalid doctor:', doctorError, doctorProfile);
      return new Response(
        JSON.stringify({ error: 'Invalid doctor user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'assign') {
      // Check if assistant is already assigned to another doctor
      const { data: currentAssistant } = await supabaseServiceRole.auth.admin.getUserById(assistantUserId);
      
      if (currentAssistant.user?.user_metadata?.assigned_doctor_id && 
          currentAssistant.user.user_metadata.assigned_doctor_id !== doctorUserId) {
        return new Response(
          JSON.stringify({ 
            error: 'Assistant is already assigned to another doctor',
            currentDoctorId: currentAssistant.user.user_metadata.assigned_doctor_id
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Assign assistant to doctor
      const { error: updateError } = await supabaseServiceRole.auth.admin.updateUserById(
        assistantUserId,
        {
          user_metadata: {
            assigned_doctor_id: doctorUserId
          }
        }
      );

      if (updateError) {
        console.error('Error assigning assistant:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to assign assistant' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully assigned assistant ${assistantUserId} to doctor ${doctorUserId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Assistant assigned successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'unassign') {
      // Remove assistant assignment
      const { error: updateError } = await supabaseServiceRole.auth.admin.updateUserById(
        assistantUserId,
        {
          user_metadata: {
            assigned_doctor_id: null
          }
        }
      );

      if (updateError) {
        console.error('Error unassigning assistant:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to unassign assistant' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully unassigned assistant ${assistantUserId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Assistant unassigned successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "assign" or "unassign"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})