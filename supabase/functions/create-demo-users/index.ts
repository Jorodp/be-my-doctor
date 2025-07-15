import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 1. Create Admin
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: 'jorodp@hotmail.com',
      password: 'Jorge123',
      email_confirm: true,
      user_metadata: {
        role: 'admin'
      }
    })

    if (adminError) throw adminError

    // 2. Create Doctor
    const { data: doctorUser, error: doctorError } = await supabaseAdmin.auth.admin.createUser({
      email: 'doctor.demo@bemy.com',
      password: 'Doctor123',
      email_confirm: true,
      user_metadata: {
        role: 'doctor',
        verified: true,
        full_name: 'Dr. María Pérez',
        speciality: 'Cardiología',
        first_name: 'María',
        last_name: 'Pérez',
        professional_license: 'MED-12345',
        specialty: 'Cardiología',
        years_experience: '10',
        consultation_fee: '150'
      }
    })

    if (doctorError) throw doctorError

    // 3. Create Patient
    const { data: patientUser, error: patientError } = await supabaseAdmin.auth.admin.createUser({
      email: 'paciente.demo@bemy.com',
      password: 'Paciente123',
      email_confirm: true,
      user_metadata: {
        role: 'patient',
        full_name: 'Juan López',
        first_name: 'Juan',
        last_name: 'López'
      }
    })

    if (patientError) throw patientError

    // 4. Create Medical Assistant
    const { data: assistantUser, error: assistantError } = await supabaseAdmin.auth.admin.createUser({
      email: 'asistente.demo@bemy.com',
      password: 'Asistente123',
      email_confirm: true,
      user_metadata: {
        role: 'medical_assistant',
        assigned_doctor_id: doctorUser.user?.id,
        first_name: 'Ana',
        last_name: 'García'
      }
    })

    if (assistantError) throw assistantError

    const result = {
      success: true,
      users: {
        admin: {
          id: adminUser.user?.id,
          email: adminUser.user?.email,
          role: 'admin'
        },
        doctor: {
          id: doctorUser.user?.id,
          email: doctorUser.user?.email,
          role: 'doctor'
        },
        patient: {
          id: patientUser.user?.id,
          email: patientUser.user?.email,
          role: 'patient'
        },
        assistant: {
          id: assistantUser.user?.id,
          email: assistantUser.user?.email,
          role: 'medical_assistant',
          assigned_doctor_id: doctorUser.user?.id
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})