-- Add consultorios field to doctor_profiles table
ALTER TABLE public.doctor_profiles 
ADD COLUMN consultorios JSONB DEFAULT '[]'::jsonb;