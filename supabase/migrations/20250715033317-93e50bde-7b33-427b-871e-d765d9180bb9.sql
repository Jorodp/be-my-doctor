-- Create doctor and assistant users with passwords and profiles

-- First, delete any existing users with these emails to avoid conflicts
DELETE FROM auth.users WHERE email IN ('doctor@doctor.com', 'asistente@asistente.com');

-- Insert the new users directly into auth.users with hashed passwords
-- Note: This approach creates users that can log in immediately
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES 
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'doctor@doctor.com',
    crypt('Doctor123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"doctor"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', 
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'asistente@asistente.com',
    crypt('Asistente123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"assistant"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

-- Create profiles for the new users
INSERT INTO public.profiles (user_id, full_name, role)
SELECT 
  u.id,
  CASE 
    WHEN u.email = 'doctor@doctor.com' THEN 'Dr. Demo'
    WHEN u.email = 'asistente@asistente.com' THEN 'Asistente Demo'
  END as full_name,
  CASE 
    WHEN u.email = 'doctor@doctor.com' THEN 'doctor'::user_role
    WHEN u.email = 'asistente@asistente.com' THEN 'assistant'::user_role
  END as role
FROM auth.users u 
WHERE u.email IN ('doctor@doctor.com', 'asistente@asistente.com');

-- Create doctor profile for the doctor user
INSERT INTO public.doctor_profiles (
  user_id,
  specialty,
  professional_license,
  biography,
  years_experience,
  consultation_fee,
  verification_status
)
SELECT 
  u.id,
  'Medicina General',
  'MED-12345',
  'Doctor demo para pruebas del sistema',
  5,
  500.00,
  'verified'::verification_status
FROM auth.users u 
WHERE u.email = 'doctor@doctor.com';