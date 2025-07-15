-- Create the handle_new_user function to automatically create profiles when users sign up
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
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'patient')::user_role,
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

-- Create trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also check for existing users without profiles and create them
DO $$
DECLARE
  user_record RECORD;
  user_role user_role;
BEGIN
  -- Find auth users without profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.user_id IS NULL
  LOOP
    -- Extract role from metadata, default to patient
    user_role := COALESCE(user_record.raw_user_meta_data ->> 'role', 'patient')::user_role;
    
    -- Create profile
    INSERT INTO public.profiles (
      user_id,
      role,
      full_name,
      created_at,
      updated_at
    ) VALUES (
      user_record.id,
      user_role,
      COALESCE(user_record.raw_user_meta_data ->> 'full_name', ''),
      now(),
      now()
    );
    
    -- If doctor, create doctor profile
    IF user_role = 'doctor' THEN
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
        user_record.id,
        COALESCE(user_record.raw_user_meta_data ->> 'professional_license', ''),
        COALESCE(user_record.raw_user_meta_data ->> 'specialty', ''),
        user_record.raw_user_meta_data ->> 'biography',
        CASE 
          WHEN user_record.raw_user_meta_data ->> 'years_experience' IS NOT NULL 
          THEN (user_record.raw_user_meta_data ->> 'years_experience')::integer
          ELSE NULL
        END,
        CASE 
          WHEN user_record.raw_user_meta_data ->> 'consultation_fee' IS NOT NULL 
          THEN (user_record.raw_user_meta_data ->> 'consultation_fee')::numeric
          ELSE NULL
        END,
        'pending'::verification_status,
        now(),
        now()
      ) ON CONFLICT (user_id) DO NOTHING; -- Avoid duplicate key errors
    END IF;
    
    RAISE NOTICE 'Created profile for user: % with role: %', user_record.email, user_role;
  END LOOP;
END $$;