-- Add new fields to doctor_profiles table for professional documentation
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS professional_license_document_url TEXT;
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS university_degree_document_url TEXT;
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS identification_document_url TEXT;
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS curp_document_url TEXT;
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS additional_certifications_urls TEXT[];

-- Add fields for professional gallery
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS office_photos_urls TEXT[];
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS professional_photos_urls TEXT[];

-- Create table for doctor questionnaires
CREATE TABLE IF NOT EXISTS public.doctor_questionnaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for patient questionnaire responses
CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  questionnaire_id UUID NOT NULL,
  patient_user_id UUID NOT NULL,
  doctor_user_id UUID NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for doctor_questionnaires
CREATE POLICY "Doctors can manage their own questionnaires"
ON public.doctor_questionnaires
FOR ALL
USING (auth.uid() = doctor_user_id);

CREATE POLICY "Patients can view questionnaires for their appointments"
ON public.doctor_questionnaires
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM appointments 
  WHERE appointments.doctor_user_id = doctor_questionnaires.doctor_user_id 
  AND appointments.patient_user_id = auth.uid()
));

CREATE POLICY "Admins can view all questionnaires"
ON public.doctor_questionnaires
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));

-- RLS policies for questionnaire_responses
CREATE POLICY "Patients can manage their own responses"
ON public.questionnaire_responses
FOR ALL
USING (auth.uid() = patient_user_id);

CREATE POLICY "Doctors can view responses for their questionnaires"
ON public.questionnaire_responses
FOR SELECT
USING (auth.uid() = doctor_user_id);

CREATE POLICY "Admins can view all responses"
ON public.questionnaire_responses
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));

-- Add triggers for updated_at
CREATE TRIGGER update_doctor_questionnaires_updated_at
BEFORE UPDATE ON public.doctor_questionnaires
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for doctor documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('doctor-documents', 'doctor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for doctor photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('doctor-photos', 'doctor-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for doctor documents
CREATE POLICY "Doctors can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'doctor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can view their own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'doctor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can update their own documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'doctor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can delete their own documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'doctor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all doctor documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'doctor-documents' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'::user_role
  )
);

-- Storage policies for doctor photos
CREATE POLICY "Doctors can upload their own photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'doctor-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can view their own photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'doctor-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can update their own photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'doctor-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can delete their own photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'doctor-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view doctor photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'doctor-photos');