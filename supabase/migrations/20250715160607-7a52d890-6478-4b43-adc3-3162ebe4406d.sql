-- Add policy to allow doctors to update their own profile
CREATE POLICY "Doctors can update their own profile" 
ON public.doctor_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);