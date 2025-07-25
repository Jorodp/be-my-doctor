-- Corregir la función mark_patient_arrived para resolver la ambigüedad en consultation_status
CREATE OR REPLACE FUNCTION public.mark_patient_arrived(p_appointment_id uuid, p_actor_user_id uuid)
 RETURNS TABLE(id uuid, consultation_status text, patient_arrived_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_status text;
  v_cons text;
  v_arrived timestamptz;
BEGIN
  SELECT a.status, a.consultation_status, a.patient_arrived_at
  INTO v_status, v_cons, v_arrived
  FROM public.appointments a
  WHERE a.id = p_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment no existe';
  END IF;

  IF v_status <> 'scheduled' THEN
    RAISE EXCEPTION 'No se puede marcar llegada: status=%', v_status;
  END IF;

  IF v_cons IN ('canceled','completed') THEN
    RAISE EXCEPTION 'No se puede marcar llegada: estado=%', v_cons;
  END IF;

  IF v_arrived IS NOT NULL THEN
    RETURN QUERY SELECT p_appointment_id, v_cons, v_arrived;
    RETURN;
  END IF;

  UPDATE public.appointments a
  SET consultation_status = 'arrived',
      patient_arrived_at = now(),
      marked_arrived_by = p_actor_user_id,
      updated_at = now()
  WHERE a.id = p_appointment_id
  RETURNING a.id, a.consultation_status, a.patient_arrived_at
  INTO id, consultation_status, patient_arrived_at;

  RETURN;
END;
$function$;