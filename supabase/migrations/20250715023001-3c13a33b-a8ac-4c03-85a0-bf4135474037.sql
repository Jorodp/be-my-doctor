-- Drop the policies that depend on the enum columns
DROP POLICY IF EXISTS "Anyone can view verified doctor profiles" ON public.doctor_profiles;

-- Create the enums if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'patient', 'medical_assistant');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
    END IF;
END $$;

-- Update the profiles table to use the correct enum type
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role USING role::text::user_role;

-- Update the doctor_profiles table to use the correct enum type  
ALTER TABLE public.doctor_profiles 
ALTER COLUMN verification_status TYPE verification_status USING verification_status::text::verification_status;

-- Recreate the policy
CREATE POLICY "Anyone can view verified doctor profiles" 
ON public.doctor_profiles FOR SELECT 
USING (verification_status = 'verified'::verification_status);