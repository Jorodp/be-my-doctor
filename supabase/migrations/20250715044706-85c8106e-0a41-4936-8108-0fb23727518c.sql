-- Create storage buckets for patient files
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-profiles', 'patient-profiles', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents', 'patient-documents', false);

-- Add columns for profile and document images to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Create storage policies for patient profile images (public)
CREATE POLICY "Patient profile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'patient-profiles');

CREATE POLICY "Users can upload their own profile image" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'patient-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile image" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'patient-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile image" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'patient-profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for patient documents (private - only for the owner and their doctors)
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'patient-documents' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_user_id::text = (storage.foldername(name))[1]
      AND a.doctor_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);