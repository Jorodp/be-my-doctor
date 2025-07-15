-- Create policy for assistants to upload profile images for patients of their assigned doctor
CREATE POLICY "Assistant can upload profile image for assigned patient"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'patient-profiles'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM profiles assistant_profile
      WHERE assistant_profile.user_id = auth.uid()
      AND assistant_profile.role = 'assistant'
      AND (
        SELECT raw_user_meta_data->>'assigned_doctor_id'
        FROM auth.users
        WHERE id = auth.uid()
      )::uuid IN (
        SELECT doctor_user_id
        FROM appointments
        WHERE patient_user_id::text = (storage.foldername(name))[1]
      )
    )
  )
);

-- Create policy for assistants to upload ID documents for patients of their assigned doctor
CREATE POLICY "Assistant can upload ID for assigned patient"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM profiles assistant_profile
      WHERE assistant_profile.user_id = auth.uid()
      AND assistant_profile.role = 'assistant'
      AND (
        SELECT raw_user_meta_data->>'assigned_doctor_id'
        FROM auth.users
        WHERE id = auth.uid()
      )::uuid IN (
        SELECT doctor_user_id
        FROM appointments
        WHERE patient_user_id::text = (storage.foldername(name))[1]
      )
    )
  )
);

-- Also add UPDATE policies for assistants to modify existing documents
CREATE POLICY "Assistant can update profile image for assigned patient"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'patient-profiles'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM profiles assistant_profile
      WHERE assistant_profile.user_id = auth.uid()
      AND assistant_profile.role = 'assistant'
      AND (
        SELECT raw_user_meta_data->>'assigned_doctor_id'
        FROM auth.users
        WHERE id = auth.uid()
      )::uuid IN (
        SELECT doctor_user_id
        FROM appointments
        WHERE patient_user_id::text = (storage.foldername(name))[1]
      )
    )
  )
);

CREATE POLICY "Assistant can update ID for assigned patient"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'patient-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM profiles assistant_profile
      WHERE assistant_profile.user_id = auth.uid()
      AND assistant_profile.role = 'assistant'
      AND (
        SELECT raw_user_meta_data->>'assigned_doctor_id'
        FROM auth.users
        WHERE id = auth.uid()
      )::uuid IN (
        SELECT doctor_user_id
        FROM appointments
        WHERE patient_user_id::text = (storage.foldername(name))[1]
      )
    )
  )
);