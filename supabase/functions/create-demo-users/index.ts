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

    // 1. Create Admin (jorodp@hotmail.com)
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: 'jorodp@hotmail.com',
      password: '058__coL',
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        full_name: 'Administrador'
      }
    })

    if (adminError) throw adminError

    // Create profile for admin
    const { error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: adminUser.user?.id,
        full_name: 'Administrador',
        role: 'admin'
      })

    if (adminProfileError) console.log('Admin profile error:', adminProfileError)

    // 2. Create Patient (paciente@paciente.com)
    const { data: patientUser, error: patientError } = await supabaseAdmin.auth.admin.createUser({
      email: 'paciente@paciente.com',
      password: 'paciente123',
      email_confirm: true,
      user_metadata: {
        role: 'patient',
        full_name: 'Juan Paciente'
      }
    })

    if (patientError) throw patientError

    // Create profile for patient
    const { error: patientProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: patientUser.user?.id,
        full_name: 'Juan Paciente',
        role: 'patient'
      })

    if (patientProfileError) console.log('Patient profile error:', patientProfileError)

    // 3. Create Doctor (demo)
    const { data: doctorUser, error: doctorError } = await supabaseAdmin.auth.admin.createUser({
      email: 'doctor.demo@bemy.com',
      password: 'Doctor123',
      email_confirm: true,
      user_metadata: {
        role: 'doctor',
        full_name: 'Dr. María Pérez'
      }
    })

    if (doctorError) throw doctorError

    // Create profile for doctor
    const { error: doctorProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: doctorUser.user?.id,
        full_name: 'Dr. María Pérez',
        role: 'doctor'
      })

    if (doctorProfileError) console.log('Doctor profile error:', doctorProfileError)

    // Create doctor profile
    const { error: doctorProfError } = await supabaseAdmin
      .from('doctor_profiles')
      .insert({
        user_id: doctorUser.user?.id,
        specialty: 'Cardiología',
        professional_license: 'MED-12345',
        years_experience: 10,
        consultation_fee: 150,
        verification_status: 'verified'
      })

    if (doctorProfError) console.log('Doctor professional profile error:', doctorProfError)

    // 4. Create Medical Assistant (demo)
    const { data: assistantUser, error: assistantError } = await supabaseAdmin.auth.admin.createUser({
      email: 'asistente.demo@bemy.com',
      password: 'Asistente123',
      email_confirm: true,
      user_metadata: {
        role: 'assistant',
        assigned_doctor_id: doctorUser.user?.id,
        full_name: 'Ana García'
      }
    })

    if (assistantError) throw assistantError

    // Create profile for assistant
    const { error: assistantProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: assistantUser.user?.id,
        full_name: 'Ana García',
        role: 'assistant'
      })

    if (assistantProfileError) console.log('Assistant profile error:', assistantProfileError)


    const result = {
      success: true,
      users: {
        admin: {
          id: adminUser.user?.id,
          email: 'jorodp@hotmail.com',
          role: 'admin'
        },
        patient: {
          id: patientUser.user?.id,
          email: 'paciente@paciente.com',
          role: 'patient'
        },
        doctor: {
          id: doctorUser.user?.id,
          email: doctorUser.user?.email,
          role: 'doctor'
        },
        assistant: {
          id: assistantUser.user?.id,
          email: assistantUser.user?.email,
          role: 'assistant',
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