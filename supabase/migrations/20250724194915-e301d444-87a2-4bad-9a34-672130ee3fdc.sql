-- Agregar campo created_by_admin a doctor_profiles si no existe
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES auth.users(id);

-- Función mejorada para crear doctor desde solicitud
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
SET search_path = 'public'
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
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
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

  -- Generar nuevo UUID para el usuario
  v_user_id := gen_random_uuid();
  v_profile_id := gen_random_uuid();

  -- Crear perfil primero
  INSERT INTO public.profiles (
    id, user_id, full_name, role, email, phone, created_at
  )
  VALUES (
    v_profile_id,
    v_user_id,
    v_request.full_name,
    'doctor',
    v_request.email,
    v_request.phone,
    now()
  );

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