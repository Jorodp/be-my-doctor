-- Crear tabla patient_documents para almacenar documentos de pacientes
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  document_type TEXT NOT NULL, -- 'identification', 'profile_image', etc.
  document_url TEXT NOT NULL,
  original_filename TEXT,
  file_size BIGINT,
  uploaded_by UUID, -- quien subió el documento
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para patient_documents
CREATE POLICY patient_documents_select_policy ON patient_documents
FOR SELECT 
USING (
  -- Administradores pueden ver todos los documentos
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
  )) OR
  -- Pacientes pueden ver sus propios documentos
  (patient_user_id = auth.uid()) OR
  -- Doctores pueden ver documentos de sus pacientes con citas
  (EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_user_id = patient_documents.patient_user_id 
      AND a.doctor_user_id = auth.uid()
      AND a.status IN ('scheduled', 'completed')
  )) OR
  -- Asistentes pueden ver documentos de pacientes de doctores asignados
  (EXISTS (
    SELECT 1 FROM profiles p
    JOIN clinic_assistants ca ON ca.assistant_id = p.id
    JOIN clinics c ON c.id = ca.clinic_id
    JOIN profiles dp ON dp.id = c.doctor_id
    JOIN appointments a ON a.doctor_user_id = dp.user_id
    WHERE p.user_id = auth.uid() 
      AND p.role = 'assistant'::user_role
      AND a.patient_user_id = patient_documents.patient_user_id
      AND a.status IN ('scheduled', 'completed')
  ))
);

CREATE POLICY patient_documents_insert_policy ON patient_documents
FOR INSERT 
WITH CHECK (
  -- Administradores pueden crear cualquier documento
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
  )) OR
  -- Pacientes pueden subir sus propios documentos
  (patient_user_id = auth.uid()) OR
  -- Asistentes pueden subir documentos para pacientes de doctores asignados
  (EXISTS (
    SELECT 1 FROM profiles p
    JOIN clinic_assistants ca ON ca.assistant_id = p.id
    JOIN clinics c ON c.id = ca.clinic_id
    JOIN profiles dp ON dp.id = c.doctor_id
    JOIN appointments a ON a.doctor_user_id = dp.user_id
    WHERE p.user_id = auth.uid() 
      AND p.role = 'assistant'::user_role
      AND a.patient_user_id = patient_documents.patient_user_id
      AND a.status IN ('scheduled', 'completed')
  ))
);

CREATE POLICY patient_documents_update_policy ON patient_documents
FOR UPDATE 
USING (
  -- Administradores pueden actualizar cualquier documento
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
  )) OR
  -- Solo quien subió el documento puede actualizarlo
  (uploaded_by = auth.uid())
);

-- Migrar datos existentes de profiles a patient_documents
INSERT INTO public.patient_documents (patient_user_id, document_type, document_url, uploaded_by)
SELECT 
  user_id as patient_user_id,
  'identification' as document_type,
  id_document_url as document_url,
  user_id as uploaded_by
FROM profiles 
WHERE id_document_url IS NOT NULL;

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_patient_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_patient_documents_updated_at
  BEFORE UPDATE ON public.patient_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_patient_documents_updated_at();