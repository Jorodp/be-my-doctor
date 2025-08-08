-- 1) Ensure enum has value 'no_show'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'appointment_status' AND e.enumlabel = 'no_show'
  ) THEN
    ALTER TYPE appointment_status ADD VALUE 'no_show';
  END IF;
END $$;

-- 2) Auto-mark no_show function for assistants/doctors
CREATE OR REPLACE FUNCTION public.auto_mark_no_show(
  p_doctor_user_id uuid,
  p_now timestamptz DEFAULT now()
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_updated int := 0;
BEGIN
  UPDATE appointments.appointments a
  SET status = 'no_show'::appointment_status,
      updated_at = p_now,
      notes = COALESCE(a.notes||E'\n\n','') || '[Marcado no_show automático el '||p_now::text||']'
  WHERE a.doctor_user_id = p_doctor_user_id
    AND a.status = 'scheduled'::appointment_status
    AND a.starts_at < (p_now - interval '15 minutes')
    AND a.patient_arrived_at IS NULL
    AND (a.consultation_started_at IS NULL);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated;
END;$$;

GRANT EXECUTE ON FUNCTION public.auto_mark_no_show(uuid, timestamptz) TO authenticated;