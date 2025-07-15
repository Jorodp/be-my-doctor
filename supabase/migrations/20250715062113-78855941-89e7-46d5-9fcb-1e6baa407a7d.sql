-- Make patient-documents bucket public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'patient-documents';

-- Also make sure we have a simple SELECT policy for patient documents
CREATE POLICY IF NOT EXISTS "Public access to patient documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'patient-documents');