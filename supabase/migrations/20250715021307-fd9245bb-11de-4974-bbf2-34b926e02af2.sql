-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  doctor_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consultation_notes table
CREATE TABLE public.consultation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  doctor_user_id UUID NOT NULL,
  patient_user_id UUID NOT NULL,
  diagnosis TEXT,
  prescription TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL UNIQUE,
  patient_user_id UUID NOT NULL,
  doctor_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor_availability table
CREATE TABLE public.doctor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_user_id, day_of_week, start_time)
);

-- Enable RLS on all tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Patients can view their own appointments" 
ON public.appointments FOR SELECT 
USING (patient_user_id = auth.uid());

CREATE POLICY "Doctors can view their appointments" 
ON public.appointments FOR SELECT 
USING (doctor_user_id = auth.uid());

CREATE POLICY "Patients can create appointments" 
ON public.appointments FOR INSERT 
WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Patients can cancel their appointments" 
ON public.appointments FOR UPDATE 
USING (patient_user_id = auth.uid() AND status = 'scheduled');

CREATE POLICY "Doctors can update their appointments" 
ON public.appointments FOR UPDATE 
USING (doctor_user_id = auth.uid());

CREATE POLICY "Admins can manage all appointments" 
ON public.appointments FOR ALL 
USING (is_admin());

-- RLS Policies for consultation_notes
CREATE POLICY "Patients can view their consultation notes" 
ON public.consultation_notes FOR SELECT 
USING (patient_user_id = auth.uid());

CREATE POLICY "Doctors can manage consultation notes for their patients" 
ON public.consultation_notes FOR ALL 
USING (doctor_user_id = auth.uid());

CREATE POLICY "Admins can view all consultation notes" 
ON public.consultation_notes FOR SELECT 
USING (is_admin());

-- RLS Policies for ratings
CREATE POLICY "Patients can create ratings for their appointments" 
ON public.ratings FOR INSERT 
WITH CHECK (patient_user_id = auth.uid());

CREATE POLICY "Patients can view their own ratings" 
ON public.ratings FOR SELECT 
USING (patient_user_id = auth.uid());

CREATE POLICY "Doctors can view ratings for their appointments" 
ON public.ratings FOR SELECT 
USING (doctor_user_id = auth.uid());

CREATE POLICY "Admins can view all ratings" 
ON public.ratings FOR SELECT 
USING (is_admin());

-- RLS Policies for doctor_availability
CREATE POLICY "Doctors can manage their availability" 
ON public.doctor_availability FOR ALL 
USING (doctor_user_id = auth.uid());

CREATE POLICY "Anyone can view doctor availability" 
ON public.doctor_availability FOR SELECT 
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultation_notes_updated_at
BEFORE UPDATE ON public.consultation_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_availability_updated_at
BEFORE UPDATE ON public.doctor_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();