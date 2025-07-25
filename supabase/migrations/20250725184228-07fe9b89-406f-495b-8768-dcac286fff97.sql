-- Simplemente crear la suscripción activa para este doctor específico
INSERT INTO subscriptions (
    user_id,
    plan,
    status,
    amount,
    currency,
    payment_method,
    starts_at,
    ends_at
) 
SELECT 
    '013cc96f-061d-4dfd-b23b-90b39c8bbf8e',
    'annual',
    'active',
    23200.00,
    'MXN',
    'physical',
    '2025-07-25 18:39:01'::timestamptz,
    '2026-07-25 18:39:01'::timestamptz
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = '013cc96f-061d-4dfd-b23b-90b39c8bbf8e' 
    AND status = 'active'
);