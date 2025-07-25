-- Crear tabla para validaciones de identidad de pacientes
CREATE TABLE public.patient_identity_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL,
  patient_user_id UUID NOT NULL,
  validated_by UUID NOT NULL,
  validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Políticas RLS para validaciones de identidad
ALTER TABLE public.patient_identity_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "identity_validations_select_policy" ON public.patient_identity_validations
  FOR SELECT TO authenticated
  USING (
    -- Admin puede ver todas las validaciones
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Doctor puede ver validaciones de sus pacientes
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = patient_identity_validations.appointment_id
      AND a.doctor_user_id = auth.uid()
    ) OR
    -- Asistente puede ver validaciones del doctor asignado
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN appointments a ON a.doctor_user_id = p.assigned_doctor_id
      WHERE p.user_id = auth.uid() 
      AND p.role = 'assistant'
      AND a.id = patient_identity_validations.appointment_id
    ) OR
    -- Paciente puede ver sus propias validaciones
    patient_user_id = auth.uid()
  );

CREATE POLICY "identity_validations_insert_policy" ON public.patient_identity_validations
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Admin puede crear cualquier validación
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Asistente puede crear validaciones para el doctor asignado
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN appointments a ON a.doctor_user_id = p.assigned_doctor_id
      WHERE p.user_id = auth.uid() 
      AND p.role = 'assistant'
      AND a.id = patient_identity_validations.appointment_id
    ) OR
    -- Doctor puede crear validaciones para sus pacientes
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = patient_identity_validations.appointment_id
      AND a.doctor_user_id = auth.uid()
    )
  );

-- Agregar columna a appointments para trackear si la identidad está validada
ALTER TABLE public.appointments 
ADD COLUMN identity_validated BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN identity_validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN identity_validated_by UUID;