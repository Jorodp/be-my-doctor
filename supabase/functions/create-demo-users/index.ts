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

    // First, delete existing users if they exist
    const existingUsers = await supabaseAdmin.auth.admin.listUsers();
    
    const demoEmails = [
      'jorodp@hotmail.com', 
      'paciente@paciente.com', 
      'doctor.demo@bemy.com', 
      'asistente.demo@bemy.com',
      'dr.garcia@bemy.com',
      'dr.martinez@bemy.com', 
      'dr.rodriguez@bemy.com',
      'dr.fernandez@bemy.com',
      'dr.santos@bemy.com'
    ];
    
    for (const user of existingUsers.data.users) {
      if (demoEmails.includes(user.email || '')) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }

    // Generate secure random passwords
    const generateSecurePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const adminPassword = generateSecurePassword();
    
    // 1. Create Admin (jorodp@hotmail.com)
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: 'jorodp@hotmail.com',
      password: adminPassword,
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

    const patientPassword = generateSecurePassword();
    
    // 2. Create Patient (paciente@paciente.com)
    const { data: patientUser, error: patientError } = await supabaseAdmin.auth.admin.createUser({
      email: 'paciente@paciente.com',
      password: patientPassword,
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

    const doctorPassword = generateSecurePassword();
    
    // 3. Create Doctor (demo)
    const { data: doctorUser, error: doctorError } = await supabaseAdmin.auth.admin.createUser({
      email: 'doctor.demo@bemy.com',
      password: doctorPassword,
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

    const assistantPassword = generateSecurePassword();
    
    // 4. Create Medical Assistant (demo)
    const { data: assistantUser, error: assistantError } = await supabaseAdmin.auth.admin.createUser({
      email: 'asistente.demo@bemy.com',
      password: assistantPassword,
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

    // Create 5 demo doctors with proper data
    const demoDoctors = [
      {
        email: 'dr.garcia@bemy.com',
        password: generateSecurePassword(),
        full_name: 'Dr. Carlos García Hernández',
        specialty: 'Cardiología',
        license: '1234567',
        experience: 15,
        fee: 1200,
        biography: 'Especialista en cardiología con más de 15 años de experiencia. Graduado de la UNAM con especialidad en el Instituto Nacional de Cardiología.',
        phone: '+52 55 1234 5678',
        address: 'Av. Paseo de la Reforma 123, Col. Juárez, CDMX',
        locations: ['CDMX', 'Estado de México']
      },
      {
        email: 'dr.martinez@bemy.com',
        password: generateSecurePassword(),
        full_name: 'Dra. Ana Martínez López',
        specialty: 'Dermatología',
        license: '2345678',
        experience: 12,
        fee: 900,
        biography: 'Dermatóloga certificada con amplia experiencia en dermatología cosmética y médica. Especialista en tratamientos láser y rejuvenecimiento facial.',
        phone: '+52 55 2345 6789',
        address: 'Insurgentes Sur 456, Col. Roma Norte, CDMX',
        locations: ['CDMX']
      },
      {
        email: 'dr.rodriguez@bemy.com',
        password: generateSecurePassword(),
        full_name: 'Dr. Luis Rodríguez Vega',
        specialty: 'Pediatría',
        license: '3456789',
        experience: 10,
        fee: 800,
        biography: 'Pediatra especializado en el cuidado integral de niños desde recién nacidos hasta adolescentes. Experiencia en neonatología y desarrollo infantil.',
        phone: '+52 55 3456 7890',
        address: 'Polanco 789, Col. Polanco, CDMX',
        locations: ['CDMX', 'Guadalajara']
      },
      {
        email: 'dr.fernandez@bemy.com',
        password: generateSecurePassword(),
        full_name: 'Dra. María Fernández Castro',
        specialty: 'Ginecología',
        license: '4567890',
        experience: 18,
        fee: 1100,
        biography: 'Ginecóloga obstetra con especialización en medicina reproductiva y fertilidad. Experta en embarazos de alto riesgo y cirugía laparoscópica.',
        phone: '+52 55 4567 8901',
        address: 'Santa Fe 321, Col. Santa Fe, CDMX',
        locations: ['CDMX']
      },
      {
        email: 'dr.santos@bemy.com',
        password: generateSecurePassword(),
        full_name: 'Dr. Roberto Santos Díaz',
        specialty: 'Medicina General',
        license: '5678901',
        experience: 8,
        fee: 600,
        biography: 'Médico general con enfoque en medicina familiar y preventiva. Especializado en diabetes, hipertensión y obesidad.',
        phone: '+52 55 5678 9012',
        address: 'Condesa 654, Col. Condesa, CDMX',
        locations: ['CDMX', 'Puebla']
      }
    ];

    const createdDoctors = [];

    for (const doctorData of demoDoctors) {
      // Create user
      const { data: newDoctorUser, error: newDoctorError } = await supabaseAdmin.auth.admin.createUser({
        email: doctorData.email,
        password: doctorData.password,
        email_confirm: true,
        user_metadata: {
          role: 'doctor',
          full_name: doctorData.full_name
        }
      });

      if (newDoctorError) {
        console.log(`Error creating doctor ${doctorData.email}:`, newDoctorError);
        continue;
      }

      // Create profile
      const { error: newDoctorProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newDoctorUser.user?.id,
          full_name: doctorData.full_name,
          role: 'doctor',
          phone: doctorData.phone,
          address: doctorData.address
        });

      if (newDoctorProfileError) console.log(`Profile error for ${doctorData.email}:`, newDoctorProfileError);

      // Create doctor profile
      const { error: newDoctorProfError } = await supabaseAdmin
        .from('doctor_profiles')
        .insert({
          user_id: newDoctorUser.user?.id,
          specialty: doctorData.specialty,
          professional_license: doctorData.license,
          years_experience: doctorData.experience,
          consultation_fee: doctorData.fee,
          biography: doctorData.biography,
          office_address: doctorData.address,
          office_phone: doctorData.phone,
          practice_locations: doctorData.locations,
          verification_status: 'verified',
          verified_at: new Date().toISOString()
        });

      if (newDoctorProfError) console.log(`Doctor profile error for ${doctorData.email}:`, newDoctorProfError);

      // Create active subscription
      const { error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: newDoctorUser.user?.id,
          plan: 'monthly',
          amount: 799,
          status: 'active',
          starts_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
          ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
          payment_method: 'demo'
        });

      if (subscriptionError) console.log(`Subscription error for ${doctorData.email}:`, subscriptionError);

      // Create some ratings
      const ratings = [
        { rating: 5, comment: 'Excelente doctor, muy profesional y atento.' },
        { rating: 5, comment: 'Increíble atención y resultados.' },
        { rating: 4, comment: 'Muy buen trato y explicaciones claras.' }
      ];

      for (const ratingData of ratings) {
        const { error: ratingError } = await supabaseAdmin
          .from('ratings')
          .insert({
            patient_user_id: patientUser.user?.id, // Use the created patient as reviewer
            doctor_user_id: newDoctorUser.user?.id,
            appointment_id: crypto.randomUUID(),
            rating: ratingData.rating,
            comment: ratingData.comment,
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random date within last 30 days
          });

        if (ratingError) console.log(`Rating error for ${doctorData.email}:`, ratingError);
      }

      createdDoctors.push({
        id: newDoctorUser.user?.id,
        email: doctorData.email,
        name: doctorData.full_name,
        specialty: doctorData.specialty
      });
    }

    const result = {
      success: true,
      users: {
        admin: {
          id: adminUser.user?.id,
          email: 'jorodp@hotmail.com',
          role: 'admin',
          password: '[REDACTED]'
        },
        patient: {
          id: patientUser.user?.id,
          email: 'paciente@paciente.com',
          role: 'patient',
          password: '[REDACTED]'
        },
        doctor: {
          id: doctorUser.user?.id,
          email: doctorUser.user?.email,
          role: 'doctor',
          password: '[REDACTED]'
        },
        assistant: {
          id: assistantUser.user?.id,
          email: assistantUser.user?.email,
          role: 'assistant',
          assigned_doctor_id: doctorUser.user?.id,
          password: '[REDACTED]'
        },
        demo_doctors: createdDoctors
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