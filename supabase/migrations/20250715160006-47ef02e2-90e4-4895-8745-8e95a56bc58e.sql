-- Create profiles for existing auth users that don't have profiles
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
    
    -- If doctor, create doctor profile (only if it doesn't exist)
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