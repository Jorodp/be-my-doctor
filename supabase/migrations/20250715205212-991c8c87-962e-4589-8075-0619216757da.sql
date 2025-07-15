-- Create payment_settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  monthly_price NUMERIC NOT NULL DEFAULT 799,
  annual_price NUMERIC NOT NULL DEFAULT 7990,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT only_one_settings_row CHECK (id = true)
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to view payment settings
CREATE POLICY "select_payment_settings_admin" ON public.payment_settings
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Allow admins to update payment settings
CREATE POLICY "update_payment_settings_admin" ON public.payment_settings
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Allow admins to insert payment settings
CREATE POLICY "insert_payment_settings_admin" ON public.payment_settings
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Insert initial settings
INSERT INTO public.payment_settings (monthly_price, annual_price) 
VALUES (799, 7990)
ON CONFLICT (id) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();