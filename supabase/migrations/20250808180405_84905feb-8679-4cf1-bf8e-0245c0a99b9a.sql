-- Point appointments.appointments.clinic_id FK to public.clinics(id)
ALTER TABLE IF EXISTS appointments.appointments
  DROP CONSTRAINT IF EXISTS appointments_clinic_id_fkey;

ALTER TABLE appointments.appointments
  ADD CONSTRAINT appointments_clinic_id_fkey
  FOREIGN KEY (clinic_id)
  REFERENCES public.clinics(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;