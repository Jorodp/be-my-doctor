-- Actualizar con los precios reales correctos
UPDATE payment_settings 
SET 
  monthly_price = 2000,  -- $2,000 MXN para el plan mensual
  annual_price = 20000,  -- $20,000 MXN para el plan anual
  updated_at = now()
WHERE id = true;