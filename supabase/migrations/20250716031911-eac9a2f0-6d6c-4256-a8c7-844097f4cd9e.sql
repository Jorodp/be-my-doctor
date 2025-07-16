-- Create storage bucket for legal documents
INSERT INTO storage.buckets (id, name, public) VALUES ('legal-documents', 'legal-documents', true);

-- Create policies for legal documents bucket
CREATE POLICY "Legal documents are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'legal-documents');

CREATE POLICY "Only admins can upload legal documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'legal-documents' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Only admins can update legal documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'legal-documents' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Only admins can delete legal documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'legal-documents' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));