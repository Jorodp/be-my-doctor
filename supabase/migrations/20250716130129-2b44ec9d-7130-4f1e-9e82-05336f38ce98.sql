-- Create doctor-profiles bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('doctor-profiles', 'doctor-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create policy for public read access to doctor profile images
CREATE POLICY "Public read access to doctor profile images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'doctor-profiles');