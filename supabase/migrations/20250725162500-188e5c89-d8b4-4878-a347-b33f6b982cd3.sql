-- Habilitar extensiones necesarias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear función para manejar vencimientos automáticos
CREATE OR REPLACE FUNCTION handle_subscription_expiration()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actualizar suscripciones vencidas a 'inactive'
  UPDATE doctor_profiles 
  SET 
    subscription_status = 'inactive',
    updated_at = now()
  WHERE 
    subscription_status = 'active' 
    AND subscription_expires_at < now();
    
  -- Log de la operación
  RAISE NOTICE 'Processed subscription expirations at %', now();
END;
$$;

-- Programar el cron job para ejecutarse cada hora
SELECT cron.schedule(
  'handle-subscription-expiration',
  '0 * * * *', -- Cada hora
  $$
  SELECT handle_subscription_expiration();
  $$
);