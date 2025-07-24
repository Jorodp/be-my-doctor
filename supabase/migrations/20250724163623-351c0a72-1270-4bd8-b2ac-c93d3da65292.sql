-- Fix doctor_assistants table with proper foreign keys
DROP TABLE IF EXISTS public.doctor_assistants CASCADE;

CREATE TABLE public.doctor_assistants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(doctor_id, assistant_id)
);

-- Enable RLS
ALTER TABLE public.doctor_assistants ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Doctors can see/manage their own assistants
CREATE POLICY "Doctors can manage their assistants" 
ON public.doctor_assistants 
FOR ALL 
USING (
  doctor_id = auth.uid() OR
  assistant_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND 'admin' = ANY(roles)
  )
);

-- Add index for performance
CREATE INDEX idx_doctor_assistants_doctor_id ON public.doctor_assistants(doctor_id);
CREATE INDEX idx_doctor_assistants_assistant_id ON public.doctor_assistants(assistant_id);