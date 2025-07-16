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

-- Create a function to automatically calculate time metrics when status changes
CREATE OR REPLACE FUNCTION public.calculate_appointment_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate waiting time when consultation starts
  IF NEW.consultation_started_at IS NOT NULL AND OLD.consultation_started_at IS NULL AND NEW.patient_arrived_at IS NOT NULL THEN
    NEW.waiting_time_minutes := EXTRACT(EPOCH FROM (NEW.consultation_started_at - NEW.patient_arrived_at)) / 60;
  END IF;
  
  -- Calculate consultation duration when consultation ends
  IF NEW.consultation_ended_at IS NOT NULL AND OLD.consultation_ended_at IS NULL AND NEW.consultation_started_at IS NOT NULL THEN
    NEW.consultation_duration_minutes := EXTRACT(EPOCH FROM (NEW.consultation_ended_at - NEW.consultation_started_at)) / 60;
  END IF;
  
  -- Calculate total clinic time when consultation ends
  IF NEW.consultation_ended_at IS NOT NULL AND OLD.consultation_ended_at IS NULL AND NEW.patient_arrived_at IS NOT NULL THEN
    NEW.total_clinic_time_minutes := EXTRACT(EPOCH FROM (NEW.consultation_ended_at - NEW.patient_arrived_at)) / 60;
  END IF;
  
  -- Update consultation status based on timestamps
  IF NEW.consultation_ended_at IS NOT NULL THEN
    NEW.consultation_status := 'completed';
  ELSIF NEW.consultation_started_at IS NOT NULL THEN
    NEW.consultation_status := 'in_progress';
  ELSIF NEW.patient_arrived_at IS NOT NULL THEN
    NEW.consultation_status := 'waiting';
  ELSIF NEW.status = 'cancelled' THEN
    NEW.consultation_status := 'cancelled';
  ELSE
    NEW.consultation_status := 'scheduled';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate metrics
DROP TRIGGER IF EXISTS calculate_appointment_metrics_trigger ON public.appointments;
CREATE TRIGGER calculate_appointment_metrics_trigger
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_appointment_metrics();

-- Create a function to check if patient has pending ratings
CREATE OR REPLACE FUNCTION public.has_pending_rating(patient_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM appointments a
    LEFT JOIN ratings r ON a.id = r.appointment_id
    WHERE a.patient_user_id = patient_id 
    AND a.status = 'completed'
    AND a.consultation_status = 'completed'
    AND r.id IS NULL
    AND a.ends_at < NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for better performance on consultation status queries
CREATE INDEX IF NOT EXISTS idx_appointments_consultation_status ON public.appointments(consultation_status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON public.appointments(doctor_user_id, DATE(starts_at));

-- Update existing appointments to have default consultation_status based on current status
UPDATE public.appointments 
SET consultation_status = CASE 
  WHEN status = 'cancelled' THEN 'cancelled'
  WHEN status = 'completed' THEN 'completed'
  ELSE 'scheduled'
END
WHERE consultation_status IS NULL;