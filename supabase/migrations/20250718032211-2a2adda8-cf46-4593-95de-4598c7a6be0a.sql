-- Insert doctor profiles for demo (simplified without auth.users insert)
INSERT INTO public.profiles (
  user_id,
  role,
  full_name,
  phone,
  address,
  created_at,
  updated_at
) VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'doctor',
    'Dr. Carlos García Hernández',
    '+52 55 1234 5678',
    'Av. Paseo de la Reforma 123, Col. Juárez, CDMX',
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'doctor',
    'Dra. Ana Martínez López',
    '+52 55 2345 6789',
    'Insurgentes Sur 456, Col. Roma Norte, CDMX',
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'doctor',
    'Dr. Luis Rodríguez Vega',
    '+52 55 3456 7890',
    'Polanco 789, Col. Polanco, CDMX',
    NOW(),
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'doctor',
    'Dra. María Fernández Castro',
    '+52 55 4567 8901',
    'Santa Fe 321, Col. Santa Fe, CDMX',
    NOW(),
    NOW()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'doctor',
    'Dr. Roberto Santos Díaz',
    '+52 55 5678 9012',
    'Condesa 654, Col. Condesa, CDMX',
    NOW(),
    NOW()
  )
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  updated_at = NOW();

-- Insert doctor profiles
INSERT INTO public.doctor_profiles (
  user_id,
  professional_license,
  specialty,
  biography,
  years_experience,
  consultation_fee,
  verification_status,
  office_address,
  office_phone,
  practice_locations,
  verified_at,
  created_at,
  updated_at
) VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    '1234567',
    'Cardiología',
    'Especialista en cardiología con más de 15 años de experiencia. Graduado de la UNAM con especialidad en el Instituto Nacional de Cardiología. Especializado en cardiopatías congénitas y medicina preventiva cardiovascular.',
    15,
    1200.00,
    'verified',
    'Av. Paseo de la Reforma 123, Col. Juárez, CDMX',
    '+52 55 1234 5678',
    ARRAY['CDMX', 'Estado de México'],
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '2345678',
    'Dermatología',
    'Dermatóloga certificada con amplia experiencia en dermatología cosmética y médica. Especialista en tratamientos láser, rejuvenecimiento facial y dermatología pediátrica. Miembro de la Sociedad Mexicana de Dermatología.',
    12,
    900.00,
    'verified',
    'Insurgentes Sur 456, Col. Roma Norte, CDMX',
    '+52 55 2345 6789',
    ARRAY['CDMX'],
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '3456789',
    'Pediatría',
    'Pediatra especializado en el cuidado integral de niños desde recién nacidos hasta adolescentes. Experiencia en neonatología, vacunación y desarrollo infantil. Certificado por el Consejo Mexicano de Pediatría.',
    10,
    800.00,
    'verified',
    'Polanco 789, Col. Polanco, CDMX',
    '+52 55 3456 7890',
    ARRAY['CDMX', 'Guadalajara'],
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '4567890',
    'Ginecología',
    'Ginecóloga obstetra con especialización en medicina reproductiva y fertilidad. Experta en embarazos de alto riesgo, cirugía laparoscópica y planificación familiar. Certificada por el Colegio Mexicano de Ginecología.',
    18,
    1100.00,
    'verified',
    'Santa Fe 321, Col. Santa Fe, CDMX',
    '+52 55 4567 8901',
    ARRAY['CDMX'],
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '5678901',
    'Medicina General',
    'Médico general con enfoque en medicina familiar y preventiva. Amplia experiencia en consulta externa, medicina del trabajo y programas de salud comunitaria. Especializado en diabetes, hipertensión y obesidad.',
    8,
    600.00,
    'verified',
    'Condesa 654, Col. Condesa, CDMX',
    '+52 55 5678 9012',
    ARRAY['CDMX', 'Puebla'],
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (user_id) DO UPDATE SET
  specialty = EXCLUDED.specialty,
  biography = EXCLUDED.biography,
  years_experience = EXCLUDED.years_experience,
  consultation_fee = EXCLUDED.consultation_fee,
  verification_status = EXCLUDED.verification_status,
  office_address = EXCLUDED.office_address,
  office_phone = EXCLUDED.office_phone,
  practice_locations = EXCLUDED.practice_locations,
  updated_at = NOW();

-- Insert active subscriptions for the demo doctors
INSERT INTO public.subscriptions (
  user_id,
  plan,
  amount,
  status,
  starts_at,
  ends_at,
  payment_method,
  created_at,
  updated_at
) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'monthly', 799, 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 'demo', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'annual', 7990, 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days', 'demo', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'monthly', 799, 'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 'demo', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'annual', 7990, 'active', NOW() - INTERVAL '60 days', NOW() + INTERVAL '305 days', 'demo', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'monthly', 799, 'active', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 'demo', NOW(), NOW());

-- Insert some ratings for the doctors to create variety in ratings
INSERT INTO public.ratings (
  patient_user_id,
  doctor_user_id,
  appointment_id,
  rating,
  comment,
  created_at
) VALUES
  -- Ratings for Dr. García (Cardiología) - High ratings
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 5, 'Excelente doctor, muy profesional y atento.', NOW() - INTERVAL '30 days'),
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 5, 'Me salvó la vida, altamente recomendado.', NOW() - INTERVAL '20 days'),
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 4, 'Muy buen trato y explicaciones claras.', NOW() - INTERVAL '10 days'),
  
  -- Ratings for Dra. Martínez (Dermatología) - High ratings  
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '22222222-2222-2222-2222-222222222222', gen_random_uuid(), 5, 'Increíble profesional, resultados excepcionales.', NOW() - INTERVAL '25 days'),
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '22222222-2222-2222-2222-222222222222', gen_random_uuid(), 5, 'La mejor dermatóloga que he visitado.', NOW() - INTERVAL '15 days'),
  
  -- Ratings for Dr. Rodríguez (Pediatría) - Good ratings
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '33333333-3333-3333-3333-333333333333', gen_random_uuid(), 4, 'Muy bueno con los niños, paciente y cariñoso.', NOW() - INTERVAL '22 days'),
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '33333333-3333-3333-3333-333333333333', gen_random_uuid(), 5, 'Mi hijo se sintió muy cómodo, excelente pediatra.', NOW() - INTERVAL '12 days'),
  
  -- Ratings for Dra. Fernández (Ginecología) - Excellent ratings
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '44444444-4444-4444-4444-444444444444', gen_random_uuid(), 5, 'Profesional excepcional, me ayudó mucho.', NOW() - INTERVAL '18 days'),
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '44444444-4444-4444-4444-444444444444', gen_random_uuid(), 5, 'La recomiendo ampliamente, muy competente.', NOW() - INTERVAL '8 days'),
  
  -- Ratings for Dr. Santos (Medicina General) - Good ratings
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '55555555-5555-5555-5555-555555555555', gen_random_uuid(), 4, 'Buen doctor, trato amable y profesional.', NOW() - INTERVAL '28 days'),
  ('013cc96f-061d-4dfd-b23b-90b39c8bbf8e', '55555555-5555-5555-5555-555555555555', gen_random_uuid(), 4, 'Consulta completa y detallada.', NOW() - INTERVAL '14 days');