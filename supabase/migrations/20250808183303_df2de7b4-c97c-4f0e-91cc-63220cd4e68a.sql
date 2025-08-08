-- 1) Vista proxy en schema public para exponer /rest/v1/appointments sin tocar la config de PostgREST
create or replace view public.appointments as
  select a.*
  from appointments.appointments a;

comment on view public.appointments is 'Updatable proxy view to appointments.appointments exposed via PostgREST /rest/v1/appointments';

-- 2) Asegurar RLS habilitado en la tabla real
alter table if exists appointments.appointments enable row level security;

-- 3) Políticas mínimas (seguras) para usuarios autenticados
--    - Lectura: participantes (paciente o doctor) y admins
--    - Inserción: solo el paciente puede crear su propia cita (o admin / service_role)
--    - Actualización: participantes (paciente o doctor) y admins
--    - Borrado: paciente, admin (opcional)

do $$
begin
  -- SELECT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'appointments'
      and tablename  = 'appointments'
      and polname    = 'appointments_select_participants'
  ) then
    create policy "appointments_select_participants"
    on appointments.appointments
    for select
    using (
      auth.role() = 'service_role'
      or public.is_admin_user()
      or patient_user_id = auth.uid()
      or doctor_user_id  = auth.uid()
    );
  end if;

  -- INSERT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'appointments'
      and tablename  = 'appointments'
      and polname    = 'appointments_insert_patient'
  ) then
    create policy "appointments_insert_patient"
    on appointments.appointments
    for insert
    with check (
      auth.role() = 'service_role'
      or public.is_admin_user()
      or patient_user_id = auth.uid()
    );
  end if;

  -- UPDATE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'appointments'
      and tablename  = 'appointments'
      and polname    = 'appointments_update_participants'
  ) then
    create policy "appointments_update_participants"
    on appointments.appointments
    for update
    using (
      auth.role() = 'service_role'
      or public.is_admin_user()
      or patient_user_id = auth.uid()
      or doctor_user_id  = auth.uid()
    )
    with check (
      auth.role() = 'service_role'
      or public.is_admin_user()
      or patient_user_id = auth.uid()
      or doctor_user_id  = auth.uid()
    );
  end if;

  -- DELETE (opcional pero útil)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'appointments'
      and tablename  = 'appointments'
      and polname    = 'appointments_delete_patient'
  ) then
    create policy "appointments_delete_patient"
    on appointments.appointments
    for delete
    using (
      auth.role() = 'service_role'
      or public.is_admin_user()
      or patient_user_id = auth.uid()
    );
  end if;
end$$;

-- 4) Concesión de permisos base (RLS sigue aplicando)
grant usage on schema appointments to anon, authenticated;
grant select, insert, update, delete on appointments.appointments to anon, authenticated;
grant select, insert, update, delete on public.appointments to anon, authenticated;