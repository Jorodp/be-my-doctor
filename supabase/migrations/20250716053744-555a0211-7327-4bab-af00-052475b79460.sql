-- Add assigned_doctor_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN assigned_doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_profiles_assigned_doctor_id ON public.profiles(assigned_doctor_id);

-- Update RLS policies for assistants to only see data from their assigned doctor
DROP POLICY IF EXISTS "Assistants can update patient profiles for assigned doctor" ON public.profiles;

CREATE POLICY "Assistants can update patient profiles for assigned doctor" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM appointments a 
    WHERE a.patient_user_id = profiles.user_id 
    AND a.doctor_user_id = (
      SELECT assigned_doctor_id 
      FROM profiles assistant_profile 
      WHERE assistant_profile.user_id = auth.uid() 
      AND assistant_profile.role = 'assistant'
    )
  )
);

-- Create policy for assistants to view their assigned doctor's profile
CREATE POLICY "Assistants can view assigned doctor profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM profiles 
    WHERE assigned_doctor_id = profiles.user_id 
    AND role = 'assistant'
  ) 
  OR user_id = (
    SELECT assigned_doctor_id 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'assistant'
  )
);

-- Create policy for doctors to view their assigned assistants
CREATE POLICY "Doctors can view their assigned assistants" 
ON public.profiles 
FOR SELECT 
USING (
  assigned_doctor_id = auth.uid() 
  AND role = 'assistant'
);

-- Update appointments policies for assistants
DROP POLICY IF EXISTS "Doctors and assistants can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;

CREATE POLICY "Doctors and assistants can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  (auth.uid() = doctor_user_id) 
  OR (auth.uid() = patient_user_id) 
  OR (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'assistant' 
      AND assigned_doctor_id = appointments.doctor_user_id
    )
  )
);

CREATE POLICY "Users can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (
  (auth.uid() = patient_user_id) 
  OR (auth.uid() = doctor_user_id) 
  OR (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'assistant' 
      AND assigned_doctor_id = appointments.doctor_user_id
    )
  )
  OR (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  (auth.uid() = patient_user_id) 
  OR (auth.uid() = doctor_user_id) 
  OR (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'assistant' 
      AND assigned_doctor_id = appointments.doctor_user_id
    )
  )
);