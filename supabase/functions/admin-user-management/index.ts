import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  console.log('Admin user management function called with method:', req.method);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // Allow admin and assistant roles for certain actions
    const allowedRoles = ['admin', 'assistant'];
    if (profileError || !allowedRoles.includes(profile?.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied: Admin or Assistant role required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const { action } = body;

    console.log('Processing action:', action);

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    switch (action) {
      case 'list':
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) throw listError;

        // Get additional profile data
        const userIds = authUsers.users.map(u => u.id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        const { data: doctorProfiles } = await supabase
          .from('doctor_profiles')
          .select('*')
          .in('user_id', userIds);

        // Combine data
        const enrichedUsers = authUsers.users.map(authUser => {
          const profile = profiles?.find(p => p.user_id === authUser.id);
          const doctorProfile = doctorProfiles?.find(d => d.user_id === authUser.id);
          
          return {
            ...authUser,
            profile,
            doctorProfile
          };
        });

        return new Response(JSON.stringify({ 
          success: true, 
          users: enrichedUsers 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'create':
        const { email, password, role, fullName, specialty, professionalLicense } = body;
        
        if (!email || !password || !role) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email, password and role are required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          user_metadata: { role, full_name: fullName },
          email_confirm: true
        });

        if (createError) throw createError;

        return new Response(JSON.stringify({ 
          success: true, 
          user: newUser 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'update':
        const { userId, email: newEmail, password: newPassword, role: newRole, fullName: newFullName } = body;
        
        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'User ID is required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const updateData: any = {};
        
        if (newEmail) updateData.email = newEmail;
        if (newPassword) updateData.password = newPassword;
        if (newRole || newFullName) {
          updateData.user_metadata = { 
            role: newRole,
            full_name: newFullName 
          };
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          updateData
        );

        if (updateError) throw updateError;

        // Also update profile table
        if (newRole || newFullName) {
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              role: newRole,
              full_name: newFullName
            })
            .eq('user_id', userId);

          if (profileUpdateError) throw profileUpdateError;
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'User updated successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'delete':
        const { userId: deleteUserId } = body;
        
        if (!deleteUserId) {
          return new Response(
            JSON.stringify({ success: false, error: 'User ID is required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(deleteUserId);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'User deleted successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'create_patient': {
        const { email, full_name, phone, address, date_of_birth } = body;
        
        if (!email || !full_name) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email y nombre completo son requeridos' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Create user in auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: {
            full_name: full_name,
            role: 'patient'
          }
        });

        if (authError) {
          console.error('Auth error:', authError);
          return new Response(
            JSON.stringify({ success: false, error: 'Error creando usuario en auth', details: authError.message }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            full_name: full_name,
            phone: phone || null,
            address: address || null,
            date_of_birth: date_of_birth || null,
            role: 'patient'
          });

        if (profileError) {
          console.error('Profile error:', profileError);
          // Clean up auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          return new Response(
            JSON.stringify({ success: false, error: 'Error creando perfil', details: profileError.message }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            user_id: authData.user.id,
            message: 'Paciente creado exitosamente'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Invalid action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

  } catch (error) {
    console.error('Error in admin-user-management function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});