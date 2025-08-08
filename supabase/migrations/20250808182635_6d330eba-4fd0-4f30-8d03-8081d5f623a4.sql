-- Fix functions referencing public.appointments to appointments.appointments

-- 1) get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Obtener conversación existente
    SELECT id INTO v_conversation_id 
    FROM conversations 
    WHERE appointment_id = p_appointment_id;
    
    -- Si no existe, crear una nueva
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (appointment_id, created_at) 
        VALUES (p_appointment_id, NOW()) 
        RETURNING id INTO v_conversation_id;
        
        -- Participante doctor
        INSERT INTO conversation_participants (conversation_id, user_id, role)
        SELECT v_conversation_id, a.doctor_user_id, 'doctor'
        FROM appointments.appointments a 
        WHERE a.id = p_appointment_id;
        
        -- Participante paciente
        INSERT INTO conversation_participants (conversation_id, user_id, role)
        SELECT v_conversation_id, a.patient_user_id, 'patient'
        FROM appointments.appointments a 
        WHERE a.id = p_appointment_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$;

-- 2) patient_get_appointments
CREATE OR REPLACE FUNCTION public.patient_get_appointments(p_patient_user_id uuid)
RETURNS TABLE(
  appointment_id uuid,
  doctor_user_id uuid,
  doctor_name text,
  doctor_specialty text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  notes text,
  price numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
    SELECT a.id,
           a.doctor_user_id,
           p.full_name       AS doctor_name,
           dp.specialty      AS doctor_specialty,
           a.starts_at,
           a.ends_at,
           a.consultation_status::text AS status,
           a.notes,
           a.price
    FROM appointments.appointments a
    JOIN profiles p ON p.user_id = a.doctor_user_id
    JOIN doctor_profiles dp ON dp.user_id = a.doctor_user_id
    WHERE a.patient_user_id = p_patient_user_id
    ORDER BY a.starts_at DESC;
END;
$$;

-- 3) patient_get_appointment_detail (depends on patient_get_appointments)
CREATE OR REPLACE FUNCTION public.patient_get_appointment_detail(p_patient_user_id uuid, p_app_id uuid)
RETURNS TABLE(
  appointment_id uuid,
  doctor_user_id uuid,
  doctor_name text,
  doctor_specialty text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  notes text,
  price numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
    SELECT
      pa.appointment_id,
      pa.doctor_user_id,
      pa.doctor_name,
      pa.doctor_specialty,
      pa.starts_at,
      pa.ends_at,
      pa.status,
      pa.notes,
      pa.price
    FROM public.patient_get_appointments(p_patient_user_id) AS pa
    WHERE pa.appointment_id = p_app_id;
END;
$$;

-- 4) complete_consultation (use appointments schema explicitly)
CREATE OR REPLACE FUNCTION public.complete_consultation(p_appointment_id uuid, p_actor_user_id uuid)
RETURNS TABLE(
  id uuid,
  consultation_status text,
  consultation_ended_at timestamptz,
  consultation_duration_minutes integer,
  total_clinic_time_minutes integer
)
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_status  text;
  v_cons    text;
  v_started timestamptz;
  v_arrived timestamptz;
BEGIN
  SELECT a.status,
         a.consultation_status,
         a.consultation_started_at,
         a.patient_arrived_at
  INTO  v_status, v_cons, v_started, v_arrived
  FROM appointments.appointments a
  WHERE a.id = p_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment no existe';
  END IF;

  IF v_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cita cancelada; no se puede completar';
  END IF;

  IF v_cons = 'completed' THEN
    RETURN QUERY
      SELECT a.id,
             a.consultation_status,
             a.consultation_ended_at,
             a.consultation_duration_minutes,
             a.total_clinic_time_minutes
      FROM appointments.appointments a
      WHERE a.id = p_appointment_id;
    RETURN;
  END IF;

  IF v_cons <> 'in_progress' THEN
    RAISE EXCEPTION 'Estado actual % no permite completar (esperado in_progress)', v_cons;
  END IF;

  UPDATE appointments.appointments ap
  SET consultation_status = 'completed',
      status = 'completed',
      consultation_ended_at = now(),
      consultation_ended_by = p_actor_user_id,
      consultation_duration_minutes =
        CASE
          WHEN ap.consultation_started_at IS NOT NULL
          THEN CEIL(EXTRACT(EPOCH FROM (now() - ap.consultation_started_at))/60)::int
          ELSE NULL
        END,
      total_clinic_time_minutes =
        CASE
          WHEN ap.patient_arrived_at IS NOT NULL
          THEN CEIL(EXTRACT(EPOCH FROM (now() - ap.patient_arrived_at))/60)::int
          ELSE NULL
        END,
      updated_at = now()
  WHERE ap.id = p_appointment_id
  RETURNING ap.id,
            ap.consultation_status,
            ap.consultation_ended_at,
            ap.consultation_duration_minutes,
            ap.total_clinic_time_minutes
  INTO id, consultation_status, consultation_ended_at,
       consultation_duration_minutes, total_clinic_time_minutes;

  PERFORM public.log_event(
    p_actor_user_id := p_actor_user_id,
    p_action        := 'consultation.completed',
    p_entity_table  := 'appointments.appointments',
    p_entity_id     := id,
    p_metadata      := jsonb_build_object(
      'ended_at', consultation_ended_at,
      'consultation_duration_minutes', consultation_duration_minutes,
      'total_clinic_time_minutes', total_clinic_time_minutes
    )
  );

  RETURN;
END;
$$;

-- 5) refresh_doctor_public_stats (replace references)
CREATE OR REPLACE FUNCTION public.refresh_doctor_public_stats(p_doctor_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_rating_avg numeric;
  v_rating_count int;
  v_completed_90d int;
  v_unique_patients_90d int;
  v_last_completed timestamptz;
  v_recency_factor numeric := 0;
  v_score numeric;
BEGIN
  -- Ratings
  SELECT
    COALESCE(AVG(rating)::numeric, 0),
    COUNT(*)
  INTO v_rating_avg, v_rating_count
  FROM public.doctor_ratings
  WHERE doctor_user_id = p_doctor_user_id;

  -- Completed appointments últimos 90 días
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE status='completed'),0),
    COALESCE(COUNT(DISTINCT patient_user_id) FILTER (WHERE status='completed'),0),
    MAX(CASE WHEN status='completed' THEN ends_at END)
  INTO v_completed_90d, v_unique_patients_90d, v_last_completed
  FROM appointments.appointments
  WHERE doctor_user_id = p_doctor_user_id
    AND starts_at >= (now() - interval '90 days');

  -- Recency factor
  IF v_last_completed IS NOT NULL THEN
    IF v_last_completed >= now() - interval '30 days' THEN
      v_recency_factor := 1;
    ELSIF v_last_completed >= now() - interval '60 days' THEN
      v_recency_factor := 0.5;
    ELSIF v_last_completed >= now() - interval '90 days' THEN
      v_recency_factor := 0.2;
    END IF;
  END IF;

  -- Score
  v_score :=
      (CASE WHEN v_rating_avg IS NULL THEN 0 ELSE (v_rating_avg/5.0)*60 END)
    + (LOG(10, v_rating_count + 1) * 10)
    + (LOG(10, v_unique_patients_90d + 1) * 10)
    + (v_recency_factor * 10);

  INSERT INTO public.doctor_public_stats (
    doctor_user_id,
    rating_avg,
    rating_count,
    completed_appointments_90d,
    unique_patients_90d,
    last_completed_at,
    score,
    updated_at
  )
  VALUES (
    p_doctor_user_id,
    v_rating_avg,
    v_rating_count,
    v_completed_90d,
    v_unique_patients_90d,
    v_last_completed,
    v_score,
    now()
  )
  ON CONFLICT (doctor_user_id) DO UPDATE
  SET rating_avg = EXCLUDED.rating_avg,
      rating_count = EXCLUDED.rating_count,
      completed_appointments_90d = EXCLUDED.completed_appointments_90d,
      unique_patients_90d = EXCLUDED.unique_patients_90d,
      last_completed_at = EXCLUDED.last_completed_at,
      score = EXCLUDED.score,
      updated_at = now();
END;
$$;