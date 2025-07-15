-- Create the user_role enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'patient', 'medical_assistant');
    END IF;
END $$;

-- Create the verification_status enum if it doesn't exist
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