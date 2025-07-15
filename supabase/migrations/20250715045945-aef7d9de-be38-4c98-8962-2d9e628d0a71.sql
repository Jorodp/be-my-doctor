-- Crear citas de prueba para testing
-- Actualizar una cita pasada para que aparezca como completada
UPDATE appointments 
SET status = 'completed', 
    starts_at = NOW() - INTERVAL '5 days',
    ends_at = NOW() - INTERVAL '5 days' + INTERVAL '1 hour'
WHERE id = 'e921ddd9-3b6f-446e-87bb-67ce0fbaeaca';

-- Crear notas de consulta para la cita completada (verificar si ya existe)
INSERT INTO consultation_notes (
    appointment_id,
    doctor_user_id,
    patient_user_id,
    diagnosis,
    prescription,
    recommendations
) 
SELECT 
    'e921ddd9-3b6f-446e-87bb-67ce0fbaeaca',
    '013cc96f-061d-4dfd-b23b-90b39c8bbf8e',
    '941cd284-0b4b-4229-9c60-0eb82ab35372',
    'Cefalea tensional',
    'Ibuprofeno 400mg cada 8 horas por 3 días',
    'Descanso, hidratación adecuada y evitar pantallas por períodos prolongados'
WHERE NOT EXISTS (
    SELECT 1 FROM consultation_notes 
    WHERE appointment_id = 'e921ddd9-3b6f-446e-87bb-67ce0fbaeaca'
);

-- Crear una calificación para la cita completada (verificar si ya existe)
INSERT INTO ratings (
    appointment_id,
    doctor_user_id,
    patient_user_id,
    rating,
    comment
) 
SELECT 
    'e921ddd9-3b6f-446e-87bb-67ce0fbaeaca',
    '013cc96f-061d-4dfd-b23b-90b39c8bbf8e',
    '941cd284-0b4b-4229-9c60-0eb82ab35372',
    5,
    'Excelente atención, muy profesional y resolvió mis dudas'
WHERE NOT EXISTS (
    SELECT 1 FROM ratings 
    WHERE appointment_id = 'e921ddd9-3b6f-446e-87bb-67ce0fbaeaca'
);