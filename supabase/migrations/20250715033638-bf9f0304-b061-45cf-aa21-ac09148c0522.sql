-- Create RLS policies for admin access to all data

-- Allow admins to view all appointments
CREATE POLICY "Admins can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to view all consultation notes
CREATE POLICY "Admins can view all consultation notes" 
ON public.consultation_notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to view all ratings
CREATE POLICY "Admins can view all ratings" 
ON public.ratings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to view all doctor availability
CREATE POLICY "Admins can view all doctor availability" 
ON public.doctor_availability 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to update doctor profiles
CREATE POLICY "Admins can update all doctor profiles" 
ON public.doctor_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to update user profiles
CREATE POLICY "Admins can update all user profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.user_id = auth.uid() AND p2.role = 'admin'
  )
);