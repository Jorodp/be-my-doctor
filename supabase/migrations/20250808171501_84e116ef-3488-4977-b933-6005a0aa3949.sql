-- Create scheduling tables used by the app

-- 1) public.availabilities (base weekly availability per clinic)
CREATE TABLE IF NOT EXISTS public.availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Lunes, 6=Domingo (formato interno)
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  slot_duration_minutes integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_availabilities_clinic ON public.availabilities(clinic_id);
CREATE INDEX IF NOT EXISTS idx_availabilities_weekday ON public.availabilities(weekday);

-- Trigger to maintain updated_at
DO $$ BEGIN
  CREATE TRIGGER tr_availabilities_updated_at
  BEFORE UPDATE ON public.availabilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN others THEN NULL; END $$;

-- Enable RLS
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;

-- Policies: Admin full access
DO $$ BEGIN
  CREATE POLICY availabilities_admin_all
  ON public.availabilities
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
EXCEPTION WHEN others THEN NULL; END $$;

-- Policies: Doctors manage availability for their clinics
DO $$ BEGIN
  CREATE POLICY availabilities_doctor_manage
  ON public.availabilities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      JOIN public.profiles p ON p.id = c.doctor_id
      WHERE c.id = availabilities.clinic_id
        AND p.user_id = auth.uid()
        AND p.role = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      JOIN public.profiles p ON p.id = c.doctor_id
      WHERE c.id = availabilities.clinic_id
        AND p.user_id = auth.uid()
        AND p.role = 'doctor'
    )
  );
EXCEPTION WHEN others THEN NULL; END $$;

-- Policies: Assistants of a clinic's doctor can view and manage availability
DO $$ BEGIN
  CREATE POLICY availabilities_assistant_select
  ON public.availabilities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      JOIN public.profiles dp ON dp.id = c.doctor_id
      JOIN public.profiles ap ON ap.user_id = auth.uid() AND ap.role = 'assistant'
      JOIN public.clinic_assistants ca ON ca.clinic_id = c.id AND ca.assistant_id = ap.id
      WHERE c.id = availabilities.clinic_id
    )
  );
EXCEPTION WHEN others THEN NULL; END $$;

-- 2) public.availability_exceptions (extra/bloqueos por fecha)
CREATE TABLE IF NOT EXISTS public.availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  type text NOT NULL, -- 'extra' | 'block'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avail_ex_clinic_date ON public.availability_exceptions(clinic_id, date);

DO $$ BEGIN
  CREATE TRIGGER tr_availability_exceptions_updated_at
  BEFORE UPDATE ON public.availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY availability_exceptions_admin_all
  ON public.availability_exceptions
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY availability_exceptions_doctor_manage
  ON public.availability_exceptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      JOIN public.profiles p ON p.id = c.doctor_id
      WHERE c.id = availability_exceptions.clinic_id
        AND p.user_id = auth.uid()
        AND p.role = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      JOIN public.profiles p ON p.id = c.doctor_id
      WHERE c.id = availability_exceptions.clinic_id
        AND p.user_id = auth.uid()
        AND p.role = 'doctor'
    )
  );
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY availability_exceptions_assistant_select
  ON public.availability_exceptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      JOIN public.profiles dp ON dp.id = c.doctor_id
      JOIN public.profiles ap ON ap.user_id = auth.uid() AND ap.role = 'assistant'
      JOIN public.clinic_assistants ca ON ca.clinic_id = c.id AND ca.assistant_id = ap.id
      WHERE c.id = availability_exceptions.clinic_id
    )
  );
EXCEPTION WHEN others THEN NULL; END $$;

-- Done