-- Crear buckets de storage necesarios
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('doctor-photos', 'doctor-photos', true),
  ('doctor-documents', 'doctor-documents', false),
  ('doctor-profiles', 'doctor-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas para doctor-photos (públicas)
CREATE POLICY "Doctor photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'doctor-photos');

CREATE POLICY "Authenticated users can upload doctor photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'doctor-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update doctor photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'doctor-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete doctor photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'doctor-photos' AND auth.role() = 'authenticated');

-- Crear políticas para doctor-profiles (públicas)
CREATE POLICY "Doctor profiles are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'doctor-profiles');

CREATE POLICY "Authenticated users can upload doctor profiles" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'doctor-profiles' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update doctor profiles" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'doctor-profiles' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete doctor profiles" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'doctor-profiles' AND auth.role() = 'authenticated');

-- Crear políticas para doctor-documents (privadas, solo para autenticados)
CREATE POLICY "Authenticated users can view doctor documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'doctor-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload doctor documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'doctor-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update doctor documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'doctor-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete doctor documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'doctor-documents' AND auth.role() = 'authenticated');

-- Agregar columna consultation_fee a la tabla clinics si no existe
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC;

-- Agregar columna is_primary a la tabla clinics para marcar consultorio principal
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;