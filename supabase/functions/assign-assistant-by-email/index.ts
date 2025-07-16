import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

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
    console.log("🚀 ASSIGN-ASSISTANT-BY-EMAIL FUNCTION CALLED!");
    
    // Parse request body
    const { assistantEmail } = await req.json();
    
    if (!assistantEmail) {
      return new Response(
        JSON.stringify({ error: "assistantEmail is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(assistantEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate doctor
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: authError } = await authClient.auth.getUser(token);

    if (authError || !userData.user?.email) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const doctorUser = userData.user;

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify doctor role
    const { data: doctorProfile, error: doctorError } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("user_id", doctorUser.id)
      .single();

    if (doctorError || !doctorProfile || doctorProfile.role !== "doctor") {
      return new Response(
        JSON.stringify({ error: "Only doctors can assign assistants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Doctor verified:", doctorProfile.full_name);

    // Check if doctor already has an assistant
    const { data: existingAssistant } = await adminClient
      .from("profiles")
      .select("user_id, full_name")
      .eq("assigned_doctor_id", doctorUser.id)
      .eq("role", "assistant")
      .maybeSingle();

    // Check if the email is already assigned to another doctor
    const { data: conflictAssistant } = await adminClient
      .from("profiles")
      .select("assigned_doctor_id, user_id")
      .eq("role", "assistant")
      .not("assigned_doctor_id", "is", null)
      .neq("assigned_doctor_id", doctorUser.id)
      .maybeSingle();

    if (conflictAssistant) {
      // Get the email of the conflicted assistant
      const { data: assistantAuth } = await adminClient.auth.admin.getUserById(conflictAssistant.user_id);
      if (assistantAuth.user?.email === assistantEmail) {
        return new Response(
          JSON.stringify({ error: "Este asistente ya está asignado a otro doctor" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if user with this email already exists
    const { data: existingUser, error: userLookupError } = await adminClient.auth.admin.listUsers();
    
    let assistantUser = existingUser?.users?.find(u => u.email === assistantEmail);
    let userExists = !!assistantUser;
    let needsInvitation = false;

    if (assistantUser) {
      console.log("✅ User already exists in auth");
      
      // Check if user has a profile
      const { data: assistantProfile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("user_id", assistantUser.id)
        .maybeSingle();

      if (assistantProfile) {
        // Check if user is already an assistant
        if (assistantProfile.role !== "assistant") {
          return new Response(
            JSON.stringify({ error: "El usuario ya existe con un rol diferente" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Create profile for existing user
        await adminClient
          .from("profiles")
          .insert({
            user_id: assistantUser.id,
            role: "assistant",
            assigned_doctor_id: doctorUser.id
          });
      }
    } else {
      console.log("📧 Creating new user with email:", assistantEmail);
      
      // Create new user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: assistantEmail,
        email_confirm: true,
        user_metadata: {
          role: "assistant",
          assigned_doctor_id: doctorUser.id
        }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: "Error al crear el usuario" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      assistantUser = newUser.user;
      needsInvitation = true;
      console.log("✅ New user created:", assistantUser?.id);

      // Create profile for new user
      await adminClient
        .from("profiles")
        .insert({
          user_id: assistantUser.id,
          role: "assistant",
          assigned_doctor_id: doctorUser.id
        });
    }

    // If doctor already has an assistant, unassign the old one
    if (existingAssistant && existingAssistant.user_id !== assistantUser?.id) {
      console.log("🔄 Removing previous assistant:", existingAssistant.full_name);
      
      await adminClient
        .from("profiles")
        .update({ assigned_doctor_id: null })
        .eq("user_id", existingAssistant.user_id);
    }

    // Assign new assistant
    const { error: assignError } = await adminClient
      .from("profiles")
      .update({ assigned_doctor_id: doctorUser.id })
      .eq("user_id", assistantUser?.id);

    if (assignError) {
      console.error("Error assigning assistant:", assignError);
      return new Response(
        JSON.stringify({ error: "Error al asignar el asistente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Assistant assigned successfully");

    // Send invitation email if user is new
    if (needsInvitation) {
      try {
        await sendInvitationEmail(assistantEmail, doctorProfile.full_name || "Doctor");
        console.log("✅ Invitation email sent");
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: userExists 
          ? "Asistente asignado correctamente"
          : "Asistente creado y asignado. Se ha enviado una invitación por correo.",
        userExists,
        needsInvitation
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in assign-assistant-by-email:", error);
    return new Response(
      JSON.stringify({ error: "Server error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendInvitationEmail(assistantEmail: string, doctorName: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }

  const resend = new Resend(resendApiKey);
  
  const { error } = await resend.emails.send({
    from: "Be My Doctor <noreply@bemy.com.mx>",
    to: [assistantEmail],
    subject: "Invitación como Asistente Médico - Be My Doctor",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Be My Doctor</h1>
          <p style="color: white; margin: 10px 0 0 0;">Plataforma Médica Digital</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin-bottom: 20px;">¡Has sido invitado como Asistente Médico!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            El <strong>Dr. ${doctorName}</strong> te ha asignado como su asistente médico en la plataforma Be My Doctor.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Como asistente médico, podrás:
          </p>
          
          <ul style="color: #666; line-height: 1.6;">
            <li>Gestionar las citas del doctor</li>
            <li>Acceder al historial de pacientes asignados</li>
            <li>Ayudar en la administración de consultas</li>
            <li>Coordinar la agenda médica</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://bemy.com.mx/auth" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: bold;">
              Acceder a la Plataforma
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            <strong>Instrucciones:</strong><br>
            1. Haz clic en el botón de arriba<br>
            2. Usa tu correo electrónico: <strong>${assistantEmail}</strong><br>
            3. Crea tu contraseña si es tu primera vez<br>
            4. Accede al panel de asistente
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Este correo fue enviado automáticamente por Be My Doctor.</p>
          <p>Si tienes dudas, contacta al Dr. ${doctorName} directamente.</p>
        </div>
      </div>
    `
  });

  if (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
}