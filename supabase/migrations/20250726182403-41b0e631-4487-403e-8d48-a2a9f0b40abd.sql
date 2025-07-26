-- Crear buckets de storage para documentos de pacientes
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('patient-profiles', 'patient-profiles', true),
  ('patient-documents', 'patient-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas de storage para patient-profiles bucket
CREATE POLICY "Patient profiles are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'patient-profiles');

CREATE POLICY "Users can upload patient profile images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'patient-profiles' AND 
  (
    -- Administradores pueden subir cualquier imagen
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
    )) OR
    -- Pacientes pueden subir su propia imagen
    (auth.uid()::text = (storage.foldername(name))[1]) OR
    -- Asistentes pueden subir imágenes de pacientes de doctores asignados
    (EXISTS (
      SELECT 1 FROM profiles p
      JOIN clinic_assistants ca ON ca.assistant_id = p.id
      JOIN clinics c ON c.id = ca.clinic_id
      JOIN profiles dp ON dp.id = c.doctor_id
      JOIN appointments a ON a.doctor_user_id = dp.user_id
      WHERE p.user_id = auth.uid() 
        AND p.role = 'assistant'::user_role
        AND a.patient_user_id::text = (storage.foldername(name))[1]
        AND a.status IN ('scheduled', 'completed')
    ))
  )
);

CREATE POLICY "Users can update patient profile images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'patient-profiles' AND 
  (
    -- Administradores pueden actualizar cualquier imagen
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
    )) OR
    -- Pacientes pueden actualizar su propia imagen
    (auth.uid()::text = (storage.foldername(name))[1]) OR
    -- Asistentes pueden actualizar imágenes de pacientes de doctores asignados
    (EXISTS (
      SELECT 1 FROM profiles p
      JOIN clinic_assistants ca ON ca.assistant_id = p.id
      JOIN clinics c ON c.id = ca.clinic_id
      JOIN profiles dp ON dp.id = c.doctor_id
      JOIN appointments a ON a.doctor_user_id = dp.user_id
      WHERE p.user_id = auth.uid() 
        AND p.role = 'assistant'::user_role
        AND a.patient_user_id::text = (storage.foldername(name))[1]
        AND a.status IN ('scheduled', 'completed')
    ))
  )
);

-- Crear políticas de storage para patient-documents bucket
CREATE POLICY "Patient documents are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'patient-documents');

CREATE POLICY "Users can upload patient documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'patient-documents' AND 
  (
    -- Administradores pueden subir cualquier documento
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
    )) OR
    -- Pacientes pueden subir sus propios documentos
    (auth.uid()::text = (storage.foldername(name))[1]) OR
    -- Asistentes pueden subir documentos de pacientes de doctores asignados
    (EXISTS (
      SELECT 1 FROM profiles p
      JOIN clinic_assistants ca ON ca.assistant_id = p.id
      JOIN clinics c ON c.id = ca.clinic_id
      JOIN profiles dp ON dp.id = c.doctor_id
      JOIN appointments a ON a.doctor_user_id = dp.user_id
      WHERE p.user_id = auth.uid() 
        AND p.role = 'assistant'::user_role
        AND a.patient_user_id::text = (storage.foldername(name))[1]
        AND a.status IN ('scheduled', 'completed')
    ))
  )
);

CREATE POLICY "Users can update patient documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'patient-documents' AND 
  (
    -- Administradores pueden actualizar cualquier documento
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
    )) OR
    -- Pacientes pueden actualizar sus propios documentos
    (auth.uid()::text = (storage.foldername(name))[1]) OR
    -- Asistentes pueden actualizar documentos de pacientes de doctores asignados
    (EXISTS (
      SELECT 1 FROM profiles p
      JOIN clinic_assistants ca ON ca.assistant_id = p.id
      JOIN clinics c ON c.id = ca.clinic_id
      JOIN profiles dp ON dp.id = c.doctor_id
      JOIN appointments a ON a.doctor_user_id = dp.user_id
      WHERE p.user_id = auth.uid() 
        AND p.role = 'assistant'::user_role
        AND a.patient_user_id::text = (storage.foldername(name))[1]
        AND a.status IN ('scheduled', 'completed')
    ))
  )
);