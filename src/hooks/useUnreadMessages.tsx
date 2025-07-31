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
    const messageChannel = supabase
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

          console.log('Message analysis:', {
            currentUserId: user.id,
            senderId: payload.new.sender_user_id,
            isUserInvolved,
            isMessageFromCurrentUser,
            appointmentDoctorId: appointment.doctor_user_id,
            appointmentPatientId: appointment.patient_user_id
          });

          if (isUserInvolved && !isMessageFromCurrentUser) {
            // Get sender role to filter appropriately
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', payload.new.sender_user_id)
              .single();

            console.log('Sender profile:', senderProfile);

            // For doctors: only count patient messages
            // For patients: only count doctor messages
            const shouldCount = 
              (appointment.doctor_user_id === user.id && senderProfile?.role === 'patient') ||
              (appointment.patient_user_id === user.id && senderProfile?.role === 'doctor');

            console.log('Should count message:', {
              shouldCount,
              currentUserRole: appointment.doctor_user_id === user.id ? 'doctor' : 'patient',
              senderRole: senderProfile?.role
            });

            if (shouldCount) {
              console.log('Incrementing unread count for new message');
              setUnreadCount(prev => prev + 1);
              setLastMessageTime(payload.new.sent_at);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to message reads to decrease count when messages are marked as read
    const readChannel = supabase
      .channel('message-reads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Message marked as read:', payload);
          // Refetch count when a message is marked as read
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(readChannel);
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
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        console.log('Fetching messages for conversation:', conversationId, 'User ID:', user.id);

        const { data: messages } = await supabase
          .from('conversation_messages')
          .select(`
            id,
            sent_at, 
            sender_user_id,
            profiles!conversation_messages_sender_user_id_fkey(role)
          `)
          .eq('conversation_id', conversationId)
          .neq('sender_user_id', user.id) // Mensajes no del usuario actual
          .gte('sent_at', oneHourAgo.toISOString())
          .order('sent_at', { ascending: false });

        console.log('Messages found:', messages?.length || 0, 'for conversation:', conversationId);

        if (messages && messages.length > 0) {
          // Filtrar solo mensajes de doctores para pacientes o de pacientes para doctores
          const relevantMessages = messages.filter(message => {
            const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
            
            console.log('Message analysis:', {
              messageId: message.id,
              senderId: message.sender_user_id,
              senderRole: profile?.role,
              currentUserId: user.id,
              appointmentDoctorId: appointment.doctor_user_id,
              appointmentPatientId: appointment.patient_user_id
            });
            
            // Para pacientes: solo contar mensajes de doctores
            if (appointment.patient_user_id === user.id) {
              return profile?.role === 'doctor';
            }
            
            // Para doctores: solo contar mensajes de pacientes  
            if (appointment.doctor_user_id === user.id) {
              return profile?.role === 'patient';
            }
            
            return false;
          });

          console.log('Relevant messages after filtering:', relevantMessages.length);

          // Verificar cuáles de estos mensajes NO han sido leídos por el usuario actual
          const unreadPromises = relevantMessages.map(async (message) => {
            const { data: readStatus } = await supabase
              .from('message_reads')
              .select('id')
              .eq('message_id', message.id)
              .eq('user_id', user.id)
              .single();

            return !readStatus; // Return true if not read
          });

          const unreadResults = await Promise.all(unreadPromises);
          const unreadInThisConversation = unreadResults.filter(Boolean).length;
          
          console.log('Unread in this conversation:', unreadInThisConversation, 'of', relevantMessages.length, 'relevant messages');
          
          totalUnread += unreadInThisConversation;
          
          // Rastrear el tiempo del mensaje más reciente
          if (relevantMessages.length > 0) {
            const latestInConversation = relevantMessages[0].sent_at;
            if (!latestMessageTime || latestInConversation > latestMessageTime) {
              latestMessageTime = latestInConversation;
            }
          }
        }
      }

      console.log('Total unread messages:', totalUnread);
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