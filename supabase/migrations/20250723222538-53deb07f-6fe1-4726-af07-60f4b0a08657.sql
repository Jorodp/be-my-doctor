-- Fix infinite recursion in profiles RLS policies
-- Drop all existing policies for profiles table
DROP POLICY IF EXISTS "Admins can update all user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Assistants can update patient profiles for assigned doctor" ON public.profiles;
DROP POLICY IF EXISTS "Assistants can view assigned doctor profile" ON public.profiles;
DROP POLICY IF EXISTS "Doctors can update their profile image" ON public.profiles;
DROP POLICY IF EXISTS "Doctors can view their assigned assistants" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_authenticated_select_on_profiles" ON public.profiles;
DROP POLICY IF EXISTS "select_profiles" ON public.profiles;

-- Create simple, non-recursive RLS policies for profiles
CREATE POLICY "profiles_select_authenticated" ON public.profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin access to all profiles
CREATE POLICY "profiles_admin_all" ON public.profiles
FOR ALL TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'admin'
  )
);