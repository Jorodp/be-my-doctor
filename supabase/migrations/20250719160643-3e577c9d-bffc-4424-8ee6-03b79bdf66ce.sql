-- Actualizar tabla doctor_profiles para soportar múltiples cédulas
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS additional_certifications_urls text[];

-- Función para validar si un perfil de doctor está completo
CREATE OR REPLACE FUNCTION public.is_doctor_profile_complete(doctor_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.doctor_profiles 
    WHERE user_id = doctor_user_id
    AND university_degree_document_url IS NOT NULL
    AND professional_license_document_url IS NOT NULL
    AND identification_document_url IS NOT NULL
  );
END;
$$;

-- Función para actualizar automáticamente el estado de verificación
CREATE OR REPLACE FUNCTION public.update_verification_status_on_documents()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si el perfil está completo pero aún está pendiente, mantenerlo en pendiente para revisión manual
  -- Si no está completo y estaba verificado, cambiar a pendiente
  IF NOT public.is_doctor_profile_complete(NEW.user_id) AND OLD.verification_status = 'verified' THEN
    NEW.verification_status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para validar documentos
DROP TRIGGER IF EXISTS trigger_update_verification_status ON public.doctor_profiles;
CREATE TRIGGER trigger_update_verification_status
  BEFORE UPDATE ON public.doctor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_verification_status_on_documents();

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Admin can manage doctor documents" ON storage.objects;

-- Política RLS para admin storage
CREATE POLICY "Admin can manage doctor documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'doctor-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);