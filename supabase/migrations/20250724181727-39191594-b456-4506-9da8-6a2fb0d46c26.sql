-- Habilitar RLS en la tabla clinics si no está habilitado
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios autenticados puedan ver todas las clínicas
CREATE POLICY "Authenticated users can view clinics" 
ON clinics 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Política para que usuarios autenticados puedan insertar clínicas
CREATE POLICY "Authenticated users can insert clinics" 
ON clinics 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Política para que usuarios autenticados puedan actualizar clínicas
CREATE POLICY "Authenticated users can update clinics" 
ON clinics 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política para que usuarios autenticados puedan eliminar clínicas
CREATE POLICY "Authenticated users can delete clinics" 
ON clinics 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Políticas específicas para admins que pueden ver todas las clínicas
CREATE POLICY "Admins can view all clinics" 
ON clinics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Políticas para doctores que pueden manejar sus propias clínicas
CREATE POLICY "Doctors can manage their own clinics" 
ON clinics 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = clinics.doctor_id 
  AND profiles.user_id = auth.uid()
));

-- Política para asistentes que pueden ver clínicas de doctores asignados
CREATE POLICY "Assistants can view assigned doctor clinics" 
ON clinics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p1
  JOIN profiles p2 ON p2.id = clinics.doctor_id
  WHERE p1.user_id = auth.uid() 
  AND p1.role = 'assistant'
  AND p1.assigned_doctor_id = p2.user_id
));