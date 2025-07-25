-- 🚨 ARREGLO CRÍTICO DE SEGURIDAD: Políticas RLS para tabla availabilities
-- Los asistentes solo pueden modificar consultorios de doctores asignados

-- Primero, vamos a revisar las políticas actuales y corregirlas

-- Crear función de seguridad para verificar si un asistente puede acceder a una clínica
CREATE OR REPLACE FUNCTION public.assistant_can_access_clinic(clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'pg_catalog'
AS $$
DECLARE
  current_user_id uuid;
  doctor_internal_id uuid;
  doctor_user_id uuid;
BEGIN
  -- Obtener el ID del usuario actual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obtener el doctor_id (internal ID) de la clínica
  SELECT doctor_id INTO doctor_internal_id 
  FROM public.clinics 
  WHERE id = clinic_id;
  
  IF doctor_internal_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obtener el user_id del doctor desde el internal ID
  SELECT user_id INTO doctor_user_id 
  FROM public.profiles 
  WHERE id = doctor_internal_id;
  
  IF doctor_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar si el asistente está asignado a este doctor
  -- Método 1: Via tabla doctor_assistants (nuevo sistema)
  IF EXISTS (
    SELECT 1 FROM public.doctor_assistants da
    JOIN public.profiles p ON p.id = da.assistant_id
    WHERE p.user_id = current_user_id
    AND da.doctor_id = doctor_internal_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Método 2: Via assigned_doctor_id en profiles (sistema legacy)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = current_user_id 
    AND assigned_doctor_id = doctor_user_id
    AND role = 'assistant'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Eliminar políticas existentes de availabilities que puedan ser inseguras
DROP POLICY IF EXISTS "Assistants can manage assigned doctor clinic availabilities" ON public.availabilities;
DROP POLICY IF EXISTS "Assistants can view assigned doctor clinics" ON public.availabilities; 

-- Crear políticas RLS seguras para la tabla availabilities

-- Política para que asistentes SOLO puedan ver disponibilidades de clínicas asignadas
CREATE POLICY "Assistants can view assigned doctor clinic availabilities"
ON public.availabilities
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'assistant'
  ) AND public.assistant_can_access_clinic(clinic_id))
  OR 
  -- Doctores pueden ver sus propias disponibilidades
  (EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id 
    AND p.user_id = auth.uid()
  ))
  OR
  -- Admins pueden ver todo
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  OR
  -- Acceso público para disponibilidades activas (para booking)
  (is_active = true)
);

-- Política para que asistentes SOLO puedan insertar en clínicas asignadas
CREATE POLICY "Assistants can insert assigned doctor clinic availabilities"
ON public.availabilities
FOR INSERT
TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'assistant'
  ) AND public.assistant_can_access_clinic(clinic_id))
  OR
  -- Doctores pueden insertar en sus propias clínicas
  (EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id 
    AND p.user_id = auth.uid()
  ))
  OR
  -- Admins pueden insertar en cualquier lado
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

-- Política para que asistentes SOLO puedan actualizar en clínicas asignadas
CREATE POLICY "Assistants can update assigned doctor clinic availabilities"
ON public.availabilities
FOR UPDATE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'assistant'
  ) AND public.assistant_can_access_clinic(clinic_id))
  OR
  -- Doctores pueden actualizar sus propias disponibilidades
  (EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id 
    AND p.user_id = auth.uid()
  ))
  OR
  -- Admins pueden actualizar todo
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'assistant'
  ) AND public.assistant_can_access_clinic(clinic_id))
  OR
  -- Doctores pueden actualizar sus propias disponibilidades
  (EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id 
    AND p.user_id = auth.uid()
  ))
  OR
  -- Admins pueden actualizar todo
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

-- Política para que asistentes SOLO puedan eliminar en clínicas asignadas
CREATE POLICY "Assistants can delete assigned doctor clinic availabilities"
ON public.availabilities
FOR DELETE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'assistant'
  ) AND public.assistant_can_access_clinic(clinic_id))
  OR
  -- Doctores pueden eliminar sus propias disponibilidades
  (EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id 
    AND p.user_id = auth.uid()
  ))
  OR
  -- Admins pueden eliminar todo
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);