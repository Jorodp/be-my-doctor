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
      // Get all conversations where user is involved
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          id,
          appointment_id,
          appointments!inner(doctor_user_id, patient_user_id)
        `)
        .or(`appointments.doctor_user_id.eq.${user.id},appointments.patient_user_id.eq.${user.id}`);

      if (!conversations) return;

      let totalUnread = 0;
      let latestMessageTime: string | null = null;

      // For each conversation, count unread messages based on user role
      for (const conversation of conversations) {
        // Get the last message the user read (you might want to track this in a separate table)
        // For now, we'll consider messages from today as potentially unread
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: messages } = await supabase
          .from('conversation_messages')
          .select(`
            sent_at, 
            sender_user_id,
            profiles!conversation_messages_sender_user_id_fkey(role)
          `)
          .eq('conversation_id', conversation.id)
          .neq('sender_user_id', user.id) // Messages not from current user
          .gte('sent_at', today.toISOString())
          .order('sent_at', { ascending: false });

        if (messages && messages.length > 0) {
          // Filter messages based on user role
          const relevantMessages = messages.filter(message => {
            const appointment = Array.isArray(conversation.appointments) ? conversation.appointments[0] : conversation.appointments;
            const isUserDoctor = appointment?.doctor_user_id === user.id;
            const isUserPatient = appointment?.patient_user_id === user.id;
            
            const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
            
            // For doctors: only count patient messages
            // For patients: only count doctor messages
            return (isUserDoctor && profile?.role === 'patient') ||
                   (isUserPatient && profile?.role === 'doctor');
          });
          
          totalUnread += relevantMessages.length;
          
          // Track the latest message time from relevant messages
          if (relevantMessages.length > 0) {
            const latestInConversation = relevantMessages[0].sent_at;
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