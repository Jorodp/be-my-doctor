-- Fix the RLS policy for doctor_assistants to work correctly
DROP POLICY IF EXISTS "Doctors can manage their assistants" ON public.doctor_assistants;

-- Create new policy that works with the actual data structure
CREATE POLICY "Doctors can manage their assistants" 
ON public.doctor_assistants 
FOR ALL 
USING (
  -- Doctor can manage if they are the doctor in the relationship
  doctor_id = auth.uid() OR
  -- Assistant can view if they are the assistant in the relationship  
  assistant_id = auth.uid() OR
  -- Admin can manage all
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);