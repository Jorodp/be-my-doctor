-- Crear tabla para rastrear mensajes leídos
CREATE TABLE public.message_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id bigint NOT NULL REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Evitar duplicados: un usuario solo puede marcar un mensaje como leído una vez
  UNIQUE(message_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver sus propias lecturas
CREATE POLICY "Users can view their own message reads" ON public.message_reads
  FOR SELECT USING (user_id = auth.uid());

-- Política para que los usuarios puedan insertar sus propias lecturas  
CREATE POLICY "Users can insert their own message reads" ON public.message_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política para que los usuarios puedan actualizar sus propias lecturas
CREATE POLICY "Users can update their own message reads" ON public.message_reads
  FOR UPDATE USING (user_id = auth.uid());

-- Índices para mejorar performance
CREATE INDEX idx_message_reads_user_id ON public.message_reads(user_id);
CREATE INDEX idx_message_reads_message_id ON public.message_reads(message_id);
CREATE INDEX idx_message_reads_read_at ON public.message_reads(read_at);

-- Habilitar realtime para la tabla
ALTER TABLE public.message_reads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;