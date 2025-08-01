import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateTimeInMexicoTZ, formatTimeInMexicoTZ } from '@/utils/dateUtils';
import { CheckCheck, Check } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read?: boolean;
  read_at?: string;
  sender?: {
    full_name: string | null;
    profile_image_url?: string | null;
    role: string;
  } | null;
}

interface Conversation {
  id: string;
  patient_id: string;
  doctor_id: string;
  assistant_id?: string | null;
  created_at: string;
  updated_at: string;
  patient_profile?: {
    full_name: string | null;
    profile_image_url?: string | null;
  } | null;
  doctor_profile?: {
    full_name: string | null;
    profile_image_url?: string | null;
  } | null;
  assistant_profile?: {
    full_name: string | null;
    profile_image_url?: string | null;
  } | null;
  last_message?: Message | null;
}

interface ChatWindowProps {
  conversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

export const ChatWindow = ({ conversationId, onConversationSelect }: ChatWindowProps) => {
  const { user, userRole } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      subscribeToMessages();
      markMessagesAsRead();
    }
  }, [conversationId]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get conversations where the user is involved (through appointments)
      const userConversations = await Promise.all(
        (data || []).map(async (conv) => {
          // Get appointment details
          const { data: appointment } = await supabase
            .from('appointments')
            .select('doctor_user_id, patient_user_id')
            .eq('id', conv.appointment_id)
            .single();

          // Only include conversations where user is doctor or patient
          if (!appointment || (appointment.doctor_user_id !== user.id && appointment.patient_user_id !== user.id)) {
            return null;
          }

          // Get patient and doctor profiles
          const [patientProfile, doctorProfile] = await Promise.all([
            supabase.from('profiles').select('full_name, profile_image_url').eq('user_id', appointment.patient_user_id).single(),
            supabase.from('profiles').select('full_name, profile_image_url').eq('user_id', appointment.doctor_user_id).single()
          ]);

          // Get last message
          const { data: lastMsg } = await supabase
            .from('conversation_messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

          let lastMessageWithSender = null;
          if (lastMsg) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name, profile_image_url, role')
              .eq('user_id', lastMsg.sender_user_id)
              .single();

            lastMessageWithSender = {
              id: lastMsg.id,
              content: lastMsg.content,
              sender_id: lastMsg.sender_user_id,
              created_at: lastMsg.sent_at,
              sender: senderProfile
            };
          }

          return {
            id: conv.id,
            appointment_id: conv.appointment_id,
            created_at: conv.created_at,
            updated_at: conv.created_at,
            patient_id: appointment.patient_user_id,
            doctor_id: appointment.doctor_user_id,
            patient_profile: patientProfile.data,
            doctor_profile: doctorProfile.data,
            assistant_profile: null,
            last_message: lastMessageWithSender
          };
        })
      );

      // Filter out null values
      const validConversations = userConversations.filter(conv => conv !== null);
      setConversations(validConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles and read status for each message
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (message) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, profile_image_url, role')
            .eq('user_id', message.sender_user_id)
            .single();

          // Check if current user has read this message
          const { data: readStatus } = await supabase
            .from('message_reads')
            .select('read_at')
            .eq('message_id', message.id)
            .eq('user_id', user?.id || '')
            .single();

          return {
            id: message.id,
            content: message.content,
            sender_id: message.sender_user_id,
            created_at: message.sent_at,
            is_read: !!readStatus,
            read_at: readStatus?.read_at,
            sender: senderProfile
          };
        })
      );

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Skip messages from current user since they're handled optimistically
          if (payload.new.sender_user_id === user?.id) {
            return;
          }

          // Fetch the complete message with sender info for new messages from others
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, profile_image_url, role')
            .eq('user_id', payload.new.sender_user_id)
            .single();

          const newMessage: Message = {
            id: payload.new.id,
            content: payload.new.content,
            sender_id: payload.new.sender_user_id,
            created_at: payload.new.sent_at,
            sender: senderProfile
          };

          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Mark messages as read when conversation is opened
  const markMessagesAsRead = async () => {
    if (!conversationId || !user) return;

    try {
      // Get all messages in this conversation that are not from current user
      const { data: unreadMessages } = await supabase
        .from('conversation_messages')
        .select('id, sender_user_id')
        .eq('conversation_id', conversationId)
        .neq('sender_user_id', user.id);

      if (!unreadMessages || unreadMessages.length === 0) return;

      // Filter out messages that are already marked as read
      const messagesToMark = [];
      for (const message of unreadMessages) {
        const { data: existingRead } = await supabase
          .from('message_reads')
          .select('id')
          .eq('message_id', message.id)
          .eq('user_id', user.id)
          .single();

        if (!existingRead) {
          messagesToMark.push({
            message_id: message.id,
            user_id: user.id
          });
        }
      }

      // Insert read status for unread messages
      if (messagesToMark.length > 0) {
        const { error } = await supabase
          .from('message_reads')
          .insert(messagesToMark);

        if (error) {
          console.error('Error marking messages as read:', error);
        } else {
          console.log(`Marked ${messagesToMark.length} messages as read`);
          // Refresh messages to update read status
          fetchMessages();
        }
      }
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    let optimisticMessage: Message | null = null;
    
    try {
      // Get current user profile for immediate display
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, profile_image_url, role')
        .eq('user_id', user.id)
        .single();

      // Create optimistic message
      optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: messageContent,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        sender: userProfile
      };

      // Add message to state immediately for instant feedback
      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage('');

      // Send to database
      const { data: insertedMessage, error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: user.id,
          content: messageContent,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === optimisticMessage!.id 
            ? {
                ...optimisticMessage!,
                id: insertedMessage.id,
                created_at: insertedMessage.sent_at
              }
            : msg
        )
      );

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error if it was created
      if (optimisticMessage) {
        setMessages((prev) => 
          prev.filter(msg => msg.id !== optimisticMessage!.id)
        );
      }
      // Restore message content so user can try again
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getOtherParticipants = (conversation: Conversation) => {
    const participants = [];
    
    if (conversation.patient_id !== user?.id && conversation.patient_profile) {
      participants.push({
        name: conversation.patient_profile.full_name || 'Paciente',
        role: 'Paciente',
        image: conversation.patient_profile.profile_image_url,
      });
    }
    
    if (conversation.doctor_id !== user?.id && conversation.doctor_profile) {
      participants.push({
        name: conversation.doctor_profile.full_name || 'Doctor',
        role: 'Doctor',
        image: conversation.doctor_profile.profile_image_url,
      });
    }
    
    if (conversation.assistant_id && conversation.assistant_id !== user?.id && conversation.assistant_profile) {
      participants.push({
        name: conversation.assistant_profile.full_name || 'Asistente',
        role: 'Asistente',
        image: conversation.assistant_profile.profile_image_url,
      });
    }
    
    return participants;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'doctor':
        return 'bg-blue-100 text-blue-800';
      case 'patient':
        return 'bg-green-100 text-green-800';
      case 'assistant':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border border-border rounded-lg overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-border bg-background">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversaciones
          </h3>
        </div>
        <div className="overflow-y-auto h-full">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No hay conversaciones
            </div>
          ) : (
            conversations.map((conversation) => {
              const participants = getOtherParticipants(conversation);
              const isSelected = conversation.id === conversationId;
              
              return (
                <div
                  key={conversation.id}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                    isSelected ? 'bg-muted' : ''
                  }`}
                  onClick={() => onConversationSelect?.(conversation.id)}
                >
                  <div className="flex items-start gap-3">
                     <div className="flex -space-x-2">
                       {participants.slice(0, 2).map((participant, index) => (
                         <ProfileAvatar
                           key={index}
                           profileImageUrl={participant.image}
                           fallbackName={participant.name}
                           size="sm"
                           className="border-2 border-background"
                           role={participant.role as 'patient' | 'doctor' | 'assistant'}
                         />
                       ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {participants.map((participant, index) => (
                          <span key={index} className="text-sm font-medium truncate">
                            {participant.name}
                            {index < participants.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1 mb-2">
                        {participants.map((participant, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {participant.role}
                          </Badge>
                        ))}
                      </div>
                      {conversation.last_message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.last_message.content}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTimeInMexicoTZ(conversation.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {conversationId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                     <div className={`flex gap-3 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                       <ProfileAvatar
                         profileImageUrl={message.sender?.profile_image_url}
                         fallbackName={message.sender?.full_name}
                         size="sm"
                         className="shrink-0"
                         role={message.sender?.role as 'patient' | 'doctor' | 'assistant'}
                       />
                      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.sender?.full_name || 'Usuario'}
                          </span>
                          {message.sender?.role && (
                            <Badge className={`text-xs ${getRoleColor(message.sender.role)}`}>
                              {message.sender.role === 'doctor' ? 'Doctor' :
                               message.sender.role === 'patient' ? 'Paciente' :
                               message.sender.role === 'assistant' ? 'Asistente' :
                               message.sender.role === 'admin' ? 'Admin' : message.sender.role}
                            </Badge>
                          )}
                        </div>
                        <Card className={`p-3 ${
                          isOwnMessage 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </Card>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeInMexicoTZ(message.created_at)}
                          </span>
                          {isOwnMessage && (
                            <div className="text-xs text-muted-foreground">
                              {message.is_read ? (
                                <CheckCheck className="h-3 w-3 text-blue-500" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || sending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecciona una conversación para comenzar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};