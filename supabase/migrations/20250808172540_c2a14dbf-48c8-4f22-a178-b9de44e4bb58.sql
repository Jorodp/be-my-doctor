-- Open read access for patients to view clinics and availabilities
-- 1) Clinics: allow SELECT for all authenticated/anonymous (public directory)
DO $$ BEGIN
  CREATE POLICY clinics_public_select
  ON public.clinics
  FOR SELECT
  USING (true);
EXCEPTION WHEN others THEN NULL; END $$;

-- 2) Availabilities: allow SELECT for everyone to see public schedules
DO $$ BEGIN
  CREATE POLICY availabilities_public_select
  ON public.availabilities
  FOR SELECT
  USING (true);
EXCEPTION WHEN others THEN NULL; END $$;

-- 3) Optionally expose availability_exceptions for visibility (read-only)
DO $$ BEGIN
  CREATE POLICY availability_exceptions_public_select
  ON public.availability_exceptions
  FOR SELECT
  USING (true);
EXCEPTION WHEN others THEN NULL; END $$;
