-- Actualizar políticas RLS para appointments para incluir acceso de asistentes por clínicas
-- Primero elimino las políticas existentes
DROP POLICY IF EXISTS appointments_select_policy ON appointments;
DROP POLICY IF EXISTS appointments_insert_policy ON appointments;
DROP POLICY IF EXISTS appointments_update_policy ON appointments;

-- Crear nueva política de SELECT que incluye acceso por clinic_assistants
CREATE POLICY appointments_select_policy ON appointments
FOR SELECT 
USING (
  -- Administradores pueden ver todo
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
  )) OR
  -- Doctores pueden ver sus propias citas
  (doctor_user_id = auth.uid()) OR
  -- Pacientes pueden ver sus propias citas  
  (patient_user_id = auth.uid()) OR
  -- Asistentes pueden ver citas de doctores asignados directamente
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'assistant'::user_role 
      AND profiles.assigned_doctor_id = appointments.doctor_user_id
  )) OR
  -- Asistentes pueden ver citas de doctores cuyas clínicas están asignadas
  (EXISTS (
    SELECT 1 FROM profiles p
    JOIN clinic_assistants ca ON ca.assistant_id = p.id
    JOIN clinics c ON c.id = ca.clinic_id
    JOIN profiles dp ON dp.id = c.doctor_id
    WHERE p.user_id = auth.uid() 
      AND p.role = 'assistant'::user_role
      AND dp.user_id = appointments.doctor_user_id
  ))
);

-- Crear nueva política de INSERT que incluye acceso por clinic_assistants
CREATE POLICY appointments_insert_policy ON appointments
FOR INSERT 
WITH CHECK (
  -- Administradores pueden crear cualquier cita
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
  )) OR
  -- Doctores pueden crear sus propias citas
  (doctor_user_id = auth.uid()) OR
  -- Pacientes pueden crear sus propias citas
  (patient_user_id = auth.uid()) OR
  -- Asistentes pueden crear citas para doctores asignados directamente
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'assistant'::user_role 
      AND profiles.assigned_doctor_id = appointments.doctor_user_id
  )) OR
  -- Asistentes pueden crear citas para doctores cuyas clínicas están asignadas
  (EXISTS (
    SELECT 1 FROM profiles p
    JOIN clinic_assistants ca ON ca.assistant_id = p.id
    JOIN clinics c ON c.id = ca.clinic_id
    JOIN profiles dp ON dp.id = c.doctor_id
    WHERE p.user_id = auth.uid() 
      AND p.role = 'assistant'::user_role
      AND dp.user_id = appointments.doctor_user_id
  ))
);

-- Crear nueva política de UPDATE que incluye acceso por clinic_assistants
CREATE POLICY appointments_update_policy ON appointments
FOR UPDATE 
USING (
  -- Administradores pueden actualizar cualquier cita
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'::user_role
  )) OR
  -- Doctores pueden actualizar sus propias citas
  (doctor_user_id = auth.uid()) OR
  -- Pacientes pueden actualizar sus propias citas
  (patient_user_id = auth.uid()) OR
  -- Asistentes pueden actualizar citas de doctores asignados directamente
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'assistant'::user_role 
      AND profiles.assigned_doctor_id = appointments.doctor_user_id
  )) OR
  -- Asistentes pueden actualizar citas de doctores cuyas clínicas están asignadas
  (EXISTS (
    SELECT 1 FROM profiles p
    JOIN clinic_assistants ca ON ca.assistant_id = p.id
    JOIN clinics c ON c.id = ca.clinic_id
    JOIN profiles dp ON dp.id = c.doctor_id
    WHERE p.user_id = auth.uid() 
      AND p.role = 'assistant'::user_role
      AND dp.user_id = appointments.doctor_user_id
  ))
);