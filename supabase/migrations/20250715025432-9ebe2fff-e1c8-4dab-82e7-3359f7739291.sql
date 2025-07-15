-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('patient', 'doctor', 'assistant', 'admin');

-- Create verification status enum  
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Create appointment status enum
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  role user_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor_profiles table
CREATE TABLE public.doctor_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_license TEXT NOT NULL,
  specialty TEXT NOT NULL,
  biography TEXT,
  profile_image_url TEXT,
  years_experience INTEGER,
  consultation_fee DECIMAL(10,2),
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor_availability table
CREATE TABLE public.doctor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_user_id, day_of_week, start_time)
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) -- Can be patient, doctor, or assistant
);

-- Create consultation_notes table
CREATE TABLE public.consultation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnosis TEXT,
  prescription TEXT,
  recommendations TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id) -- One rating per appointment
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for doctor_profiles
CREATE POLICY "Anyone can view verified doctor profiles" ON public.doctor_profiles FOR SELECT USING (verification_status = 'verified');
CREATE POLICY "Doctors can update their own profile" ON public.doctor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Doctors can insert their own profile" ON public.doctor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all doctor profiles" ON public.doctor_profiles FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can update doctor verification" ON public.doctor_profiles FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Create policies for doctor_availability
CREATE POLICY "Anyone can view doctor availability" ON public.doctor_availability FOR SELECT USING (true);
CREATE POLICY "Doctors can manage their own availability" ON public.doctor_availability FOR ALL USING (auth.uid() = doctor_user_id);
CREATE POLICY "Assistants can manage assigned doctor availability" ON public.doctor_availability FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'assistant'
    AND (SELECT raw_user_meta_data->>'assigned_doctor_id' FROM auth.users WHERE id = auth.uid())::uuid = doctor_user_id
  )
);

-- Create policies for appointments
CREATE POLICY "Users can view their own appointments" ON public.appointments FOR SELECT USING (
  auth.uid() = patient_user_id OR auth.uid() = doctor_user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'assistant'
    AND (SELECT raw_user_meta_data->>'assigned_doctor_id' FROM auth.users WHERE id = auth.uid())::uuid = doctor_user_id
  )
);
CREATE POLICY "Patients can create appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_user_id);
CREATE POLICY "Doctors and assistants can create appointments" ON public.appointments FOR INSERT WITH CHECK (
  auth.uid() = doctor_user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'assistant'
    AND (SELECT raw_user_meta_data->>'assigned_doctor_id' FROM auth.users WHERE id = auth.uid())::uuid = doctor_user_id
  )
);
CREATE POLICY "Users can update their own appointments" ON public.appointments FOR UPDATE USING (
  auth.uid() = patient_user_id OR auth.uid() = doctor_user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'assistant'
    AND (SELECT raw_user_meta_data->>'assigned_doctor_id' FROM auth.users WHERE id = auth.uid())::uuid = doctor_user_id
  )
);

-- Create policies for consultation_notes
CREATE POLICY "Doctors can manage consultation notes for their appointments" ON public.consultation_notes FOR ALL USING (auth.uid() = doctor_user_id);
CREATE POLICY "Patients can view their own consultation notes" ON public.consultation_notes FOR SELECT USING (auth.uid() = patient_user_id);

-- Create policies for ratings
CREATE POLICY "Users can view ratings for verified doctors" ON public.ratings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles WHERE user_id = doctor_user_id AND verification_status = 'verified')
);
CREATE POLICY "Patients can create ratings for their appointments" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = patient_user_id);
CREATE POLICY "Patients can update their own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = patient_user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctor_profiles_updated_at BEFORE UPDATE ON public.doctor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctor_availability_updated_at BEFORE UPDATE ON public.doctor_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_consultation_notes_updated_at BEFORE UPDATE ON public.consultation_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();