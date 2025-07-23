import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChatWindow } from '@/components/ChatWindow';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AppointmentChatButtonProps {
  appointmentId: string;
  doctorName: string;
  isCompleted?: boolean;
}

export const AppointmentChatButton = ({ 
  appointmentId, 
  doctorName, 
  isCompleted = false 
}: AppointmentChatButtonProps) => {
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (chatOpen && !conversationId) {
      getOrCreateConversation();
    }
  }, [chatOpen]);

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
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({ appointment_id: appointmentId })
          .select('id')
          .single();

        if (error) throw error;
        setConversationId(newConversation.id);
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
        <Button 
          variant="outline" 
          size="sm"
          className="mt-2"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Chatear con Dr. {doctorName}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Chat con Dr. {doctorName}
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
        {isCompleted && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
            Esta consulta ya finalizó. Puedes revisar el historial de mensajes pero no enviar nuevos.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};