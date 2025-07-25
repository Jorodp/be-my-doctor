-- Crear tabla para asignaciones específicas de asistente a clínica
-- Esto permite control granular: un asistente puede estar asignado solo a ciertas clínicas de un doctor

CREATE TABLE IF NOT EXISTS public.clinic_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  assistant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(clinic_id, assistant_id)
);

-- Habilitar RLS
ALTER TABLE public.clinic_assistants ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para clinic_assistants
CREATE POLICY "Admins can manage clinic assistants"
ON public.clinic_assistants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Doctors can manage their clinic assistants"
ON public.clinic_assistants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = clinic_assistants.clinic_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = clinic_assistants.clinic_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Assistants can view their clinic assignments"
ON public.clinic_assistants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = clinic_assistants.assistant_id
    AND p.user_id = auth.uid()
    AND p.role = 'assistant'
  )
);

-- Actualizar la función de seguridad para usar las asignaciones específicas de clínica
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
  assistant_internal_id uuid;
BEGIN
  -- Obtener el ID del usuario actual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obtener el internal ID del asistente
  SELECT id INTO assistant_internal_id 
  FROM public.profiles 
  WHERE user_id = current_user_id AND role = 'assistant';
  
  IF assistant_internal_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Método 1: Verificar asignación específica por clínica (NUEVA)
  IF EXISTS (
    SELECT 1 FROM public.clinic_assistants ca
    WHERE ca.clinic_id = $1
    AND ca.assistant_id = assistant_internal_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Método 2: Verificar asignación via tabla doctor_assistants (para doctores con múltiples clínicas)
  SELECT doctor_id INTO doctor_internal_id 
  FROM public.clinics 
  WHERE id = $1;
  
  IF doctor_internal_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.doctor_assistants da
      WHERE da.doctor_id = doctor_internal_id
      AND da.assistant_id = assistant_internal_id
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Método 3: Verificar asignación legacy via assigned_doctor_id en profiles
  SELECT user_id INTO doctor_user_id 
  FROM public.profiles 
  WHERE id = doctor_internal_id;
  
  IF doctor_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = current_user_id 
      AND assigned_doctor_id = doctor_user_id
      AND role = 'assistant'
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;