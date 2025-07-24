-- Corregir la tabla doctor_assistants para usar las relaciones correctas
-- Primero eliminar la tabla existente y recrearla correctamente

DROP TABLE IF EXISTS public.doctor_assistants CASCADE;

-- Crear la tabla doctor_assistants con las relaciones correctas a profiles
CREATE TABLE public.doctor_assistants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  assistant_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, assistant_id)
);

-- Habilitar RLS
ALTER TABLE public.doctor_assistants ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
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