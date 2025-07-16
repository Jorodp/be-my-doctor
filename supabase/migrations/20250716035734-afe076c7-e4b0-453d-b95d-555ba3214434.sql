-- Agregar política para que los administradores puedan insertar suscripciones manualmente
CREATE POLICY "Admins can insert subscriptions manually"
ON public.subscriptions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Verificar y actualizar el constraint de payment_method para permitir 'manual'
-- Primero vamos a ver qué valores están permitidos actualmente
DO $$
BEGIN
  -- Eliminar el constraint existente si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscriptions_payment_method_check'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_payment_method_check;
  END IF;
  
  -- Agregar nuevo constraint que incluya 'manual'
  ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_payment_method_check 
  CHECK (payment_method IN ('stripe', 'manual'));
END $$;