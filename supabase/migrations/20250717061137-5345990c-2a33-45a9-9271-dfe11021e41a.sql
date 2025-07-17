-- Crear tabla doctor_assistants para relación muchos a muchos
CREATE TABLE public.doctor_assistants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  assistant_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, assistant_id)
);

-- Enable RLS
ALTER TABLE public.doctor_assistants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Doctors can view their assigned assistants" 
ON public.doctor_assistants 
FOR SELECT 
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can assign assistants" 
ON public.doctor_assistants 
FOR INSERT 
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can remove their assistants" 
ON public.doctor_assistants 
FOR DELETE 
USING (auth.uid() = doctor_id);

CREATE POLICY "Assistants can view their assignments" 
ON public.doctor_assistants 
FOR SELECT 
USING (auth.uid() = assistant_id);

CREATE POLICY "Admins can manage all assistant assignments" 
ON public.doctor_assistants 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Índices para mejorar performance
CREATE INDEX idx_doctor_assistants_doctor_id ON public.doctor_assistants(doctor_id);
CREATE INDEX idx_doctor_assistants_assistant_id ON public.doctor_assistants(assistant_id);