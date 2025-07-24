import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, User, UserCheck, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  content: string;
  sender_user_id: string;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
}

interface CustomerSupportChatProps {
  reason?: 'physical_payment' | 'general';
}

export const CustomerSupportChat = ({ reason = 'general' }: CustomerSupportChatProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && profile) {
      initializeChat();
    }
  }, [user, profile, reason]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  const initializeChat = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      
      // Crear o obtener conversación de soporte
      const { data: conversation, error: convError } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('reason', reason)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convError) throw convError;

      let currentConversationId = conversation?.id;

      if (!currentConversationId) {
        // Crear nueva conversación
        const { data: newConversation, error: createError } = await supabase
          .from('support_conversations')
          .insert({
            user_id: user.id,
            reason,
            status: 'active',
            title: reason === 'physical_payment' 
              ? 'Solicitud de Pago Físico' 
              : 'Consulta General'
          })
          .select()
          .single();

        if (createError) throw createError;
        currentConversationId = newConversation.id;

        // Enviar mensaje inicial automático
        const initialMessage = reason === 'physical_payment'
          ? `Hola! Soy Dr. ${profile.full_name} y me gustaría solicitar información sobre cómo realizar el pago de mi suscripción en efectivo o con tarjeta física. Por favor, proporciónenme los detalles para proceder con el pago.`
          : `Hola! Soy Dr. ${profile.full_name} y necesito ayuda con una consulta general.`;

        await supabase
          .from('support_messages')
          .insert({
            conversation_id: currentConversationId,
            sender_user_id: user.id,
            content: initialMessage
          });
      }

      setConversationId(currentConversationId);
      await loadMessages(currentConversationId);
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Error",
        description: "No se pudo inicializar el chat de soporte",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          sender:profiles!support_messages_sender_user_id_fkey(full_name, role)
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_user_id: msg.sender_user_id,
        created_at: msg.created_at,
        sender_name: msg.sender?.full_name || 'Usuario',
        sender_role: msg.sender?.role || 'user'
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    try {
      const messageContent = newMessage.trim();
      setNewMessage('');

      const { error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: user.id,
          content: messageContent
        });

      if (error) throw error;

      // Recargar mensajes
      await loadMessages(conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getReasonBadge = () => {
    if (reason === 'physical_payment') {
      return (
        <Badge variant="secondary" className="mb-4">
          <MessageCircle className="w-3 h-3 mr-1" />
          Solicitud de Pago Físico
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="mb-4">
        <MessageCircle className="w-3 h-3 mr-1" />
        Consulta General
      </Badge>
    );
  };

  if (loading && !conversationId) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat de Atención al Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Iniciando chat...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat de Atención al Cliente
        </CardTitle>
        {getReasonBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-96 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_user_id === user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender_user_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.sender_role === 'admin' ? (
                      <UserCheck className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <span className="text-xs font-medium">
                      {message.sender_name}
                      {message.sender_role === 'admin' && ' (Soporte)'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {reason === 'physical_payment' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Información sobre Pagos Físicos</h4>
            <p className="text-sm text-blue-700">
              Nuestro equipo de atención al cliente te ayudará con los detalles para realizar 
              el pago de tu suscripción en efectivo o con tarjeta física. Por favor, 
              proporciona la información solicitada para proceder.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};