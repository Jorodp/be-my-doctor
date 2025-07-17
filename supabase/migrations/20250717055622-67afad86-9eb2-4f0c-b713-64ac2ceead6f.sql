-- Actualizar los precios en payment_settings para que coincidan con los price IDs de Stripe
-- Los price IDs configurados son:
-- monthly: price_1RlLZh2QFgncbl10moSdGhjZ 
-- annual: price_1RlLaW2QFgncbl10pCwWOFFM

-- Actualizar con los precios reales (necesitarás confirmar estos valores desde tu dashboard de Stripe)
UPDATE payment_settings 
SET 
  monthly_price = 799,  -- $799 MXN para el plan mensual
  annual_price = 7990,  -- $7,990 MXN para el plan anual (equivale a ~$666/mes, ahorro de ~$600)
  updated_at = now()
WHERE id = true;