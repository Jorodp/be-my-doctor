import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    const body = await req.json();
    const { action, appointmentId, newStatus, newDate, newTime, patientId, doctorId, cancelReason } = body;

    console.log('Processing appointment action:', { action, appointmentId, newStatus });

    switch (action) {
      case 'cancel':
        if (!appointmentId) {
          throw new Error('Appointment ID is required');
        }

        const { error: cancelError } = await supabase
          .from('appointments')
          .update({ 
            status: 'cancelled',
            notes: cancelReason ? `Cancelada por admin: ${cancelReason}` : 'Cancelada por administrador',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId);

        if (cancelError) throw cancelError;

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Appointment cancelled successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'reschedule':
        if (!appointmentId || !newDate || !newTime) {
          throw new Error('Appointment ID, new date and time are required');
        }

        const newStartTime = new Date(`${newDate}T${newTime}:00.000Z`);
        const newEndTime = new Date(newStartTime.getTime() + 30 * 60000); // 30 minutes

        const { error: rescheduleError } = await supabase
          .from('appointments')
          .update({ 
            starts_at: newStartTime.toISOString(),
            ends_at: newEndTime.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId);

        if (rescheduleError) throw rescheduleError;

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Appointment rescheduled successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'create':
        if (!patientId || !doctorId || !newDate || !newTime) {
          throw new Error('Patient ID, Doctor ID, date and time are required');
        }

        const appointmentStartTime = new Date(`${newDate}T${newTime}:00.000Z`);
        const appointmentEndTime = new Date(appointmentStartTime.getTime() + 30 * 60000);

        const { error: createError } = await supabase
          .from('appointments')
          .insert({
            patient_user_id: patientId,
            doctor_user_id: doctorId,
            starts_at: appointmentStartTime.toISOString(),
            ends_at: appointmentEndTime.toISOString(),
            status: 'scheduled',
            created_by: user.id
          });

        if (createError) throw createError;

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Appointment created successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'update_status':
        if (!appointmentId || !newStatus) {
          throw new Error('Appointment ID and new status are required');
        }

        const { error: statusError } = await supabase
          .from('appointments')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId);

        if (statusError) throw statusError;

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Appointment status updated successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'list':
        const { data: appointments, error: listError } = await supabase
          .from('appointments')
          .select(`
            id,
            starts_at,
            ends_at,
            status,
            price,
            notes,
            created_at,
            patient_user_id,
            doctor_user_id
          `)
          .order('starts_at', { ascending: false });

        if (listError) throw listError;

        // Get user details for patients and doctors
        const userIds = [...new Set([
          ...appointments.map(a => a.patient_user_id),
          ...appointments.map(a => a.doctor_user_id)
        ])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, role')
          .in('user_id', userIds);

        const enrichedAppointments = appointments.map(appointment => {
          const patientProfile = profiles?.find(p => p.user_id === appointment.patient_user_id);
          const doctorProfile = profiles?.find(p => p.user_id === appointment.doctor_user_id);

          return {
            ...appointment,
            patient_name: patientProfile?.full_name || 'N/A',
            doctor_name: doctorProfile?.full_name || 'N/A'
          };
        });

        return new Response(JSON.stringify({ 
          success: true, 
          appointments: enrichedAppointments 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in admin-appointments function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});