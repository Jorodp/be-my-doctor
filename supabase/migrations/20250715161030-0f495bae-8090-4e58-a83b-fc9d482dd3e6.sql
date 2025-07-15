-- Remove the policy that allows doctors to update their own profiles
DROP POLICY IF EXISTS "Doctors can update their own profile" ON public.doctor_profiles;