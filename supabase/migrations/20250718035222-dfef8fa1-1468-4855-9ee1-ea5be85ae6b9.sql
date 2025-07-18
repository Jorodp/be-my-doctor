-- Create the user_role enum type
CREATE TYPE public.user_role AS ENUM ('patient', 'doctor', 'assistant', 'admin');

-- Update the handle_new_user function to properly handle the user_role type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (
    user_id,
    role,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'patient'::public.user_role),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    now(),
    now()
  );

  -- If the user is a doctor, also create a doctor profile
  IF COALESCE(NEW.raw_user_meta_data ->> 'role', 'patient') = 'doctor' THEN
    INSERT INTO public.doctor_profiles (
      user_id,
      professional_license,
      specialty,
      biography,
      years_experience,
      consultation_fee,
      verification_status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'professional_license', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'specialty', ''),
      NEW.raw_user_meta_data ->> 'biography',
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'years_experience' IS NOT NULL 
        THEN (NEW.raw_user_meta_data ->> 'years_experience')::integer
        ELSE NULL
      END,
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'consultation_fee' IS NOT NULL 
        THEN (NEW.raw_user_meta_data ->> 'consultation_fee')::numeric
        ELSE NULL
      END,
      'pending'::verification_status,
      now(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;