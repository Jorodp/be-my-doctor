-- Primero, necesitamos las RPC functions que están siendo usadas
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_appointment_id UUID)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Intentar obtener conversación existente
    SELECT id INTO v_conversation_id 
    FROM conversations 
    WHERE appointment_id = p_appointment_id;
    
    -- Si no existe, crear una nueva
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (appointment_id, created_at) 
        VALUES (p_appointment_id, NOW()) 
        RETURNING id INTO v_conversation_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function para listar mensajes con información del remitente
CREATE OR REPLACE FUNCTION list_messages(p_conversation_id UUID)
RETURNS TABLE (
    id BIGINT,
    conversation_id UUID,
    sender_id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    sender_profile JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.conversation_id,
        cm.sender_user_id as sender_id,
        cm.content,
        cm.sent_at as created_at,
        jsonb_build_object(
            'full_name', p.full_name,
            'profile_image_url', p.profile_image_url,
            'role', p.role
        ) as sender_profile
    FROM conversation_messages cm
    LEFT JOIN profiles p ON p.user_id = cm.sender_user_id
    WHERE cm.conversation_id = p_conversation_id
    ORDER BY cm.sent_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar que las tablas tienen la configuración correcta para real-time
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE conversation_messages REPLICA IDENTITY FULL;

-- Agregar las tablas a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_messages;