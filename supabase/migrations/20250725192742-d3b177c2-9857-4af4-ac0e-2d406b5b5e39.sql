-- Limpiar datos duplicados y corregir asignaciones

-- 1. Eliminar la asignación a la clínica duplicada (la más reciente)
DELETE FROM public.clinic_assistants 
WHERE clinic_id = '9ce9cc1d-52c1-409b-b27f-e3b40d958b28';

-- 2. Eliminar la clínica duplicada
DELETE FROM public.clinics 
WHERE id = '9ce9cc1d-52c1-409b-b27f-e3b40d958b28';

-- 3. Verificar que el asistente solo esté asignado a la clínica correcta
-- (Ya debería estar correcto, pero lo verificamos)
INSERT INTO public.clinic_assistants (clinic_id, assistant_id)
SELECT 
  '31aec1e7-c050-45f4-995c-402b9db9d448',
  '818caa9d-8e40-4839-b79e-806df357e16b'
WHERE NOT EXISTS (
  SELECT 1 FROM public.clinic_assistants 
  WHERE clinic_id = '31aec1e7-c050-45f4-995c-402b9db9d448' 
  AND assistant_id = '818caa9d-8e40-4839-b79e-806df357e16b'
);