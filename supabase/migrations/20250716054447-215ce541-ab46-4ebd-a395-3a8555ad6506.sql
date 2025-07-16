-- Fix infinite recursion in profiles RLS policies

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Assistants can view assigned doctor profile" ON public.profiles;
DROP POLICY IF EXISTS "Doctors can view their assigned assistants" ON public.profiles;
DROP POLICY IF EXISTS "Assistants can update patient profiles for assigned doctor" ON public.profiles;

-- Create a safe function to get assigned doctor ID without recursion
CREATE OR REPLACE FUNCTION public.get_user_assigned_doctor_id(user_uuid UUID)
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT assigned_doctor_id FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create new policies without recursion
CREATE POLICY "Assistants can view assigned doctor profile" 
ON public.profiles 
FOR SELECT 
USING (
  -- Assistant can view their assigned doctor's profile
  user_id = public.get_user_assigned_doctor_id(auth.uid())
  OR
  -- User can view their own profile  
  user_id = auth.uid()
);

CREATE POLICY "Doctors can view their assigned assistants" 
ON public.profiles 
FOR SELECT 
USING (
  assigned_doctor_id = auth.uid() 
  AND role = 'assistant'
);

CREATE POLICY "Assistants can update patient profiles for assigned doctor" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Assistant can update profiles of patients who have appointments with their assigned doctor
  EXISTS (
    SELECT 1 
    FROM appointments a 
    WHERE a.patient_user_id = profiles.user_id 
    AND a.doctor_user_id = public.get_user_assigned_doctor_id(auth.uid())
  )
);