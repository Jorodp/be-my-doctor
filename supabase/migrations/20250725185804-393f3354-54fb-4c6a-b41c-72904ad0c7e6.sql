-- Limpiar políticas RLS duplicadas y conflictivas para appointments
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors and assistants can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "admin_can_view_all_appointments" ON public.appointments;
DROP POLICY IF EXISTS "appt_select_self" ON public.appointments;
DROP POLICY IF EXISTS "appt_update_doctor" ON public.appointments;
DROP POLICY IF EXISTS "doctors_can_view_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "patients_can_view_own_appointments" ON public.appointments;

-- Crear políticas RLS simplificadas y claras para appointments
CREATE POLICY "appointments_select_policy" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    -- Admin puede ver todas las citas
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Doctor puede ver sus propias citas
    doctor_user_id = auth.uid() OR
    -- Paciente puede ver sus propias citas
    patient_user_id = auth.uid() OR
    -- Asistente puede ver citas del doctor asignado
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'assistant' 
      AND assigned_doctor_id = appointments.doctor_user_id
    )
  );

CREATE POLICY "appointments_insert_policy" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Admin puede crear cualquier cita
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Doctor puede crear citas para sí mismo
    doctor_user_id = auth.uid() OR
    -- Paciente puede crear citas para sí mismo
    patient_user_id = auth.uid() OR
    -- Asistente puede crear citas para el doctor asignado
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'assistant' 
      AND assigned_doctor_id = appointments.doctor_user_id
    )
  );

CREATE POLICY "appointments_update_policy" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    -- Admin puede actualizar cualquier cita
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Doctor puede actualizar sus propias citas
    doctor_user_id = auth.uid() OR
    -- Paciente puede actualizar sus propias citas
    patient_user_id = auth.uid() OR
    -- Asistente puede actualizar citas del doctor asignado
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'assistant' 
      AND assigned_doctor_id = appointments.doctor_user_id
    )
  );

-- Limpiar políticas para consultation_notes
DROP POLICY IF EXISTS "Admins can view all consultation notes" ON public.consultation_notes;
DROP POLICY IF EXISTS "Doctors can manage consultation notes for their appointments" ON public.consultation_notes;
DROP POLICY IF EXISTS "Patients can view their own consultation notes" ON public.consultation_notes;

-- Crear políticas mejoradas para consultation_notes que permitan a doctores ver historial completo
CREATE POLICY "consultation_notes_select_policy" ON public.consultation_notes
  FOR SELECT TO authenticated
  USING (
    -- Admin puede ver todas las notas
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Doctor puede ver sus propias notas de consulta
    doctor_user_id = auth.uid() OR
    -- Paciente puede ver sus propias notas
    patient_user_id = auth.uid() OR
    -- Doctor puede ver notas de pacientes que tiene cita programada/en curso
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_user_id = consultation_notes.patient_user_id
      AND a.doctor_user_id = auth.uid()
      AND a.status IN ('scheduled', 'completed')
      AND a.consultation_status IN ('scheduled', 'waiting', 'in_progress', 'completed')
    )
  );

CREATE POLICY "consultation_notes_insert_policy" ON public.consultation_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Admin puede crear cualquier nota
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Solo el doctor puede crear notas de consulta
    doctor_user_id = auth.uid()
  );

CREATE POLICY "consultation_notes_update_policy" ON public.consultation_notes
  FOR UPDATE TO authenticated
  USING (
    -- Admin puede actualizar cualquier nota
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') OR
    -- Solo el doctor que creó la nota puede actualizarla
    doctor_user_id = auth.uid()
  );