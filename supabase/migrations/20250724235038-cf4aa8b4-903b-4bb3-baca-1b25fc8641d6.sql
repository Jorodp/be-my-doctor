-- Arreglar política RLS para permitir inserción anónima en doctor_registration_requests
DROP POLICY IF EXISTS "Anyone can create registration requests" ON public.doctor_registration_requests;

CREATE POLICY "Allow anonymous registration requests"
ON public.doctor_registration_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);