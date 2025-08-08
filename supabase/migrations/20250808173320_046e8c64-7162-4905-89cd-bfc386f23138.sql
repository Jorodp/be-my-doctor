-- Fix book_slot to use the correct schema for appointments (appointments.appointments)
CREATE OR REPLACE FUNCTION public.book_slot(
  p_doctor_internal_id uuid,
  p_clinic_id uuid,
  p_slot_start timestamp with time zone,
  p_patient_user_id uuid,
  p_created_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  out_appointment_id uuid,
  out_starts_at timestamp with time zone,
  out_ends_at timestamp with time zone,
  out_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_doctor_user_id uuid;
  v_slot_end timestamptz;
  v_min_lead int;
  v_has_base boolean := false;
  v_has_extra boolean := false;
  v_is_blocked boolean := false;
BEGIN
  -- 1. Map internal profile id to auth user id
  SELECT user_id INTO v_doctor_user_id
  FROM public.profiles
  WHERE id = p_doctor_internal_id;
  IF v_doctor_user_id IS NULL THEN
    RAISE EXCEPTION 'Doctor (profiles.id=%) no encontrado', p_doctor_internal_id;
  END IF;

  -- 2. Lead time
  SELECT COALESCE(min_lead_time_hours, 2) INTO v_min_lead
  FROM public.doctor_profiles
  WHERE user_id = v_doctor_user_id;

  -- 3. Compute end time (fixed 60 minutes for now)
  v_slot_end := p_slot_start + interval '60 minutes';

  -- 4. Lead time validation
  IF p_slot_start < (now() AT TIME ZONE 'UTC') + (v_min_lead || ' hours')::interval THEN
    RAISE EXCEPTION 'Slot inicia demasiado pronto (lead time % horas)', v_min_lead;
  END IF;

  -- 5. Clinic belongs to doctor
  IF NOT EXISTS (
    SELECT 1 FROM public.clinics c
    WHERE c.id = p_clinic_id AND c.doctor_id = p_doctor_internal_id
  ) THEN
    RAISE EXCEPTION 'La clínica % no pertenece al doctor %', p_clinic_id, p_doctor_internal_id;
  END IF;

  -- 6. Base availability check (weekday 0=Mon .. 6=Sun)
  WITH day_info AS (
    SELECT p_slot_start::date AS day,
           CASE WHEN EXTRACT(DOW FROM p_slot_start)::int = 0 THEN 6 ELSE EXTRACT(DOW FROM p_slot_start)::int - 1 END AS internal_weekday
  )
  SELECT TRUE INTO v_has_base
  FROM public.availabilities a
  JOIN day_info d ON a.clinic_id = p_clinic_id
                 AND a.weekday = d.internal_weekday
                 AND a.is_active = true
  WHERE (d.day + a.start_time) <= p_slot_start
    AND (d.day + a.end_time)  >= v_slot_end
    AND a.slot_duration_minutes = 60
  LIMIT 1;

  -- 7. Extra availability
  SELECT TRUE INTO v_has_extra
  FROM public.availability_exceptions e
  WHERE e.clinic_id = p_clinic_id
    AND e.type = 'extra'
    AND e.date = p_slot_start::date
    AND (e.date + e.start_time) <= p_slot_start
    AND (e.date + e.end_time)  >= v_slot_end
  LIMIT 1;

  -- 8. Blocked by exception
  SELECT TRUE INTO v_is_blocked
  FROM public.availability_exceptions b
  WHERE b.clinic_id = p_clinic_id
    AND b.type = 'block'
    AND p_slot_start >= (b.date + b.start_time)
    AND p_slot_start <  (b.date + b.end_time)
  LIMIT 1;

  IF v_is_blocked THEN
    RAISE EXCEPTION 'Slot bloqueado por excepción';
  END IF;

  -- 9. Must have base or extra availability
  IF NOT v_has_base AND NOT v_has_extra THEN
    RAISE EXCEPTION 'Slot fuera de disponibilidad (ni base ni extra)';
  END IF;

  -- 10. Conflicts in appointments schema
  IF EXISTS (
    SELECT 1 FROM appointments.appointments ap
    WHERE ap.doctor_user_id = v_doctor_user_id
      AND ap.clinic_id = p_clinic_id
      AND ap.starts_at = p_slot_start
      AND ap.status IN ('scheduled','completed')
  ) THEN
    RAISE EXCEPTION 'Slot ya ocupado';
  END IF;

  -- 11. Insert appointment in appointments schema
  INSERT INTO appointments.appointments (
    id, clinic_id, doctor_user_id, patient_user_id,
    starts_at, ends_at, status, price, notes, created_by, consultation_status,
    created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_clinic_id,
    v_doctor_user_id,
    p_patient_user_id,
    p_slot_start,
    v_slot_end,
    'scheduled',
    0,
    p_notes,
    p_created_by,
    'scheduled',
    now(),
    now()
  )
  RETURNING id, starts_at, ends_at, status
  INTO out_appointment_id, out_starts_at, out_ends_at, out_status;

  -- 12. Audit log
  PERFORM public.log_event(
    p_actor_user_id := p_created_by,
    p_action        := 'appointment.booked',
    p_entity_table  := 'appointments',
    p_entity_id     := out_appointment_id,
    p_related_id    := p_patient_user_id,
    p_metadata      := jsonb_build_object(
      'starts_at', out_starts_at,
      'ends_at', out_ends_at,
      'clinic_id', p_clinic_id,
      'doctor_internal_id', p_doctor_internal_id
    )
  );

  RETURN;
END;
$function$;