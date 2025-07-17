import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
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
    console.log('=== STARTING ASSIGN ASSISTANT REQUEST ===');
    
    // Parse request body
    const { email, doctor_id } = await req.json();
    console.log('Parsed request data:', { email, doctor_id });

    if (!email || !doctor_id) {
      console.log('Missing required fields:', { email: !!email, doctor_id: !!doctor_id });
      return new Response(
        JSON.stringify({ error: "Email and doctor_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    console.log('Environment check:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!serviceRoleKey, 
      hasAnonKey: !!anonKey 
    });

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Missing environment variables');
      throw new Error("Missing environment variables");
    }

    // Authenticate the requesting user (doctor)
    const authHeader = req.headers.get("Authorization");
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('No authorization header found');
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey);
    
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is a doctor
    const { data: doctorProfile, error: doctorError } = await authClient
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (doctorError || doctorProfile?.role !== "doctor") {
      return new Response(
        JSON.stringify({ error: "Only doctors can assign assistants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    console.log(`Searching for user with email: ${email}`);

    // Check if user already exists
    const { data: existingUsers, error: searchError } = await adminClient.auth.admin.listUsers();
    
    if (searchError) {
      console.error("Error searching users:", searchError);
      throw new Error("Error searching for existing user");
    }

    const existingUser = existingUsers.users.find(user => user.email === email);
    let assistantUserId: string;
    let message: string;

    if (existingUser) {
      console.log(`Found existing user: ${existingUser.id}`);
      assistantUserId = existingUser.id;

      // Check if user already has a profile
      const { data: existingProfile, error: profileError } = await adminClient
        .from("profiles")
        .select("*")
        .eq("user_id", existingUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (existingProfile) {
        // Verificar que el usuario tenga rol de asistente
        if (existingProfile.role !== 'assistant') {
          throw new Error(`Este correo ya está en uso por una cuenta de tipo ${existingProfile.role}. No se puede asignar como asistente.`);
        }
        message = "Usuario existente asignado como asistente exitosamente";
      } else {
        // Create profile for existing user
        const { error: createProfileError } = await adminClient
          .from("profiles")
          .insert({
            user_id: existingUser.id,
            role: "assistant",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createProfileError) throw createProfileError;
        message = "Perfil creado y asignado como asistente exitosamente";
      }
    } else {
      console.log(`Creating new user for email: ${email}`);
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + "Aa1!";
      
      // Create new user
      const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: "assistant",
          assigned_doctor_id: doctor_id,
          created_by_doctor: true
        }
      });

      if (createUserError) {
        console.error("Error creating user:", createUserError);
        throw createUserError;
      }

      if (!newUser.user) {
        throw new Error("Failed to create user");
      }

      assistantUserId = newUser.user.id;
      console.log(`New user created: ${assistantUserId}`);

      // Create profile for new user (this should be handled by the trigger, but let's ensure it)
      const { error: profileInsertError } = await adminClient
        .from("profiles")
        .insert({
          user_id: newUser.user.id,
          role: "assistant",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileInsertError) {
        console.error("Error creating profile:", profileInsertError);
        // Don't throw error here as the trigger might have handled it
      }

      message = `Nuevo asistente creado exitosamente. Email: ${email}, Contraseña temporal: ${tempPassword}`;
    }

    // Check if assignment already exists
    const { data: existingAssignment, error: assignmentCheckError } = await adminClient
      .from("doctor_assistants")
      .select("id")
      .eq("doctor_id", doctor_id)
      .eq("assistant_id", assistantUserId)
      .maybeSingle();

    if (assignmentCheckError) {
      console.error("Error checking assignment:", assignmentCheckError);
      throw new Error("Error al verificar asignación existente");
    }

    if (existingAssignment) {
      throw new Error("Este asistente ya está asignado a este doctor");
    }

    // Create the assignment in doctor_assistants
    const { error: assignmentError } = await adminClient
      .from("doctor_assistants")
      .insert({
        doctor_id: doctor_id,
        assistant_id: assistantUserId
      });

    if (assignmentError) {
      console.error("Error creating assignment:", assignmentError);
      throw new Error("Error al asignar el asistente al doctor");
    }

    console.log(`Assistant ${assistantUserId} assigned to doctor ${doctor_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        assistant_user_id: assistantUserId,
        temp_password: !existingUser ? "Check console for temp password" : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("=== ERROR IN ASSIGN ASSISTANT ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});