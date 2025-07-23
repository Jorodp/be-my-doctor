-- Crear buckets para archivos de doctores
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('doctor-photos', 'doctor-photos', true),
  ('doctor-documents', 'doctor-documents', false);

-- Políticas para fotos de doctores (públicas)
CREATE POLICY "Doctor photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'doctor-photos');

CREATE POLICY "Admins can upload doctor photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'doctor-photos' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update doctor photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'doctor-photos' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete doctor photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'doctor-photos' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Políticas para documentos de doctores (privados)
CREATE POLICY "Admins can view doctor documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'doctor-documents' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can upload doctor documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'doctor-documents' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update doctor documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'doctor-documents' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete doctor documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'doctor-documents' AND 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));