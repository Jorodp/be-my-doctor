-- Fix permission checks: remove reference to non-existent public.doctor_assistants
CREATE OR REPLACE FUNCTION public.assistant_reschedule_appointment(
  p_appointment_id uuid,
  p_new_starts_at timestamptz,
  p_actor_user_id uuid,
  p_reason text DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  status text
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_assistant_id uuid;
  v_doctor_user_id uuid;
  v_clinic_id uuid;
  v_new_ends_at timestamptz;
  v_slot_conflict boolean;
BEGIN
  SELECT id INTO v_assistant_id
  FROM public.profiles
  WHERE user_id = p_actor_user_id AND role = 'assistant'
  LIMIT 1;
  IF v_assistant_id IS NULL THEN
    RAISE EXCEPTION 'Solo asistentes pueden realizar esta acción';
  END IF;

  SELECT a.doctor_user_id, a.clinic_id
  INTO v_doctor_user_id, v_clinic_id
  FROM appointments.appointments a
  WHERE a.id = p_appointment_id
  FOR UPDATE;
  IF v_doctor_user_id IS NULL THEN
    RAISE EXCEPTION 'Cita no encontrada';
  END IF;

  -- Permission only via clinic assignment
  IF NOT EXISTS (
    SELECT 1
    FROM public.clinic_assistants ca
    WHERE ca.assistant_id = v_assistant_id AND ca.clinic_id = v_clinic_id
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para modificar esta cita';
  END IF;

  IF p_new_starts_at < now() THEN
    RAISE EXCEPTION 'No se puede reprogramar al pasado';
  END IF;

  v_new_ends_at := p_new_starts_at + interval '60 minutes';

  SELECT EXISTS (
    SELECT 1 FROM appointments.appointments ap
    WHERE ap.doctor_user_id = v_doctor_user_id
      AND ap.clinic_id = v_clinic_id
      AND ap.id <> p_appointment_id
      AND ap.status IN ('scheduled','completed')
      AND p_new_starts_at < ap.ends_at
      AND v_new_ends_at  > ap.starts_at
  ) INTO v_slot_conflict;

  IF v_slot_conflict THEN
    RAISE EXCEPTION 'El horario seleccionado está ocupado';
  END IF;

  UPDATE appointments.appointments ap
  SET 
    starts_at = p_new_starts_at,
    ends_at   = v_new_ends_at,
    notes     = COALESCE(ap.notes||E'\n\n','') ||
                COALESCE('[Reprogramado por asistente '||p_actor_user_id::text||
                         ' el '||now()::text||
                         CASE WHEN p_reason IS NOT NULL AND length(btrim(p_reason))>0 THEN ' | Motivo: '||p_reason ELSE '' END
                         ||']', ''),
    updated_at = now()
  WHERE ap.id = p_appointment_id
  RETURNING ap.id, ap.starts_at, ap.ends_at, ap.status
  INTO id, starts_at, ends_at, status;

  PERFORM public.log_event(
    p_actor_user_id := p_actor_user_id,
    p_action        := 'appointment.rescheduled',
    p_entity_table  := 'appointments.appointments',
    p_entity_id     := id,
    p_metadata      := jsonb_build_object('starts_at', starts_at, 'ends_at', ends_at, 'reason', p_reason)
  );

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assistant_reschedule_appointment(uuid, timestamptz, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assistant_cancel_appointment(
  p_appointment_id uuid,
  p_actor_user_id uuid,
  p_reason text
) RETURNS TABLE(
  id uuid,
  status text,
  notes text
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_assistant_id uuid;
  v_doctor_user_id uuid;
  v_clinic_id uuid;
BEGIN
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Motivo de cancelación requerido';
  END IF;

  SELECT id INTO v_assistant_id
  FROM public.profiles
  WHERE user_id = p_actor_user_id AND role = 'assistant'
  LIMIT 1;
  IF v_assistant_id IS NULL THEN
    RAISE EXCEPTION 'Solo asistentes pueden realizar esta acción';
  END IF;

  SELECT a.doctor_user_id, a.clinic_id
  INTO v_doctor_user_id, v_clinic_id
  FROM appointments.appointments a
  WHERE a.id = p_appointment_id
  FOR UPDATE;
  IF v_doctor_user_id IS NULL THEN
    RAISE EXCEPTION 'Cita no encontrada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clinic_assistants ca
    WHERE ca.assistant_id = v_assistant_id AND ca.clinic_id = v_clinic_id
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para cancelar esta cita';
  END IF;

  UPDATE appointments.appointments ap
  SET 
    status = 'cancelled',
    notes  = COALESCE(ap.notes||E'\n\n','') || '[Cancelado por asistente '||p_actor_user_id::text||' el '||now()::text||' | Motivo: '||p_reason||']',
    updated_at = now()
  WHERE ap.id = p_appointment_id
  RETURNING ap.id, ap.status::text, ap.notes
  INTO id, status, notes;

  PERFORM public.log_event(
    p_actor_user_id := p_actor_user_id,
    p_action        := 'appointment.cancelled',
    p_entity_table  := 'appointments.appointments',
    p_entity_id     := id,
    p_metadata      := jsonb_build_object('reason', p_reason)
  );

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assistant_cancel_appointment(uuid, uuid, text) TO authenticated;