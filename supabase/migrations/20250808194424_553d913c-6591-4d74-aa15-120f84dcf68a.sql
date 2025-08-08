-- Fix migration: drop conflicting function before recreate
DROP FUNCTION IF EXISTS public.mark_patient_arrived(uuid, uuid);

-- Recreate mark_patient_arrived with desired signature
CREATE OR REPLACE FUNCTION public.mark_patient_arrived(
  p_appointment_id uuid,
  p_actor_user_id uuid
) RETURNS TABLE(
  id uuid,
  patient_arrived_at timestamptz
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE appointments.appointments a
  SET 
    patient_arrived_at = COALESCE(a.patient_arrived_at, now()),
    updated_at         = now()
  WHERE a.id = p_appointment_id
  RETURNING a.id, a.patient_arrived_at
  INTO id, patient_arrived_at;

  PERFORM public.log_event(
    p_actor_user_id := p_actor_user_id,
    p_action        := 'appointment.patient_arrived',
    p_entity_table  := 'appointments.appointments',
    p_entity_id     := id
  );

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_patient_arrived(uuid, uuid) TO authenticated;

-- Ensure verify_patient_identity exists (idempotent)
CREATE OR REPLACE FUNCTION public.verify_patient_identity(
  p_appointment_id uuid,
  p_actor_user_id uuid
) RETURNS TABLE(
  id uuid,
  identity_validated boolean,
  identity_validated_at timestamptz,
  identity_validated_by uuid
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE appointments.appointments a
  SET 
    identity_validated    = true,
    identity_validated_at = now(),
    identity_validated_by = p_actor_user_id,
    updated_at            = now()
  WHERE a.id = p_appointment_id
  RETURNING a.id, a.identity_validated, a.identity_validated_at, a.identity_validated_by
  INTO id, identity_validated, identity_validated_at, identity_validated_by;

  PERFORM public.log_event(
    p_actor_user_id := p_actor_user_id,
    p_action        := 'appointment.identity_validated',
    p_entity_table  := 'appointments.appointments',
    p_entity_id     := id
  );

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_patient_identity(uuid, uuid) TO authenticated;