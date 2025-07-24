import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log('=== NEW ASSIGN ASSISTANT REQUEST ===');
  
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
    const { email, doctor_id } = await req.json();
    console.log('Request data:', { email, doctor_id });

    if (!email || !doctor_id) {
      return new Response(
        JSON.stringify({ error: "Email and doctor_id are required" }),
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

    // Create admin client for user management
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    console.log(`Searching for user with email: ${email}`);

    // Check if user already exists
    const { data: existingUsers, error: searchError } = await adminClient.auth.admin.listUsers();
    
    if (searchError) {
      console.error("Error searching users:", searchError);
      return new Response(
        JSON.stringify({ error: "Error searching for user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingUser = existingUsers.users.find(user => user.email === email);
    let assistantUserId: string;
    let message: string;

    // Obtener el ID interno del profile del doctor al inicio
    const { data: doctorProfile, error: doctorProfileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", doctor_id)
      .single();

    if (doctorProfileError) {
      console.error("Error getting doctor profile:", doctorProfileError);
      return new Response(
        JSON.stringify({ error: "Error obteniendo perfil del doctor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingUser) {
      console.log(`Found existing user: ${existingUser.id}`);
      assistantUserId = existingUser.id;

      // Check if user already has a profile
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("user_id", existingUser.id)
        .single();

      if (existingProfile && existingProfile.role !== 'assistant') {
        return new Response(
          JSON.stringify({ error: `Este correo ya está en uso por una cuenta de tipo ${existingProfile.role}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!existingProfile) {
        // Create profile for existing user
        const { error: profileInsertError } = await adminClient
          .from("profiles")
          .insert({
            user_id: existingUser.id,
            role: "assistant",
            assigned_doctor_id: doctor_id
          });

        if (profileInsertError) {
          console.error("Error creating profile:", profileInsertError);
          return new Response(
            JSON.stringify({ error: "Error creando perfil del asistente: " + profileInsertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Update existing profile to assign doctor
        const { error: profileUpdateError } = await adminClient
          .from("profiles")
          .update({
            assigned_doctor_id: doctor_id
          })
          .eq("user_id", existingUser.id);

        if (profileUpdateError) {
          console.error("Error updating profile:", profileUpdateError);
          return new Response(
            JSON.stringify({ error: "Error actualizando perfil del asistente: " + profileUpdateError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      message = "Usuario existente asignado como asistente exitosamente";
    } else {
      console.log(`Creating new user for email: ${email}`);
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + "Aa1!";
      
      // Create new user
      const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role: "assistant"
        }
      });

      if (createUserError) {
        console.error("Error creating user:", createUserError);
        return new Response(
          JSON.stringify({ error: "Error creating user: " + createUserError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!newUser.user) {
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      assistantUserId = newUser.user.id;
      console.log(`New user created: ${assistantUserId}`);

      // Create profile for new user
      const { error: profileCreateError } = await adminClient
        .from("profiles")
        .insert({
          user_id: newUser.user.id,
          role: "assistant",
          assigned_doctor_id: doctor_id
        });

      if (profileCreateError) {
        console.error("Error creating profile for new user:", profileCreateError);
        return new Response(
          JSON.stringify({ error: "Error creando perfil del asistente: " + profileCreateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      message = `Nuevo asistente creado. Email: ${email}, Contraseña temporal: ${tempPassword}`;
    }

    // Obtener el ID interno del profile del asistente
    const { data: assistantProfile, error: assistantProfileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", assistantUserId)
      .single();

    if (assistantProfileError) {
      console.error("Error getting assistant profile:", assistantProfileError);
      return new Response(
        JSON.stringify({ error: "Error obteniendo perfil del asistente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await adminClient
      .from("doctor_assistants")
      .select("id")
      .eq("doctor_id", doctorProfile.id)
      .eq("assistant_id", assistantProfile.id)
      .single();

    if (existingAssignment) {
      return new Response(
        JSON.stringify({ error: "Este asistente ya está asignado a este doctor" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the assignment
    const { error: assignmentError } = await adminClient
      .from("doctor_assistants")
      .insert({
        doctor_id: doctorProfile.id,
        assistant_id: assistantProfile.id
      });

    if (assignmentError) {
      console.error("Error creating assignment:", assignmentError);
      return new Response(
        JSON.stringify({ error: "Error al asignar el asistente: " + assignmentError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Assistant ${assistantUserId} assigned to doctor ${doctor_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        assistant_user_id: assistantUserId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("=== ERROR IN ASSIGN ASSISTANT ===");
    console.error("Error details:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});