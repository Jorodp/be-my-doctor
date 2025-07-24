-- Arreglar políticas de eliminación para clínicas
-- Primero eliminar las políticas existentes que pueden estar causando conflicto
DROP POLICY IF EXISTS "Authenticated users can delete clinics" ON clinics;
DROP POLICY IF EXISTS "Doctors can manage their own clinics" ON clinics;

-- Crear política específica para eliminación de clínicas
CREATE POLICY "Doctors and admins can delete their own clinics" 
ON clinics 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = clinics.doctor_id 
    AND profiles.user_id = auth.uid()
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Recrear política para todas las operaciones de doctores sobre sus clínicas
CREATE POLICY "Doctors can manage their own clinics" 
ON clinics 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = clinics.doctor_id 
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = clinics.doctor_id 
    AND profiles.user_id = auth.uid()
  )
);

-- Arreglar la tabla clinic_assistants para asignación de asistentes por consultorio
-- Agregar columna id si no existe (algunas veces falta la clave primaria)
ALTER TABLE clinic_assistants ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Crear clave primaria si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clinic_assistants_pkey' 
        AND table_name = 'clinic_assistants'
    ) THEN
        ALTER TABLE clinic_assistants ADD CONSTRAINT clinic_assistants_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- Asegurar que tenemos las políticas RLS para clinic_assistants
CREATE POLICY IF NOT EXISTS "Authenticated users can view clinic assistants" 
ON clinic_assistants 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can manage clinic assistants" 
ON clinic_assistants 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');