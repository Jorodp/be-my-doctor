-- Verificar si la tabla doctor_assistants existe, si no, crearla
-- Primero, verificamos las tablas existentes relacionadas con asistentes

-- Crear la tabla doctor_assistants si no existe
CREATE TABLE IF NOT EXISTS public.doctor_assistants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, assistant_id)
);

-- Habilitar RLS en doctor_assistants
ALTER TABLE public.doctor_assistants ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para doctor_assistants
CREATE POLICY "Doctors can view their assistants" ON public.doctor_assistants
FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert their assistants" ON public.doctor_assistants
FOR INSERT WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their assistants" ON public.doctor_assistants
FOR DELETE USING (auth.uid() = doctor_id);

CREATE POLICY "Assistants can view their assignments" ON public.doctor_assistants
FOR SELECT USING (auth.uid() = assistant_id);

CREATE POLICY "Admins can manage all assistant assignments" ON public.doctor_assistants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Crear función para obtener información del asistente si no existe
CREATE OR REPLACE FUNCTION public.get_assistant_info(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  phone text,
  profile_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    p.user_id,
    u.email::text,
    p.full_name,
    p.phone,
    p.profile_image_url
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = p_user_id;
$$;