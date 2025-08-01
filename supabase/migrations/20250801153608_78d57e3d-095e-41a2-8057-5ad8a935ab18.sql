-- Crear tabla para los tipos de insignias
CREATE TABLE public.badge_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  color text NOT NULL DEFAULT '#3B82F6',
  icon text DEFAULT 'Award',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Crear tabla para asignar insignias a doctores
CREATE TABLE public.doctor_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_user_id uuid NOT NULL,
  badge_type_id uuid NOT NULL REFERENCES public.badge_types(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  is_visible boolean NOT NULL DEFAULT true,
  UNIQUE(doctor_user_id, badge_type_id)
);

-- Habilitar RLS
ALTER TABLE public.badge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_badges ENABLE ROW LEVEL SECURITY;

-- Políticas para badge_types
CREATE POLICY "Anyone can view active badge types" 
ON public.badge_types 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage badge types" 
ON public.badge_types 
FOR ALL 
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Políticas para doctor_badges
CREATE POLICY "Anyone can view visible doctor badges" 
ON public.doctor_badges 
FOR SELECT 
USING (is_visible = true);

CREATE POLICY "Doctors can view their own badges" 
ON public.doctor_badges 
FOR SELECT 
USING (doctor_user_id = auth.uid());

CREATE POLICY "Admins can manage doctor badges" 
ON public.doctor_badges 
FOR ALL 
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Insertar insignia de Fundador por defecto
INSERT INTO public.badge_types (name, description, color, icon) 
VALUES ('Fundador', 'Doctor fundador de la plataforma', '#8B5CF6', 'Crown');

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_badge_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_badge_types_updated_at
BEFORE UPDATE ON public.badge_types
FOR EACH ROW
EXECUTE FUNCTION public.update_badge_types_updated_at();