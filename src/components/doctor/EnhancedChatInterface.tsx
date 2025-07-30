import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, User, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatTimeInMexicoTZ, formatDateTimeInMexicoTZ } from '@/utils/dateUtils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_user_id: string;
  created_at: string;
  sender_profile?: {
    full_name: string;
    profile_image_url?: string;
  };
}

interface EnhancedChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  patientName: string;
  patientId: string;
  doctorId: string;
}

export const EnhancedChatInterface = ({ 
  isOpen, 
  onClose, 
  appointmentId, 
  patientName, 
  patientId,
  doctorId 
}: EnhancedChatInterfaceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && appointmentId) {
      initializeConversation();
    }
  }, [isOpen, appointmentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    setLoading(true);
    try {
      // First try to find existing conversation
      let { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single();

      let convId = null;

      if (existingConversation) {
        convId = existingConversation.id;
      } else {
        // Create new conversation using edge function to bypass RLS
        const { data: newConversation, error: createError } = await supabase.functions.invoke('create-conversation', {
          body: {
            appointment_id: appointmentId,
            patient_id: patientId,
            doctor_id: doctorId
          }
        });

        if (createError) {
          console.error('Error creating conversation via edge function:', createError);
          throw createError;
        }

        convId = newConversation?.conversation_id;
      }

      if (convId) {
        setConversationId(convId);
        await loadMessages(convId);
        setupRealtimeSubscription(convId);
      } else {
        throw new Error('No se pudo crear o encontrar la conversación');
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la conversación",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('conversation_messages')
        .select(`
          id,
          content,
          sender_user_id,
          created_at
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const messagesWithProfiles = await Promise.all(
        (messagesData || []).map(async (message) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_image_url')
            .eq('user_id', message.sender_user_id)
            .single();

          return {
            ...message,
            sender_profile: profile
          };
        })
      );

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const setupRealtimeSubscription = (convId: string) => {
    const channel = supabase
      .channel(`conversation-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${convId}`
        },
        async (payload) => {
          // Fetch sender profile for new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_image_url')
            .eq('user_id', payload.new.sender_user_id)
            .single();

          const newMessage = {
            ...payload.new as Message,
            sender_profile: profile
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Chat con {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 border rounded-lg bg-muted/30">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-5 w-5 animate-spin mr-2" />
                Cargando conversación...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Inicia la conversación con tu paciente</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_user_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_user_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-6 w-6">
                        {message.sender_profile?.profile_image_url ? (
                          <AvatarImage src={message.sender_profile.profile_image_url} />
                        ) : (
                          <AvatarFallback>
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-xs font-medium">
                        {message.sender_profile?.full_name || 'Usuario'}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatTimeInMexicoTZ(message.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Escribe tu mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading || !conversationId}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || loading || !conversationId}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};