-- Drop existing restrictive policies and create simpler ones
DROP POLICY IF EXISTS "Assistant can upload profile image for assigned patient" ON storage.objects;
DROP POLICY IF EXISTS "Assistant can upload ID for assigned patient" ON storage.objects;
DROP POLICY IF EXISTS "Assistant can update profile image for assigned patient" ON storage.objects;
DROP POLICY IF EXISTS "Assistant can update ID for assigned patient" ON storage.objects;

-- Create simplified policies for admins and doctors to upload files for any patient
CREATE POLICY "Admins and doctors can upload patient profile images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'patient-profiles' AND 
  (
    (auth.uid()::text = (storage.foldername(name))[1]) OR -- User uploading their own
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'doctor', 'assistant')
      )
    )
  )
);

CREATE POLICY "Admins and doctors can upload patient documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'patient-documents' AND 
  (
    (auth.uid()::text = (storage.foldername(name))[1]) OR -- User uploading their own
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'doctor', 'assistant')
      )
    )
  )
);

CREATE POLICY "Admins and doctors can update patient profile images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'patient-profiles' AND 
  (
    (auth.uid()::text = (storage.foldername(name))[1]) OR -- User updating their own
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'doctor', 'assistant')
      )
    )
  )
);

CREATE POLICY "Admins and doctors can update patient documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'patient-documents' AND 
  (
    (auth.uid()::text = (storage.foldername(name))[1]) OR -- User updating their own
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'doctor', 'assistant')
      )
    )
  )
);