-- Fix RLS policies that are causing configuration parameter errors
-- Remove problematic policies and create simpler ones

-- Drop problematic policies on appointments table
DROP POLICY IF EXISTS "Paciente ve sus citas" ON appointments;
DROP POLICY IF EXISTS "select_own_appointments_doctor" ON appointments;
DROP POLICY IF EXISTS "select_own_appointments_patient" ON appointments;

-- Create new simplified policies for appointments
CREATE POLICY "admin_can_view_all_appointments" ON appointments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "doctors_can_view_own_appointments" ON appointments
    FOR SELECT
    TO authenticated
    USING (doctor_user_id = auth.uid());

CREATE POLICY "patients_can_view_own_appointments" ON appointments
    FOR SELECT
    TO authenticated
    USING (patient_user_id = auth.uid());

-- Ensure admins can perform all operations on doctor_profiles
CREATE POLICY "admin_full_access_doctor_profiles" ON doctor_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Ensure admins can perform all operations on profiles
CREATE POLICY "admin_full_access_profiles" ON profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p2
            WHERE p2.user_id = auth.uid() 
            AND p2.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p2
            WHERE p2.user_id = auth.uid() 
            AND p2.role = 'admin'
        )
    );