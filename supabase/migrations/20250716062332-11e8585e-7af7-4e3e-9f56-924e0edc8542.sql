-- Add new fields to appointments table for consultation flow tracking
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consultation_status VARCHAR(50) DEFAULT 'scheduled';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_arrived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consultation_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consultation_ended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS waiting_time_minutes INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consultation_duration_minutes INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS total_clinic_time_minutes INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS marked_arrived_by UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consultation_started_by UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consultation_ended_by UUID;

-- Add index for better performance on consultation status queries
CREATE INDEX IF NOT EXISTS idx_appointments_consultation_status ON public.appointments(consultation_status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_user_id ON public.appointments(doctor_user_id);

-- Update existing appointments to have default consultation_status based on current status
UPDATE public.appointments 
SET consultation_status = CASE 
  WHEN status = 'cancelled' THEN 'cancelled'
  WHEN status = 'completed' THEN 'completed'
  ELSE 'scheduled'
END
WHERE consultation_status = 'scheduled';