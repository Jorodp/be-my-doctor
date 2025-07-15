-- Fix existing users' roles and create profiles for all demo accounts

-- Update raw_user_meta_data for existing users to include roles
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'jorodp@hotmail.com';

UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "patient"}'::jsonb
WHERE email = 'paciente@paciente.com';

UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "doctor"}'::jsonb
WHERE email = 'doctor@doctor.com';

UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "assistant"}'::jsonb
WHERE email = 'asistente@asistente.com';

-- Insert profiles for existing users (admin)
INSERT INTO public.profiles (user_id, full_name, role)
SELECT id, 'Jorge Rodriguez', 'admin'::user_role
FROM auth.users 
WHERE email = 'jorodp@hotmail.com'
ON CONFLICT (user_id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Insert profiles for existing users (patient)
INSERT INTO public.profiles (user_id, full_name, role)
SELECT id, 'Paciente Demo', 'patient'::user_role
FROM auth.users 
WHERE email = 'paciente@paciente.com'
ON CONFLICT (user_id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Insert profiles for existing users (doctor)
INSERT INTO public.profiles (user_id, full_name, role)
SELECT id, 'Doctor Demo', 'doctor'::user_role
FROM auth.users 
WHERE email = 'doctor@doctor.com'
ON CONFLICT (user_id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Insert profiles for existing users (assistant)
INSERT INTO public.profiles (user_id, full_name, role)
SELECT id, 'Asistente Demo', 'assistant'::user_role
FROM auth.users 
WHERE email = 'asistente@asistente.com'
ON CONFLICT (user_id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;