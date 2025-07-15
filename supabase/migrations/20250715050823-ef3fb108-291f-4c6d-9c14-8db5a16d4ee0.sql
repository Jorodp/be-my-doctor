-- Create policy for assistants to update patient profiles for their assigned doctor's patients
CREATE POLICY "Assistants can update patient profiles for assigned doctor"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM appointments a
    WHERE a.patient_user_id = profiles.user_id
    AND a.doctor_user_id = public.get_assigned_doctor_id()
    AND EXISTS (
      SELECT 1 FROM profiles assistant_profile
      WHERE assistant_profile.user_id = auth.uid()
      AND assistant_profile.role = 'assistant'::user_role
    )
  )
);