-- Crear tabla para solicitudes de pagos físicos
CREATE TABLE public.physical_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_user_id UUID NOT NULL,
  doctor_name TEXT NOT NULL,
  doctor_email TEXT NOT NULL,
  phone TEXT,
  preferred_payment_method TEXT NOT NULL CHECK (preferred_payment_method IN ('cash', 'card', 'transfer')),
  preferred_location TEXT,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('monthly', 'annual')),
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.physical_payment_requests ENABLE ROW LEVEL SECURITY;

-- Política para que los doctores vean solo sus solicitudes
CREATE POLICY "Doctors can view their own requests" ON public.physical_payment_requests
FOR SELECT USING (doctor_user_id = auth.uid());

-- Política para que los doctores puedan crear solicitudes
CREATE POLICY "Doctors can create requests" ON public.physical_payment_requests
FOR INSERT WITH CHECK (doctor_user_id = auth.uid());

-- Política para que los admins vean todas las solicitudes
CREATE POLICY "Admins can view all requests" ON public.physical_payment_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Política para que los admins puedan actualizar solicitudes
CREATE POLICY "Admins can update requests" ON public.physical_payment_requests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_physical_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER physical_payment_requests_updated_at
  BEFORE UPDATE ON public.physical_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_physical_payment_requests_updated_at();