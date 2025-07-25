-- Activar manualmente el doctor que ya tiene pagos físicos completados pero no está activo
-- Esto es para los doctores existentes que tenían pagos antes del trigger

-- Verificar si tiene pagos físicos completados recientes
DO $$
DECLARE
    recent_payment RECORD;
    new_expiration TIMESTAMPTZ;
BEGIN
    -- Buscar el pago físico más reciente completado para este doctor
    SELECT amount, processed_at INTO recent_payment
    FROM physical_payment_requests 
    WHERE doctor_user_id = '013cc96f-061d-4dfd-b23b-90b39c8bbf8e' 
      AND status = 'completed'
    ORDER BY processed_at DESC 
    LIMIT 1;

    IF FOUND THEN
        -- Calcular la expiración basada en el monto pagado
        IF recent_payment.amount >= 20000 THEN
            new_expiration := recent_payment.processed_at + interval '1 year';
        ELSE
            new_expiration := recent_payment.processed_at + interval '1 month' * FLOOR(recent_payment.amount / 2000);
        END IF;

        -- Crear suscripción activa en la tabla subscriptions
        INSERT INTO subscriptions (
            user_id,
            plan,
            status,
            amount,
            currency,
            payment_method,
            starts_at,
            ends_at
        ) VALUES (
            '013cc96f-061d-4dfd-b23b-90b39c8bbf8e',
            CASE 
                WHEN recent_payment.amount >= 20000 THEN 'annual'
                ELSE 'monthly'
            END,
            'active',
            recent_payment.amount,
            'MXN',
            'physical',
            recent_payment.processed_at,
            new_expiration
        )
        ON CONFLICT (user_id, stripe_subscription_id) DO NOTHING;

        RAISE NOTICE 'Suscripción creada para doctor con expiración: %', new_expiration;
    ELSE
        RAISE NOTICE 'No se encontraron pagos físicos completados para este doctor';
    END IF;
END $$;