-- Update the trigger function to handle doctor profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert basic profile
  INSERT INTO public.profiles (user_id, email, role, first_name, last_name, phone)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')::user_role,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  );

  -- If the user is a doctor, create doctor profile
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'patient')::user_role = 'doctor' THEN
    INSERT INTO public.doctor_profiles (
      user_id, 
      professional_license, 
      specialty, 
      biography, 
      years_experience, 
      consultation_fee
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'professional_license',
      NEW.raw_user_meta_data->>'specialty',
      NEW.raw_user_meta_data->>'biography',
      CASE 
        WHEN NEW.raw_user_meta_data->>'years_experience' IS NOT NULL 
        THEN (NEW.raw_user_meta_data->>'years_experience')::integer 
        ELSE NULL 
      END,
      CASE 
        WHEN NEW.raw_user_meta_data->>'consultation_fee' IS NOT NULL 
        THEN (NEW.raw_user_meta_data->>'consultation_fee')::decimal(10,2)
        ELSE NULL 
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;