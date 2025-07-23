-- supabase/migrations/20250729_enable_rls_on_doctor_and_profiles.sql

-- 1) doctor_profiles: habilita RLS y permite SELECT a pacientes autenticados
ALTER TABLE public.doctor_profiles
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_doctor_profiles ON public.doctor_profiles;
CREATE POLICY select_doctor_profiles
  ON public.doctor_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) profiles: habilita RLS y permite SELECT a pacientes autenticados
ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_profiles ON public.profiles;
CREATE POLICY select_profiles
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
