import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChatWindow } from '@/components/ChatWindow';
import { MessageSquare, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AppointmentChatButtonProps {
  appointmentId: string;
  doctorName: string;
  appointmentStatus: string;
}

export const AppointmentChatButton = ({ 
  appointmentId, 
  doctorName, 
  appointmentStatus
}: AppointmentChatButtonProps) => {
  const { user } = useAuth();
  const { unreadCount: globalUnreadCount, refetch: refetchUnreadCount } = useUnreadMessages();
  const [chatOpen, setChatOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Don't show chat button for cancelled appointments
  if (appointmentStatus === 'cancelled') {
    return null;
  }

  const isCompleted = appointmentStatus === 'completed';
  const isScheduled = appointmentStatus === 'scheduled';
  
  const chatLabel = isCompleted 
    ? `Chatear con ${doctorName}` 
    : `Chatear con asistente de ${doctorName}`;
     
  const dialogTitle = isCompleted 
    ? `Chat con ${doctorName}` 
    : `Chat con asistente de ${doctorName}`;

  useEffect(() => {
    if (chatOpen && !conversationId) {
      getOrCreateConversation();
    }
  }, [chatOpen]);

  // Initialize conversation ID on component mount to enable notifications
  useEffect(() => {
    if (!conversationId && user) {
      initializeConversation();
    }
  }, [user]);

  const initializeConversation = async () => {
    try {
      // Check if conversation exists for this appointment
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single();

      if (existingConversation) {
        setConversationId(existingConversation.id);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

   // Subscribe to new messages to show notifications
  useEffect(() => {
    if (!conversationId || !user) return;

    console.log('Setting up message subscription for conversation:', conversationId);

    const channel = supabase
      .channel(`unread-messages-${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('New message received:', payload.new);
          // Only count messages from doctors (not from current user and sender must be doctor)
          if (payload.new.sender_user_id !== user.id) {
            // Check if sender is a doctor
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', payload.new.sender_user_id)
              .single();
            
            if (senderProfile?.role === 'doctor') {
              console.log('Message from doctor, incrementing count');
              setUnreadCount(prev => prev + 1);
            } else {
              console.log('Message not from doctor, ignoring');
            }
          } else {
            console.log('Message from current user, ignoring');
          }
        }
      )
      .subscribe();

    // Fetch initial unread count
    fetchUnreadCount();

    return () => {
      console.log('Cleaning up message subscription');
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, appointmentId]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (chatOpen && (unreadCount > 0 || globalUnreadCount > 0)) {
      setUnreadCount(0);
      // Mark messages as read when chat is opened
      markConversationMessagesAsRead();
      // Refresh global unread count
      refetchUnreadCount();
    }
  }, [chatOpen, refetchUnreadCount]);

  const markConversationMessagesAsRead = async () => {
    if (!conversationId || !user) return;

    try {
      // Get all unread messages from doctors in this conversation
      const { data: unreadMessages } = await supabase
        .from('conversation_messages')
        .select(`
          id,
          sender_user_id,
          profiles!conversation_messages_sender_user_id_fkey(role)
        `)
        .eq('conversation_id', conversationId)
        .neq('sender_user_id', user.id);

      if (!unreadMessages) return;

      // Filter to only doctor messages
      const doctorMessages = unreadMessages.filter(message => {
        const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
        return profile?.role === 'doctor';
      });

      // Mark each doctor message as read
      const readPromises = doctorMessages.map(message =>
        supabase
          .from('message_reads')
          .upsert({
            message_id: message.id,
            user_id: user.id
          }, {
            onConflict: 'message_id,user_id'
          })
      );

      await Promise.all(readPromises);
      console.log(`Marked ${doctorMessages.length} doctor messages as read`);
    } catch (error) {
      console.error('Error marking conversation messages as read:', error);
    }
  };

  const fetchUnreadCount = async () => {
    if (!conversationId || !user) return;

    try {
      console.log('Fetching unread count for conversation:', conversationId);
      
      // Get messages from doctors in the last hour that haven't been read by current user
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: unreadMessages } = await supabase
        .from('conversation_messages')
        .select(`
          id,
          sender_user_id,
          sent_at,
          profiles!conversation_messages_sender_user_id_fkey(role)
        `)
        .eq('conversation_id', conversationId)
        .neq('sender_user_id', user.id)
        .gte('sent_at', oneHourAgo.toISOString());

      if (!unreadMessages) {
        setUnreadCount(0);
        return;
      }

      // Filter to only doctor messages
      const doctorMessages = unreadMessages.filter(message => {
        const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
        return profile?.role === 'doctor';
      });

      // Check which of these messages haven't been read by the current user
      const unreadPromises = doctorMessages.map(async (message) => {
        const { data: readStatus } = await supabase
          .from('message_reads')
          .select('id')
          .eq('message_id', message.id)
          .eq('user_id', user.id)
          .single();

        return !readStatus; // Return true if not read
      });

      const unreadResults = await Promise.all(unreadPromises);
      const actualUnreadCount = unreadResults.filter(Boolean).length;

      console.log('Actual unread doctor messages:', actualUnreadCount);
      setUnreadCount(actualUnreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const getOrCreateConversation = async () => {
    setLoading(true);
    try {
      // Check if conversation exists for this appointment
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single();

      if (existingConversation) {
        setConversationId(existingConversation.id);
      } else {
        // Create new conversation using edge function to bypass RLS
        const { data, error } = await supabase.functions.invoke('create-conversation', {
          body: { appointmentId }
        });

        if (error) throw error;
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error('Error getting conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={chatOpen} onOpenChange={setChatOpen}>
      <DialogTrigger asChild>
        <div className="relative">
          <Button 
            variant="outline" 
            size="sm"
            className="mt-2"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {chatLabel}
          </Button>
          {(unreadCount > 0 || globalUnreadCount > 0) && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {(unreadCount + globalUnreadCount) > 9 ? '9+' : (unreadCount + globalUnreadCount)}
            </div>
          )}
          {(unreadCount > 0 || globalUnreadCount > 0) && (
            <Bell className="absolute -top-2 -left-2 h-4 w-4 text-blue-600 animate-bounce" />
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
            </div>
          ) : conversationId ? (
            <ChatWindow conversationId={conversationId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se pudo cargar la conversación
            </div>
          )}
        </div>
        {isScheduled && (
          <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border border-blue-200">
            Estás chateando con el asistente de {doctorName}. Te ayudará con dudas sobre tu cita programada.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};