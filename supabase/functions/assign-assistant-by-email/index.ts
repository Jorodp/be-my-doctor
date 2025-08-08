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
    const { email, doctor_id, clinic_id } = await req.json();

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

    // Create admin client for user management

    // First, verify the doctor exists
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


    // Check if user with email exists
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
          const { error: roleUpdateError } = await adminClient
            .from("profiles")
            .update({ role: "assistant" })
            .eq("user_id", existingUser.id);

          if (roleUpdateError) {
            console.error("Error updating role:", roleUpdateError);
            return new Response(
              JSON.stringify({ error: "Error actualizando rol" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
      }

      if (!existingProfile) {
        
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
        
      } else {
        assistantProfileId = existingProfile.user_id;
        
        
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
          
        }
      }

      message = "Usuario existente asignado como asistente exitosamente";
    } else {
      
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

      message = "Nuevo asistente creado correctamente.";
    }

    // Handle clinic-specific assignment if clinic_id is provided
    if (clinic_id) {
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
          JSON.stringify({ error: "Error verificando asignación de clínica" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingClinicAssignment) {
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
          JSON.stringify({ error: "Error creando asignación de clínica" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Legacy: Check if assignment already exists in doctor_assistants
      const { data: existingAssignment, error: assignmentCheckError } = await adminClient
        .from("doctor_assistants")
        .select("id")
        .eq("doctor_id", doctorProfile.user_id)
        .eq("assistant_id", assistantProfileId)
        .single();

      if (assignmentCheckError && assignmentCheckError.code !== 'PGRST116') {
        console.error('Error checking assignment:', assignmentCheckError);
        return new Response(
          JSON.stringify({ error: "Error verificando asignación" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingAssignment) {
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
      const { error: assignmentError } = await adminClient
        .from("doctor_assistants")
        .insert({
          doctor_id: doctorProfile.user_id,
          assistant_id: assistantProfileId
        });

      if (assignmentError) {
        console.error("Error creating assignment:", assignmentError);
        return new Response(
          JSON.stringify({ error: "Error creando asignación" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        assistant_user_id: assistantUserId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (_error) {
    return new Response(
      JSON.stringify({ 
        error: "Internal error",
        hint: "assign-assistant-by-email failed"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});