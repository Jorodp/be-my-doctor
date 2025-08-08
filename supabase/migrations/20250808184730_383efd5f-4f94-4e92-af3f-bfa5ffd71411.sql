create or replace function public.book_slot_v2(
  p_doctor_internal_id uuid,
  p_clinic_id uuid,
  p_slot_start timestamptz,
  p_patient_user_id uuid,
  p_created_by uuid,
  p_notes text default null
)
returns table(
  out_appointment_id uuid,
  out_starts_at timestamptz,
  out_ends_at timestamptz,
  out_status text
)
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_doctor_user_id uuid;
  v_slot_end       timestamptz;
  v_has_base       boolean := false;
  v_has_extra      boolean := false;
  v_is_blocked     boolean := false;
  v_target_clinic_id uuid;
  v_pub_name       text;
  v_pub_address    text;
begin
  -- Resolve doctor user id from internal profile id
  select user_id into v_doctor_user_id
  from public.profiles
  where id = p_doctor_internal_id;
  if v_doctor_user_id is null then
    raise exception 'Doctor (profiles.id=%) no encontrado', p_doctor_internal_id;
  end if;

  -- Compute end time (60 min)
  v_slot_end := p_slot_start + interval '60 minutes';

  -- Block past slots
  if p_slot_start < now() then
    raise exception 'No se puede agendar en el pasado';
  end if;

  -- Try to resolve a clinic id in clinic_management
  select id into v_target_clinic_id
  from clinic_management.clinics
  where id = p_clinic_id
  limit 1;

  if v_target_clinic_id is null then
    -- Try to map by name/address from public.clinics
    select name, address into v_pub_name, v_pub_address
    from public.clinics
    where id = p_clinic_id;

    if v_pub_name is not null or v_pub_address is not null then
      select c.id into v_target_clinic_id
      from clinic_management.clinics c
      where c.doctor_id = p_doctor_internal_id
        and (
          c.name = v_pub_name
          or (v_pub_address is not null and c.address = v_pub_address)
        )
      limit 1;
    end if;
  end if;

  -- Validate ownership: prefer clinic_management if found, else fallback to public.clinics
  if v_target_clinic_id is not null then
    if not exists (
      select 1 from clinic_management.clinics c
      where c.id = v_target_clinic_id and c.doctor_id = p_doctor_internal_id
    ) then
      raise exception 'La clínica % no pertenece al doctor %', v_target_clinic_id, p_doctor_internal_id;
    end if;
  else
    -- Fallback to public.clinics ownership check
    if not exists (
      select 1 from public.clinics c
      where c.id = p_clinic_id and c.doctor_id = p_doctor_internal_id
    ) then
      raise exception 'La clínica % no pertenece al doctor %', p_clinic_id, p_doctor_internal_id;
    end if;
  end if;

  -- Base availability (usar public.availabilities con el id público)
  with day_info as (
    select p_slot_start::date as day,
           case when extract(dow from p_slot_start)::int = 0 then 6 else extract(dow from p_slot_start)::int - 1 end as internal_weekday
  )
  select true into v_has_base
  from public.availabilities a
  join day_info d on a.clinic_id = p_clinic_id
                 and a.weekday = d.internal_weekday
                 and a.is_active = true
  where (d.day + a.start_time) <= p_slot_start
    and (d.day + a.end_time)  >= v_slot_end
    and a.slot_duration_minutes = 60
  limit 1;

  -- Extra/blocked exceptions (public)
  select true into v_has_extra
  from public.availability_exceptions e
  where e.clinic_id = p_clinic_id
    and e.type = 'extra'
    and e.date = p_slot_start::date
    and (e.date + e.start_time) <= p_slot_start
    and (e.date + e.end_time)  >= v_slot_end
  limit 1;

  select true into v_is_blocked
  from public.availability_exceptions b
  where b.clinic_id = p_clinic_id
    and b.type = 'block'
    and p_slot_start >= (b.date + b.start_time)
    and p_slot_start <  (b.date + b.end_time)
  limit 1;

  if v_is_blocked then
    raise exception 'Slot bloqueado por excepción';
  end if;

  if not v_has_base and not v_has_extra then
    raise exception 'Slot fuera de disponibilidad (ni base ni extra)';
  end if;

  -- Use target clinic id if resolved; otherwise use the public clinic id as fallback
  v_target_clinic_id := coalesce(v_target_clinic_id, p_clinic_id);

  -- Conflict check
  if exists (
    select 1 from appointments.appointments ap
    where ap.doctor_user_id = v_doctor_user_id
      and ap.clinic_id = v_target_clinic_id
      and ap.starts_at = p_slot_start
      and ap.status in ('scheduled','completed')
  ) then
    raise exception 'Slot ya ocupado';
  end if;

  -- Insert appointment
  insert into appointments.appointments (
    id, clinic_id, doctor_user_id, patient_user_id,
    starts_at, ends_at, status, price, notes, created_by
  )
  values (
    gen_random_uuid(),
    v_target_clinic_id,
    v_doctor_user_id,
    p_patient_user_id,
    p_slot_start,
    v_slot_end,
    'scheduled',
    0,
    p_notes,
    p_created_by
  )
  returning id, starts_at, ends_at, status
  into out_appointment_id, out_starts_at, out_ends_at, out_status;

  perform public.log_event(
    p_actor_user_id := p_created_by,
    p_action        := 'appointment.booked',
    p_entity_table  := 'appointments.appointments',
    p_entity_id     := out_appointment_id,
    p_related_id    := p_patient_user_id,
    p_metadata      := jsonb_build_object(
      'starts_at', out_starts_at,
      'ends_at', out_ends_at,
      'clinic_id', v_target_clinic_id,
      'doctor_internal_id', p_doctor_internal_id
    )
  );

  return;
end;
$$;