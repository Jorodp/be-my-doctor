-- Habilitar RLS en la tabla availabilities
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;

-- Política para que los doctores puedan ver las disponibilidades de sus clínicas
CREATE POLICY "Doctors can view their clinic availabilities" ON public.availabilities
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id
    AND p.user_id = auth.uid()
  )
);

-- Política para que los doctores puedan insertar disponibilidades en sus clínicas
CREATE POLICY "Doctors can insert their clinic availabilities" ON public.availabilities
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id
    AND p.user_id = auth.uid()
  )
);

-- Política para que los doctores puedan actualizar las disponibilidades de sus clínicas
CREATE POLICY "Doctors can update their clinic availabilities" ON public.availabilities
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id
    AND p.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id
    AND p.user_id = auth.uid()
  )
);

-- Política para que los doctores puedan eliminar las disponibilidades de sus clínicas
CREATE POLICY "Doctors can delete their clinic availabilities" ON public.availabilities
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.profiles p ON p.id = c.doctor_id
    WHERE c.id = availabilities.clinic_id
    AND p.user_id = auth.uid()
  )
);

-- Política para que los asistentes puedan gestionar las disponibilidades de sus doctores asignados
CREATE POLICY "Assistants can manage assigned doctor clinic availabilities" ON public.availabilities
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles assistant_profile
    JOIN public.clinics c ON c.doctor_id = assistant_profile.assigned_doctor_id
    WHERE assistant_profile.user_id = auth.uid()
    AND assistant_profile.role = 'assistant'
    AND c.id = availabilities.clinic_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles assistant_profile
    JOIN public.clinics c ON c.doctor_id = assistant_profile.assigned_doctor_id
    WHERE assistant_profile.user_id = auth.uid()
    AND assistant_profile.role = 'assistant'
    AND c.id = availabilities.clinic_id
  )
);

-- Política para que los admins puedan gestionar todas las disponibilidades
CREATE POLICY "Admins can manage all availabilities" ON public.availabilities
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Política para permitir lectura pública de disponibilidades (para que los pacientes puedan ver horarios)
CREATE POLICY "Public can view active availabilities" ON public.availabilities
FOR SELECT USING (is_active = true);