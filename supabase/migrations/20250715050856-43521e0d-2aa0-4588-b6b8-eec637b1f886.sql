-- Crear una nueva cita completada SIN calificación para probar la validación
INSERT INTO appointments (
    id,
    doctor_user_id,
    patient_user_id,
    starts_at,
    ends_at,
    status,
    notes,
    created_by
) VALUES (
    gen_random_uuid(),
    '013cc96f-061d-4dfd-b23b-90b39c8bbf8e',
    '941cd284-0b4b-4229-9c60-0eb82ab35372',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '1 hour',
    'completed',
    'Consulta de seguimiento',
    '941cd284-0b4b-4229-9c60-0eb82ab35372'
);