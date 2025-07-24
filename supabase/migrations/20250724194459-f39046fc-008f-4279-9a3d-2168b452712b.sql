-- Tabla para solicitudes de registro de doctores
CREATE TABLE public.doctor_registration_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  specialty TEXT NOT NULL,
  professional_license TEXT NOT NULL,
  years_experience INTEGER NOT NULL,
  clinic_address TEXT,
  clinic_city TEXT,
  clinic_state TEXT,
  preferred_contact_method TEXT DEFAULT 'phone',
  preferred_contact_time TEXT,
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_doctor_registration_requests_status ON public.doctor_registration_requests(status);
CREATE INDEX idx_doctor_registration_requests_email ON public.doctor_registration_requests(email);
CREATE INDEX idx_doctor_registration_requests_created_at ON public.doctor_registration_requests(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_doctor_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_doctor_registration_requests_updated_at
  BEFORE UPDATE ON public.doctor_registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_doctor_registration_requests_updated_at();

-- RLS policies
ALTER TABLE public.doctor_registration_requests ENABLE ROW LEVEL SECURITY;

-- Política para que cualquier usuario autenticado pueda crear solicitudes
CREATE POLICY "Anyone can create registration requests"
ON public.doctor_registration_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para que solo admins puedan ver todas las solicitudes
CREATE POLICY "Admins can view all registration requests"
ON public.doctor_registration_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Política para que admins puedan actualizar solicitudes
CREATE POLICY "Admins can update registration requests"
ON public.doctor_registration_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Función para crear doctor desde solicitud aprobada
CREATE OR REPLACE FUNCTION public.create_doctor_from_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_temp_password TEXT DEFAULT NULL
)
RETURNS TABLE(
  doctor_user_id UUID,
  doctor_profile_id UUID,
  temp_password TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_user_id UUID;
  v_profile_id UUID;
  v_doctor_profile_id UUID;
  v_generated_password TEXT;
BEGIN
  -- Verificar que el admin tiene permisos
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden crear doctores desde solicitudes';
  END IF;

  -- Obtener la solicitud
  SELECT * INTO v_request
  FROM public.doctor_registration_requests
  WHERE id = p_request_id AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada o no aprobada';
  END IF;

  -- Verificar que el email no esté ya en uso
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_request.email
  ) THEN
    RAISE EXCEPTION 'El email % ya está registrado', v_request.email;
  END IF;

  -- Generar contraseña temporal si no se proporciona
  v_generated_password := COALESCE(
    p_temp_password,
    'TempDoc' || LPAD((RANDOM() * 999999)::INT::TEXT, 6, '0')
  );

  -- Crear usuario en auth.users (esto requiere privilegios de admin)
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_request.email,
    crypt(v_generated_password, gen_salt('bf')),
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_user_id;

  -- Crear perfil
  INSERT INTO public.profiles (
    id, user_id, full_name, role, email, phone, created_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    v_request.full_name,
    'doctor',
    v_request.email,
    v_request.phone,
    now()
  )
  RETURNING id INTO v_profile_id;

  -- Crear perfil de doctor
  INSERT INTO public.doctor_profiles (
    user_id,
    specialty,
    professional_license,
    experience_years,
    verification_status,
    subscription_status,
    created_by_admin,
    created_at
  )
  VALUES (
    v_user_id,
    v_request.specialty,
    v_request.professional_license,
    v_request.years_experience,
    'pending',
    'inactive',
    p_admin_id,
    now()
  )
  RETURNING id INTO v_doctor_profile_id;

  -- Actualizar la solicitud como procesada
  UPDATE public.doctor_registration_requests
  SET 
    status = 'approved',
    admin_notes = COALESCE(admin_notes, '') || 
      CASE 
        WHEN admin_notes IS NOT NULL THEN E'\n\nCuenta creada exitosamente.'
        ELSE 'Cuenta creada exitosamente.'
      END,
    reviewed_by = p_admin_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  -- Retornar información del doctor creado
  RETURN QUERY SELECT v_user_id, v_doctor_profile_id, v_generated_password;
END;
$$;