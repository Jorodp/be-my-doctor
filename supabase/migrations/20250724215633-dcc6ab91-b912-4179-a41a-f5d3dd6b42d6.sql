-- Crear tabla para habilitar pagos físicos de doctores
CREATE TABLE public.doctor_physical_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_by UUID REFERENCES auth.users(id),
  enabled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_physical_payments ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Admins can view all physical payment settings" 
ON public.doctor_physical_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can manage physical payment settings" 
ON public.doctor_physical_payments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Doctors can view their physical payment settings" 
ON public.doctor_physical_payments 
FOR SELECT 
USING (doctor_user_id = auth.uid());

-- Crear índice para optimizar consultas
CREATE INDEX idx_doctor_physical_payments_doctor_user_id ON public.doctor_physical_payments(doctor_user_id);