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
    const { email, doctor_id, clinic_id } = await req.json();
    console.log('=== ASSIGN ASSISTANT REQUEST ===');
    console.log('Email:', email);
    console.log('Doctor ID:', doctor_id);
    console.log('Clinic ID:', clinic_id);

    if (!email || !doctor_id) {
      console.log('Missing required fields');
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

    console.log('Admin client created');

    // First, verify the doctor exists
    console.log('Checking if doctor exists...');
    const { data: doctorProfile, error: doctorError } = await adminClient
      .from("profiles")
      .select("user_id, role")
      .eq("user_id", doctor_id)
      .single();

    if (doctorError || !doctorProfile) {
      console.error('Doctor not found:', doctorError);
      return new Response(
        JSON.stringify({ error: "Doctor no encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (doctorProfile.role !== 'doctor') {
      console.error('User is not a doctor:', doctorProfile.role);
      return new Response(
        JSON.stringify({ error: "El usuario no es un doctor" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Doctor verified with user_id:', doctorProfile.user_id);

    // Check if user with email exists
    console.log('Searching for existing user...');
    const { data: existingUsers, error: searchError } = await adminClient.auth.admin.listUsers();
    
    if (searchError) {
      console.error("Error searching users:", searchError);
      return new Response(
        JSON.stringify({ error: "Error buscando usuario: " + searchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingUser = existingUsers.users.find(user => user.email === email);
    let assistantUserId: string;
    let assistantProfileId: string;
    let message: string;

    if (existingUser) {
      console.log('Found existing user:', existingUser.id);
      assistantUserId = existingUser.id;

      // Check if user already has a profile
      const { data: existingProfile, error: profileError } = await adminClient
        .from("profiles")
        .select("user_id, role, assigned_doctor_id")
        .eq("user_id", existingUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking profile:', profileError);
        return new Response(
          JSON.stringify({ error: "Error verificando perfil: " + profileError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingProfile && existingProfile.role !== 'assistant') {
        console.log('User has different role:', existingProfile.role);
        // If user has different role but we're trying to assign to clinic, allow conversion to assistant
        if (clinic_id) {
          console.log('Converting user to assistant role for clinic assignment');
          const { error: roleUpdateError } = await adminClient
            .from("profiles")
            .update({ role: "assistant" })
            .eq("user_id", existingUser.id);

          if (roleUpdateError) {
            console.error("Error updating role:", roleUpdateError);
            return new Response(
              JSON.stringify({ error: "Error actualizando rol: " + roleUpdateError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: `Este correo ya está en uso por una cuenta de tipo ${existingProfile.role}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (!existingProfile) {
        console.log('Creating profile for existing user...');
        // Create profile for existing user
        const { data: newProfile, error: profileInsertError } = await adminClient
          .from("profiles")
          .insert({
            user_id: existingUser.id,
            role: "assistant",
            assigned_doctor_id: doctor_id
          })
          .select("user_id")
          .single();

        if (profileInsertError) {
          console.error("Error creating profile:", profileInsertError);
          return new Response(
            JSON.stringify({ error: "Error creando perfil: " + profileInsertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        assistantProfileId = newProfile.user_id;
        console.log('Profile created for existing user with user_id:', assistantProfileId);
      } else {
        assistantProfileId = existingProfile.user_id;
        console.log('Using existing profile with user_id:', assistantProfileId);
        
        // Update existing profile to assign doctor if needed
        if (existingProfile.assigned_doctor_id !== doctor_id) {
          const { error: profileUpdateError } = await adminClient
            .from("profiles")
            .update({
              assigned_doctor_id: doctor_id
            })
            .eq("user_id", existingUser.id);

          if (profileUpdateError) {
            console.error("Error updating profile:", profileUpdateError);
            return new Response(
              JSON.stringify({ error: "Error actualizando perfil: " + profileUpdateError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          console.log('Profile updated with doctor assignment');
        }
      }

      message = "Usuario existente asignado como asistente exitosamente";
    } else {
      console.log('Creating new user...');
      
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
          JSON.stringify({ error: "Error creando usuario: " + createUserError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!newUser.user) {
        console.error("No user returned from creation");
        return new Response(
          JSON.stringify({ error: "Error: no se pudo crear el usuario" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      assistantUserId = newUser.user.id;
      console.log('New user created:', assistantUserId);

      // Create profile for new user
      const { data: newProfile, error: profileCreateError } = await adminClient
        .from("profiles")
        .insert({
          user_id: newUser.user.id,
          role: "assistant",
          assigned_doctor_id: doctor_id
        })
        .select("user_id")
        .single();

      if (profileCreateError) {
        console.error("Error creating profile for new user:", profileCreateError);
        return new Response(
          JSON.stringify({ error: "Error creando perfil: " + profileCreateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      assistantProfileId = newProfile.user_id;
      console.log('Profile created for new user with user_id:', assistantProfileId);

      message = `Nuevo asistente creado. Email: ${email}, Contraseña temporal: ${tempPassword}`;
    }

    // Handle clinic-specific assignment if clinic_id is provided
    if (clinic_id) {
      console.log('Creating clinic-specific assistant assignment...');
      
      // Get the doctor's internal profile ID
      const { data: doctorProfileData, error: doctorProfileError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", doctorProfile.user_id)
        .single();

      if (doctorProfileError || !doctorProfileData) {
        console.error('Error getting doctor profile ID:', doctorProfileError);
        return new Response(
          JSON.stringify({ error: "Error obteniendo perfil del doctor" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the assistant's internal profile ID  
      const { data: assistantProfileData, error: assistantProfileError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", assistantProfileId)
        .single();

      if (assistantProfileError || !assistantProfileData) {
        console.error('Error getting assistant profile ID:', assistantProfileError);
        return new Response(
          JSON.stringify({ error: "Error obteniendo perfil del asistente" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if clinic assignment already exists
      const { data: existingClinicAssignment, error: clinicAssignmentCheckError } = await adminClient
        .from("clinic_assistants")
        .select("id")
        .eq("clinic_id", clinic_id)
        .eq("assistant_id", assistantProfileData.id)
        .single();

      if (clinicAssignmentCheckError && clinicAssignmentCheckError.code !== 'PGRST116') {
        console.error('Error checking clinic assignment:', clinicAssignmentCheckError);
        return new Response(
          JSON.stringify({ error: "Error verificando asignación de clínica: " + clinicAssignmentCheckError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingClinicAssignment) {
        console.log('Clinic assignment already exists');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "El asistente ya está asignado a esta clínica",
            assistant_user_id: assistantUserId
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create the clinic assignment
      const { error: clinicAssignmentError } = await adminClient
        .from("clinic_assistants")
        .insert({
          clinic_id: clinic_id,
          assistant_id: assistantProfileData.id
        });

      if (clinicAssignmentError) {
        console.error("Error creating clinic assignment:", clinicAssignmentError);
        return new Response(
          JSON.stringify({ error: "Error creando asignación de clínica: " + clinicAssignmentError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log('Clinic assignment created successfully');
    } else {
      // Legacy: Check if assignment already exists in doctor_assistants
      console.log('Checking existing doctor-assistant assignment...');
      const { data: existingAssignment, error: assignmentCheckError } = await adminClient
        .from("doctor_assistants")
        .select("id")
        .eq("doctor_id", doctorProfile.user_id)
        .eq("assistant_id", assistantProfileId)
        .single();

      if (assignmentCheckError && assignmentCheckError.code !== 'PGRST116') {
        console.error('Error checking assignment:', assignmentCheckError);
        return new Response(
          JSON.stringify({ error: "Error verificando asignación: " + assignmentCheckError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingAssignment) {
        console.log('Assignment already exists');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "El asistente ya está asignado a este doctor",
            assistant_user_id: assistantUserId
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create the assignment
      console.log('Creating doctor-assistant assignment...');
      const { error: assignmentError } = await adminClient
        .from("doctor_assistants")
        .insert({
          doctor_id: doctorProfile.user_id,
          assistant_id: assistantProfileId
        });

      if (assignmentError) {
        console.error("Error creating assignment:", assignmentError);
        return new Response(
          JSON.stringify({ error: "Error creando asignación: " + assignmentError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log('Assignment created successfully');
    }
    console.log('=== SUCCESS ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        assistant_user_id: assistantUserId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("=== UNEXPECTED ERROR ===");
    console.error("Error details:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Error interno del servidor: ${error.message}`,
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});