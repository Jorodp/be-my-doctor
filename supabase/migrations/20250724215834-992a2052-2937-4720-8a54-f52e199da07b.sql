-- Crear tablas para el sistema de soporte al cliente
CREATE TABLE public.support_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('physical_payment', 'general')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para support_conversations
CREATE POLICY "Users can view their own support conversations" 
ON public.support_conversations 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own support conversations" 
ON public.support_conversations 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all support conversations" 
ON public.support_conversations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can update all support conversations" 
ON public.support_conversations 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Políticas para support_messages
CREATE POLICY "Users can view messages from their conversations" 
ON public.support_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.support_conversations 
  WHERE id = support_messages.conversation_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can send messages to their conversations" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.support_conversations 
  WHERE id = support_messages.conversation_id 
  AND user_id = auth.uid()
) AND sender_user_id = auth.uid());

CREATE POLICY "Admins can view all support messages" 
ON public.support_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can send messages to any conversation" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
) AND sender_user_id = auth.uid());

-- Crear índices para optimizar consultas
CREATE INDEX idx_support_conversations_user_id ON public.support_conversations(user_id);
CREATE INDEX idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX idx_support_messages_conversation_id ON public.support_messages(conversation_id);
CREATE INDEX idx_support_messages_sender_user_id ON public.support_messages(sender_user_id);