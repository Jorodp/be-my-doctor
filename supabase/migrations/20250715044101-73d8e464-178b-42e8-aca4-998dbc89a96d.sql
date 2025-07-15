-- Create security definer function to get assigned doctor ID
CREATE OR REPLACE FUNCTION public.get_assigned_doctor_id()
RETURNS UUID AS $$
DECLARE
  assigned_doctor_id UUID;
BEGIN
  SELECT (raw_user_meta_data ->> 'assigned_doctor_id')::uuid 
  INTO assigned_doctor_id
  FROM auth.users 
  WHERE id = auth.uid();
  
  RETURN assigned_doctor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies that reference auth.users directly
DROP POLICY IF EXISTS "Assistants can manage assigned doctor availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors and assistants can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;

-- Recreate policies using the security definer function
CREATE POLICY "Assistants can manage assigned doctor availability" 
ON public.doctor_availability 
FOR ALL 
USING (
  (auth.uid() = doctor_user_id) OR 
  (EXISTS ( 
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'assistant'::user_role 
    AND public.get_assigned_doctor_id() = doctor_availability.doctor_user_id
  ))
);

CREATE POLICY "Users can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (
  (auth.uid() = patient_user_id) OR 
  (auth.uid() = doctor_user_id) OR 
  (EXISTS ( 
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'assistant'::user_role 
    AND public.get_assigned_doctor_id() = appointments.doctor_user_id
  ))
);

CREATE POLICY "Doctors and assistants can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  (auth.uid() = doctor_user_id) OR 
  (auth.uid() = patient_user_id) OR
  (EXISTS ( 
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'assistant'::user_role 
    AND public.get_assigned_doctor_id() = appointments.doctor_user_id
  ))
);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  (auth.uid() = patient_user_id) OR 
  (auth.uid() = doctor_user_id) OR 
  (EXISTS ( 
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'assistant'::user_role 
    AND public.get_assigned_doctor_id() = appointments.doctor_user_id
  ))
);