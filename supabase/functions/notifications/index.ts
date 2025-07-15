import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();

    switch (action) {
      case "send-appointment-notification":
        return await sendAppointmentNotification(data);
      case "send-reminder":
        return await sendReminder(data);
      case "send-rating-request":
        return await sendRatingRequest(data);
      case "check-reminders":
        return await checkReminders();
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (error) {
    console.error("Notification function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function sendAppointmentNotification(data: any) {
  const { appointmentId, type } = data; // type: 'created', 'updated', 'cancelled'

  // Get appointment details with user info
  const { data: appointment } = await supabaseAdmin
    .from("appointments")
    .select(`
      *,
      patient:profiles!appointments_patient_user_id_fkey(full_name, user_id),
      doctor:profiles!appointments_doctor_user_id_fkey(full_name, user_id),
      doctor_profile:doctor_profiles!appointments_doctor_user_id_fkey(specialty)
    `)
    .eq("id", appointmentId)
    .single();

  if (!appointment) throw new Error("Appointment not found");

  const appointmentDate = new Date(appointment.starts_at).toLocaleString('es-MX');
  
  // Create notifications for both patient and doctor
  const notifications = [
    {
      user_id: appointment.patient_user_id,
      type: `appointment_${type}`,
      title: `Cita ${type === 'created' ? 'agendada' : type === 'updated' ? 'actualizada' : 'cancelada'}`,
      message: `Tu cita con Dr. ${appointment.doctor.full_name} para el ${appointmentDate} ha sido ${type === 'created' ? 'agendada' : type === 'updated' ? 'actualizada' : 'cancelada'}.`,
      data: { appointment_id: appointmentId }
    },
    {
      user_id: appointment.doctor_user_id,
      type: `appointment_${type}`,
      title: `Cita ${type === 'created' ? 'agendada' : type === 'updated' ? 'actualizada' : 'cancelada'}`,
      message: `Cita con ${appointment.patient.full_name} para el ${appointmentDate} ha sido ${type === 'created' ? 'agendada' : type === 'updated' ? 'actualizada' : 'cancelada'}.`,
      data: { appointment_id: appointmentId }
    }
  ];

  // Insert notifications
  const { error } = await supabaseAdmin
    .from("notifications")
    .insert(notifications);

  if (error) throw error;

  // Send emails if configured
  if (Deno.env.get("RESEND_API_KEY")) {
    await Promise.all([
      sendEmail(
        await getUserEmail(appointment.patient_user_id),
        notifications[0].title,
        notifications[0].message
      ),
      sendEmail(
        await getUserEmail(appointment.doctor_user_id),
        notifications[1].title,
        notifications[1].message
      )
    ]);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: corsHeaders }
  );
}

async function sendReminder(data: any) {
  const { appointmentId } = data;

  const { data: appointment } = await supabaseAdmin
    .from("appointments")
    .select(`
      *,
      patient:profiles!appointments_patient_user_id_fkey(full_name, user_id),
      doctor:profiles!appointments_doctor_user_id_fkey(full_name, user_id)
    `)
    .eq("id", appointmentId)
    .single();

  if (!appointment) throw new Error("Appointment not found");

  const appointmentDate = new Date(appointment.starts_at).toLocaleString('es-MX');
  
  const notification = {
    user_id: appointment.patient_user_id,
    type: "appointment_reminder",
    title: "Recordatorio de cita",
    message: `Recuerda que tienes una cita con Dr. ${appointment.doctor.full_name} mañana a las ${appointmentDate}.`,
    data: { appointment_id: appointmentId }
  };

  const { error } = await supabaseAdmin
    .from("notifications")
    .insert(notification);

  if (error) throw error;

  // Send email reminder
  if (Deno.env.get("RESEND_API_KEY")) {
    await sendEmail(
      await getUserEmail(appointment.patient_user_id),
      notification.title,
      notification.message
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: corsHeaders }
  );
}

async function sendRatingRequest(data: any) {
  const { appointmentId } = data;

  const { data: appointment } = await supabaseAdmin
    .from("appointments")
    .select(`
      *,
      patient:profiles!appointments_patient_user_id_fkey(full_name, user_id),
      doctor:profiles!appointments_doctor_user_id_fkey(full_name, user_id)
    `)
    .eq("id", appointmentId)
    .single();

  if (!appointment) throw new Error("Appointment not found");

  const notification = {
    user_id: appointment.patient_user_id,
    type: "rating_request",
    title: "Califica tu consulta",
    message: `¿Cómo fue tu consulta con Dr. ${appointment.doctor.full_name}? Tu opinión es importante.`,
    data: { appointment_id: appointmentId }
  };

  const { error } = await supabaseAdmin
    .from("notifications")
    .insert(notification);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: corsHeaders }
  );
}

async function checkReminders() {
  // Get appointments that need reminders (24 hours before)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("id, starts_at")
    .eq("status", "scheduled")
    .gte("starts_at", tomorrow.toISOString().split('T')[0])
    .lt("starts_at", new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Send reminders for each appointment
  if (appointments) {
    await Promise.all(
      appointments.map(appointment => 
        sendReminder({ appointmentId: appointment.id })
      )
    );
  }

  return new Response(
    JSON.stringify({ processed: appointments?.length || 0 }),
    { headers: corsHeaders }
  );
}

async function getUserEmail(userId: string): Promise<string> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data.user?.email || "";
}

async function sendEmail(to: string, subject: string, message: string) {
  if (!to || !Deno.env.get("RESEND_API_KEY")) return;

  try {
    await resend.emails.send({
      from: "Be My Doctor <noreply@bemydoctor.com>",
      to: [to],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0369a1;">${subject}</h2>
          <p>${message}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Este correo fue enviado desde Be My Doctor. Si no deseas recibir más notificaciones, 
            puedes desactivarlas desde tu perfil.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}