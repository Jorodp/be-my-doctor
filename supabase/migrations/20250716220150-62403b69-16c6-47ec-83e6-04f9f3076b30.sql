-- Crear políticas de storage para el bucket doctor-profiles

-- Política para permitir insertar/subir archivos
CREATE POLICY "Authenticated users can upload doctor profile images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'doctor-profiles' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir leer archivos (pública)
CREATE POLICY "Anyone can view doctor profile images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'doctor-profiles');

-- Política para permitir actualizar archivos
CREATE POLICY "Authenticated users can update doctor profile images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'doctor-profiles' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir eliminar archivos
CREATE POLICY "Authenticated users can delete doctor profile images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'doctor-profiles' 
  AND auth.role() = 'authenticated'
);