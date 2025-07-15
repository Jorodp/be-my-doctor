-- Add new columns to doctor_profiles table for better profile management
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS practice_locations TEXT[],
ADD COLUMN IF NOT EXISTS office_address TEXT,
ADD COLUMN IF NOT EXISTS office_phone TEXT;

-- Update RLS policies to ensure only admins can modify doctor profiles after creation
-- First, drop existing policies that allow doctor self-editing
DROP POLICY IF EXISTS "Doctors can update their own profile" ON public.doctor_profiles;

-- Create new policy that only allows profile creation but not updates by doctors
CREATE POLICY "Doctors can insert their own profile" 
ON public.doctor_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow doctors to view their own profile
CREATE POLICY "Doctors can view their own profile" 
ON public.doctor_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure admins can do everything
CREATE POLICY "Admins can manage all doctor profiles" 
ON public.doctor_profiles 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Update profiles table to allow image updates by doctors (for profile image only)
CREATE POLICY "Doctors can update their profile image" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM doctor_profiles 
    WHERE doctor_profiles.user_id = auth.uid()
  )
);