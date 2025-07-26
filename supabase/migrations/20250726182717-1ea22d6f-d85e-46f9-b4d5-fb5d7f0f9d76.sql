-- Crear tabla para validaciones de identidad de pacientes
CREATE TABLE IF NOT EXISTS public.patient_identity_validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id),
  patient_user_id UUID NOT NULL,
  validated_by UUID NOT NULL,
  validation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.patient_identity_validations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para patient_identity_validations
CREATE POLICY "Admins can manage identity validations" 
ON public.patient_identity_validations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
  )
);

CREATE POLICY "Doctors can create identity validations for their patients" 
ON public.patient_identity_validations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_id 
      AND a.doctor_user_id = auth.uid()
  )
);

CREATE POLICY "Assistants can create identity validations for assigned doctors" 
ON public.patient_identity_validations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN clinic_assistants ca ON ca.assistant_id = p.id
    JOIN clinics c ON c.id = ca.clinic_id
    JOIN profiles dp ON dp.id = c.doctor_id
    JOIN appointments a ON a.doctor_user_id = dp.user_id
    WHERE p.user_id = auth.uid() 
      AND p.role = 'assistant'::user_role
      AND a.id = appointment_id
  ) OR
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE a.id = appointment_id
      AND p.role = 'assistant'::user_role
      AND p.assigned_doctor_id = a.doctor_user_id
  )
);

CREATE POLICY "Users can view relevant identity validations" 
ON public.patient_identity_validations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
  ) OR
  patient_user_id = auth.uid() OR
  validated_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = appointment_id 
      AND (a.doctor_user_id = auth.uid() OR a.patient_user_id = auth.uid())
  )
);