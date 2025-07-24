-- First check if the table already exists
CREATE TABLE IF NOT EXISTS clinic_assistants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(clinic_id, assistant_id)
);

-- Enable RLS on clinic_assistants
ALTER TABLE clinic_assistants ENABLE ROW LEVEL SECURITY;

-- Create policy for clinic assistants  
CREATE POLICY "Clinic assistants access" ON clinic_assistants FOR ALL USING (true);