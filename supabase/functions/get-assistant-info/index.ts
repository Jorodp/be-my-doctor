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
    console.log('Processing assistant info request');

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
        JSON.stringify({ error: 'Only doctors and admins can access assistant info' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, doctorId } = await req.json();

    if (action === 'get_assigned_assistant') {
      // Get assistant assigned to this doctor
      const { data: { users }, error: usersError } = await supabaseServiceRole.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find assistant assigned to this doctor
      const assignedAssistant = users?.find(u => 
        u.user_metadata?.assigned_doctor_id === (doctorId || userData.user.id)
      );

      if (!assignedAssistant) {
        return new Response(
          JSON.stringify({ assistant: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get assistant profile details
      const { data: assistantProfile } = await supabaseServiceRole
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', assignedAssistant.id)
        .single();

      const assistantInfo = {
        user_id: assignedAssistant.id,
        full_name: assistantProfile?.full_name || null,
        email: assignedAssistant.email || '',
        phone: assistantProfile?.phone || null
      };

      return new Response(
        JSON.stringify({ assistant: assistantInfo }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get_available_assistants') {
      // Get all users with role assistant
      const { data: assistantProfiles, error } = await supabaseServiceRole
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'assistant');

      if (error) {
        console.error('Error fetching assistant profiles:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch assistant profiles' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get auth user details for emails
      const { data: { users }, error: usersError } = await supabaseServiceRole.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const assistantsWithEmails = assistantProfiles?.map(profile => {
        const authUser = users?.find(u => u.id === profile.user_id);
        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: authUser?.email || '',
          assigned_doctor_id: authUser?.user_metadata?.assigned_doctor_id || null
        };
      }) || [];

      return new Response(
        JSON.stringify({ assistants: assistantsWithEmails }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "get_assigned_assistant" or "get_available_assistants"' }),
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