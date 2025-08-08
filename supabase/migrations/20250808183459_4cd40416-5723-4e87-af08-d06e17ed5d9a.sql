-- 1) Vista proxy en schema public para exponer /rest/v1/appointments
create or replace view public.appointments as
  select a.*
  from appointments.appointments a;

comment on view public.appointments is 'Updatable proxy view to appointments.appointments exposed via PostgREST /rest/v1/appointments';

-- 2) Asegurar RLS habilitado en la tabla real
alter table if exists appointments.appointments enable row level security;

-- 3) Políticas mínimas (seguras) para usuarios autenticados
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'appointments'
      AND tablename  = 'appointments'
      AND policyname = 'appointments_select_participants'
  ) THEN
    CREATE POLICY "appointments_select_participants"
    ON appointments.appointments
    FOR SELECT
    USING (
      auth.role() = 'service_role'
      OR public.is_admin_user()
      OR patient_user_id = auth.uid()
      OR doctor_user_id  = auth.uid()
    );
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'appointments'
      AND tablename  = 'appointments'
      AND policyname = 'appointments_insert_patient'
  ) THEN
    CREATE POLICY "appointments_insert_patient"
    ON appointments.appointments
    FOR INSERT
    WITH CHECK (
      auth.role() = 'service_role'
      OR public.is_admin_user()
      OR patient_user_id = auth.uid()
    );
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'appointments'
      AND tablename  = 'appointments'
      AND policyname = 'appointments_update_participants'
  ) THEN
    CREATE POLICY "appointments_update_participants"
    ON appointments.appointments
    FOR UPDATE
    USING (
      auth.role() = 'service_role'
      OR public.is_admin_user()
      OR patient_user_id = auth.uid()
      OR doctor_user_id  = auth.uid()
    )
    WITH CHECK (
      auth.role() = 'service_role'
      OR public.is_admin_user()
      OR patient_user_id = auth.uid()
      OR doctor_user_id  = auth.uid()
    );
  END IF;

  -- DELETE (opcional)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'appointments'
      AND tablename  = 'appointments'
      AND policyname = 'appointments_delete_patient'
  ) THEN
    CREATE POLICY "appointments_delete_patient"
    ON appointments.appointments
    FOR DELETE
    USING (
      auth.role() = 'service_role'
      OR public.is_admin_user()
      OR patient_user_id = auth.uid()
    );
  END IF;
END$$;

-- 4) Concesión de permisos base (RLS sigue aplicando)
GRANT USAGE ON SCHEMA appointments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments.appointments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO anon, authenticated;