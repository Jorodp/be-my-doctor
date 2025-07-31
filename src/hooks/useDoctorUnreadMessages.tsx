import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useDoctorUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

    // Subscribe to new messages
    const messageChannel = supabase
      .channel('doctor-unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages'
        },
        async (payload) => {
          console.log('Doctor: New message detected:', payload);
          
          // Check if this message is from a patient to this doctor
          const { data: conversation } = await supabase
            .from('conversations')
            .select('appointment_id')
            .eq('id', payload.new.conversation_id)
            .single();

          if (!conversation) return;

          const { data: appointment } = await supabase
            .from('appointments')
            .select('doctor_user_id, patient_user_id')
            .eq('id', conversation.appointment_id)
            .single();

          if (!appointment || appointment.doctor_user_id !== user.id) return;

          // Check if message is from patient (not from current doctor)
          if (payload.new.sender_user_id !== user.id) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', payload.new.sender_user_id)
              .single();

            if (senderProfile?.role === 'patient') {
              console.log('Doctor: Incrementing unread count for patient message');
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to message reads to decrease count
    const readChannel = supabase
      .channel('doctor-message-reads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Doctor: Message marked as read:', payload);
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
      console.log('Doctor: Fetching unread count for user:', user.id);

      // Get all appointments where this user is the doctor
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_user_id', user.id)
        .eq('status', 'completed'); // Only completed appointments have chat

      if (!appointments) {
        setUnreadCount(0);
        return;
      }

      let totalUnread = 0;

      for (const appointment of appointments) {
        // Get conversation for this appointment
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('appointment_id', appointment.id)
          .single();

        if (!conversation) continue;

        // Get recent messages from patients in this conversation
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const { data: messages } = await supabase
          .from('conversation_messages')
          .select(`
            id,
            sender_user_id,
            profiles!conversation_messages_sender_user_id_fkey(role)
          `)
          .eq('conversation_id', conversation.id)
          .neq('sender_user_id', user.id)
          .gte('sent_at', oneHourAgo.toISOString());

        if (!messages) continue;

        // Filter messages from patients only
        const patientMessages = messages.filter(message => {
          const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
          return profile?.role === 'patient';
        });

        // Check which messages haven't been read by the doctor
        const unreadPromises = patientMessages.map(async (message) => {
          const { data: readStatus } = await supabase
            .from('message_reads')
            .select('id')
            .eq('message_id', message.id)
            .eq('user_id', user.id)
            .single();

          return !readStatus;
        });

        const unreadResults = await Promise.all(unreadPromises);
        const unreadInThisConversation = unreadResults.filter(Boolean).length;
        totalUnread += unreadInThisConversation;
      }

      console.log('Doctor: Total unread messages:', totalUnread);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Doctor: Error fetching unread count:', error);
    }
  };

  return {
    unreadCount,
    refetch: fetchUnreadCount
  };
};