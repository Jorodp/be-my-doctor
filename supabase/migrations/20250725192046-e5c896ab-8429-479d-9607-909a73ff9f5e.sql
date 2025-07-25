-- Limpiar asignación legacy del asistente
-- Como ya tiene asignación específica por clínica, removemos la asignación general
UPDATE public.profiles 
SET assigned_doctor_id = NULL
WHERE id = '818caa9d-8e40-4839-b79e-806df357e16b' 
AND role = 'assistant';