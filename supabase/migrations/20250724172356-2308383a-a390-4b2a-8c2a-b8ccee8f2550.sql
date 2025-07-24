-- Update doctor_availability to be clinic-specific instead of doctor-specific
ALTER TABLE doctor_availability DROP CONSTRAINT IF EXISTS doctor_availability_doctor_user_id_fkey;
ALTER TABLE doctor_availability ADD COLUMN clinic_id UUID REFERENCES clinics(id);

-- Create clinic_assistants relationship for independent assistants per clinic
CREATE TABLE IF NOT EXISTS clinic_assistants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  assistant_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(clinic_id, assistant_user_id)
);

-- Enable RLS on clinic_assistants
ALTER TABLE clinic_assistants ENABLE ROW LEVEL SECURITY;

-- Create policy for clinic assistants
CREATE POLICY "Clinic assistants can be managed by doctors and assistants" 
ON clinic_assistants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM clinics c 
    JOIN profiles p ON p.id = c.doctor_id 
    WHERE c.id = clinic_assistants.clinic_id 
    AND p.user_id = auth.uid()
  ) 
  OR assistant_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);