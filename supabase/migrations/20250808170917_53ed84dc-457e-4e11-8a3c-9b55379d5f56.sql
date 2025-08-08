-- Create required tables for clinics management to fix "relation public.clinics does not exist"
-- and align with frontend code using public.clinics and public.clinic_assistants

-- 1) public.clinics
CREATE TABLE IF NOT EXISTS public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  country text,
  consultation_fee numeric,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one primary clinic per doctor
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS ux_clinics_primary_per_doctor
  ON public.clinics(doctor_id)
  WHERE is_primary = true;
EXCEPTION WHEN others THEN NULL; END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_clinics_doctor_id ON public.clinics(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinics_city ON public.clinics(city);

-- Trigger to keep updated_at fresh
DO $$ BEGIN
  CREATE TRIGGER tr_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN others THEN NULL; END $$;

-- Enable RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Policies: Admin full access
DO $$ BEGIN
  CREATE POLICY clinics_admin_all
  ON public.clinics
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
EXCEPTION WHEN others THEN NULL; END $$;

-- Policies: Doctor manages own clinics (match profiles.id -> clinics.doctor_id by mapping user_id)
DO $$ BEGIN
  CREATE POLICY clinics_doctor_manage
  ON public.clinics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.id = clinics.doctor_id AND p.role = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.id = clinics.doctor_id AND p.role = 'doctor'
    )
  );
EXCEPTION WHEN others THEN NULL; END $$;

-- 2) public.clinic_assistants
CREATE TABLE IF NOT EXISTS public.clinic_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  assistant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, assistant_id)
);

-- Trigger to keep updated_at fresh
DO $$ BEGIN
  CREATE TRIGGER tr_clinic_assistants_updated_at
  BEFORE UPDATE ON public.clinic_assistants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN others THEN NULL; END $$;

-- Enable RLS
ALTER TABLE public.clinic_assistants ENABLE ROW LEVEL SECURITY;

-- Policies: Admin full access
DO $$ BEGIN
  CREATE POLICY clinic_assistants_admin_all
  ON public.clinic_assistants
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
EXCEPTION WHEN others THEN NULL; END $$;

-- Policies: Doctors can manage assistants for their clinics
DO $$ BEGIN
  CREATE POLICY clinic_assistants_doctor_manage
  ON public.clinic_assistants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      JOIN public.profiles p ON p.id = c.doctor_id
      WHERE c.id = clinic_assistants.clinic_id
        AND p.user_id = auth.uid()
        AND p.role = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      JOIN public.profiles p ON p.id = c.doctor_id
      WHERE c.id = clinic_assistants.clinic_id
        AND p.user_id = auth.uid()
        AND p.role = 'doctor'
    )
  );
EXCEPTION WHEN others THEN NULL; END $$;

-- Policies: Assistants can view their own clinic assignments
DO $$ BEGIN
  CREATE POLICY clinic_assistants_assistant_select
  ON public.clinic_assistants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles ap
      WHERE ap.user_id = auth.uid() AND ap.id = clinic_assistants.assistant_id AND ap.role = 'assistant'
    )
  );
EXCEPTION WHEN others THEN NULL; END $$;

-- 3) Provide compatibility view for functions referencing clinic_management.clinics
CREATE SCHEMA IF NOT EXISTS clinic_management;

CREATE OR REPLACE VIEW clinic_management.clinics AS
SELECT
  id,
  doctor_id,
  name,
  address,
  city,
  state,
  country,
  consultation_fee,
  is_primary,
  created_at,
  updated_at
FROM public.clinics;

-- Done