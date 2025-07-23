-- Crear bucket para documentos de pacientes
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('patient-documents', 'patient-documents', false);

-- Políticas para documentos de pacientes (privados)
CREATE POLICY "Admins can view patient documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'patient-documents' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can upload patient documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'patient-documents' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update patient documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'patient-documents' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete patient documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'patient-documents' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));