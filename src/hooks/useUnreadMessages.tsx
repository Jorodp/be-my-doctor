import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageTime, setLastMessageTime] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Get initial unread count
    fetchUnreadCount();

    // Subscribe to new messages in real-time
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages'
        },
        async (payload) => {
          console.log('New message detected:', payload);
          
          // Check if this message is for the current user (they are a participant)
          const { data: conversation } = await supabase
            .from('conversations')
            .select('appointment_id')
            .eq('id', payload.new.conversation_id)
            .single();

          if (!conversation) return;

          // Check if user is involved in this appointment
          const { data: appointment } = await supabase
            .from('appointments')
            .select('doctor_user_id, patient_user_id')
            .eq('id', conversation.appointment_id)
            .single();

          if (!appointment) return;

          // If the message is not from the current user and they're involved in the conversation
          const isUserInvolved = appointment.doctor_user_id === user.id || appointment.patient_user_id === user.id;
          const isMessageFromCurrentUser = payload.new.sender_user_id === user.id;

          if (isUserInvolved && !isMessageFromCurrentUser) {
            // Get sender role to filter appropriately
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', payload.new.sender_user_id)
              .single();

            // For doctors: only count patient messages
            // For patients: only count doctor messages
            const shouldCount = 
              (appointment.doctor_user_id === user.id && senderProfile?.role === 'patient') ||
              (appointment.patient_user_id === user.id && senderProfile?.role === 'doctor');

            if (shouldCount) {
              setUnreadCount(prev => prev + 1);
              setLastMessageTime(payload.new.sent_at);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      // Obtener todas las conversaciones donde el usuario participa
      const { data: userConversations } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(
            appointment_id,
            appointments!inner(doctor_user_id, patient_user_id)
          )
        `)
        .eq('user_id', user.id);

      if (!userConversations) return;

      let totalUnread = 0;
      let latestMessageTime: string | null = null;

      // Para cada conversación, contar mensajes no leídos
      for (const participant of userConversations) {
        const conversationId = participant.conversation_id;
        const appointment = (participant.conversations as any)?.appointments;
        
        if (!appointment) continue;
        
        // Obtener mensajes recientes que no son del usuario actual
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: messages } = await supabase
          .from('conversation_messages')
          .select(`
            id,
            sent_at, 
            sender_user_id
          `)
          .eq('conversation_id', conversationId)
          .neq('sender_user_id', user.id) // Mensajes no del usuario actual
          .gte('sent_at', today.toISOString())
          .order('sent_at', { ascending: false });

        if (messages && messages.length > 0) {
          // Para ahora, contar todos los mensajes no del usuario
          totalUnread += messages.length;
          
          // Rastrear el tiempo del mensaje más reciente
          if (messages.length > 0) {
            const latestInConversation = messages[0].sent_at;
            if (!latestMessageTime || latestInConversation > latestMessageTime) {
              latestMessageTime = latestInConversation;
            }
          }
        }
      }

      setUnreadCount(totalUnread);
      setLastMessageTime(latestMessageTime);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = (conversationId?: string) => {
    // You can implement logic to mark specific conversations as read
    // For now, we'll reset the count when user opens chat
    setUnreadCount(0);
  };

  return {
    unreadCount,
    lastMessageTime,
    markAsRead,
    refetch: fetchUnreadCount
  };
};