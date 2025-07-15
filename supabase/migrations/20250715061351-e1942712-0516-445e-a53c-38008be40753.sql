-- Create function to handle new doctor profiles
CREATE OR REPLACE FUNCTION public.handle_new_doctor_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Only create doctor profile for users with doctor role
  IF NEW.role = 'doctor' THEN
    -- Get additional data from auth.users raw_user_meta_data
    INSERT INTO public.doctor_profiles (
      user_id,
      professional_license,
      specialty,
      biography,
      years_experience,
      consultation_fee,
      verification_status
    )
    SELECT
      NEW.user_id,
      COALESCE((SELECT raw_user_meta_data ->> 'professional_license' FROM auth.users WHERE id = NEW.user_id), ''),
      COALESCE((SELECT raw_user_meta_data ->> 'specialty' FROM auth.users WHERE id = NEW.user_id), ''),
      (SELECT raw_user_meta_data ->> 'biography' FROM auth.users WHERE id = NEW.user_id),
      CASE 
        WHEN (SELECT raw_user_meta_data ->> 'years_experience' FROM auth.users WHERE id = NEW.user_id) IS NOT NULL 
        THEN (SELECT raw_user_meta_data ->> 'years_experience' FROM auth.users WHERE id = NEW.user_id)::integer
        ELSE NULL
      END,
      CASE 
        WHEN (SELECT raw_user_meta_data ->> 'consultation_fee' FROM auth.users WHERE id = NEW.user_id) IS NOT NULL 
        THEN (SELECT raw_user_meta_data ->> 'consultation_fee' FROM auth.users WHERE id = NEW.user_id)::numeric
        ELSE NULL
      END,
      'pending'::verification_status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create doctor profiles
CREATE TRIGGER on_doctor_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_doctor_profile();