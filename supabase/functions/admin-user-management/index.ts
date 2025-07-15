import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'assistant' | 'admin';
  fullName?: string;
  assignedDoctorId?: string;
  specialty?: string;
  professionalLicense?: string;
}

interface UpdateUserRequest {
  userId: string;
  email?: string;
  password?: string;
  role?: 'patient' | 'doctor' | 'assistant' | 'admin';
  fullName?: string;
  assignedDoctorId?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase Admin Client
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

    // Initialize regular client for RLS operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const method = req.method;

    // GET - List all users
    if (method === 'GET' && action === 'list') {
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) throw error;

      // Get additional profile data
      const userIds = users.users.map(u => u.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const { data: doctorProfiles } = await supabase
        .from('doctor_profiles')
        .select('*')
        .in('user_id', userIds);

      // Combine data
      const enrichedUsers = users.users.map(user => {
        const profile = profiles?.find(p => p.user_id === user.id);
        const doctorProfile = doctorProfiles?.find(d => d.user_id === user.id);
        
        return {
          ...user,
          profile,
          doctorProfile
        };
      });

      return new Response(JSON.stringify({ users: enrichedUsers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create user
    if (method === 'POST' && action === 'create') {
      const body: CreateUserRequest = await req.json();
      
      // Create user in auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        user_metadata: {
          role: body.role,
          full_name: body.fullName || '',
          assigned_doctor_id: body.assignedDoctorId
        }
      });

      if (createError) throw createError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          role: body.role,
          full_name: body.fullName || '',
        });

      if (profileError) throw profileError;

      // If doctor, create doctor profile
      if (body.role === 'doctor') {
        const { error: doctorError } = await supabase
          .from('doctor_profiles')
          .insert({
            user_id: newUser.user.id,
            specialty: body.specialty || '',
            professional_license: body.professionalLicense || '',
            verification_status: 'pending'
          });

        if (doctorError) throw doctorError;
      }

      console.log('User created successfully:', newUser.user.id);
      
      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update user
    if (method === 'PUT' && action === 'update') {
      const body: UpdateUserRequest = await req.json();
      
      // Update auth user
      const updateData: any = {};
      if (body.email) updateData.email = body.email;
      if (body.password) updateData.password = body.password;
      if (body.role || body.fullName || body.assignedDoctorId) {
        updateData.user_metadata = {};
        if (body.role) updateData.user_metadata.role = body.role;
        if (body.fullName) updateData.user_metadata.full_name = body.fullName;
        if (body.assignedDoctorId) updateData.user_metadata.assigned_doctor_id = body.assignedDoctorId;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
          body.userId,
          updateData
        );

        if (authUpdateError) throw authUpdateError;
      }

      // Update profile
      const profileUpdate: any = {};
      if (body.role) profileUpdate.role = body.role;
      if (body.fullName) profileUpdate.full_name = body.fullName;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('user_id', body.userId);

        if (profileUpdateError) throw profileUpdateError;
      }

      // Update doctor profile if verification status changed
      if (body.verificationStatus) {
        const doctorUpdate: any = { verification_status: body.verificationStatus };
        if (body.verificationStatus === 'verified') {
          doctorUpdate.verified_at = new Date().toISOString();
          doctorUpdate.verified_by = user.id;
        }

        const { error: doctorUpdateError } = await supabase
          .from('doctor_profiles')
          .update(doctorUpdate)
          .eq('user_id', body.userId);

        if (doctorUpdateError) throw doctorUpdateError;
      }

      console.log('User updated successfully:', body.userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete user
    if (method === 'DELETE' && action === 'delete') {
      const userId = url.searchParams.get('userId');
      if (!userId) throw new Error('User ID is required');

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (deleteError) throw deleteError;

      console.log('User deleted successfully:', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action or method');

  } catch (error) {
    console.error('Error in admin-user-management function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});