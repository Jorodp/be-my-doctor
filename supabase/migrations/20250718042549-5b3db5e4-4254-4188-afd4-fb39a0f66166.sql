-- First, let's check the current auth users and update missing profiles
INSERT INTO public.profiles (user_id, full_name, role, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'full_name', ''),
  COALESCE((au.raw_user_meta_data ->> 'role')::public.user_role, 'patient'::public.user_role),
  now(),
  now()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Update empty full_names from auth metadata
UPDATE public.profiles 
SET full_name = COALESCE(
  (SELECT au.raw_user_meta_data ->> 'full_name' 
   FROM auth.users au 
   WHERE au.id = profiles.user_id), 
  profiles.full_name
)
WHERE (full_name IS NULL OR full_name = '');

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile with better data extraction
  INSERT INTO public.profiles (
    user_id,
    role,
    full_name,
    phone,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'patient'::public.user_role),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    now(),
    now()
  );

  -- If the user is a doctor, create doctor profile
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
      'pending'::public.verification_status,
      now(),
      now()
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;