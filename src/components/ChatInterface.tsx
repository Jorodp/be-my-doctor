import { useState } from 'react';
import { ChatWindow } from './ChatWindow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface ChatInterfaceProps {
  defaultConversationId?: string;
}

export const ChatInterface = ({ defaultConversationId }: ChatInterfaceProps) => {
  const { user, userRole } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState(defaultConversationId);
  const [isCreating, setIsCreating] = useState(false);
  const [newConversation, setNewConversation] = useState({
    patientId: '',
    doctorId: '',
    assistantId: ''
  });

  const createConversation = async () => {
    if (!user || !newConversation.patientId || !newConversation.doctorId) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un paciente y un doctor",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          patient_id: newConversation.patientId,
          doctor_id: newConversation.doctorId,
          assistant_id: newConversation.assistantId || null
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedConversationId(data.id);
      setNewConversation({ patientId: '', doctorId: '', assistantId: '' });
      
      toast({
        title: "Conversación creada",
        description: "La nueva conversación ha sido creada exitosamente"
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                Chat de Comunicación
              </CardTitle>
              <CardDescription>
                Comunícate en tiempo real con pacientes, doctores y asistentes
              </CardDescription>
            </div>
            {(userRole === 'admin' || userRole === 'assistant') && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Conversación
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Conversación</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Paciente</label>
                      <Select value={newConversation.patientId} onValueChange={(value) => 
                        setNewConversation(prev => ({ ...prev, patientId: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* This would be populated with actual patients */}
                          <SelectItem value="patient1">Paciente Demo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Doctor</label>
                      <Select value={newConversation.doctorId} onValueChange={(value) => 
                        setNewConversation(prev => ({ ...prev, doctorId: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* This would be populated with actual doctors */}
                          <SelectItem value="doctor1">Doctor Demo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Asistente (Opcional)</label>
                      <Select value={newConversation.assistantId} onValueChange={(value) => 
                        setNewConversation(prev => ({ ...prev, assistantId: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar asistente" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* This would be populated with actual assistants */}
                          <SelectItem value="none">Sin asistente</SelectItem>
                          <SelectItem value="assistant1">Asistente Demo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createConversation} disabled={isCreating} className="w-full">
                      {isCreating ? "Creando..." : "Crear Conversación"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ChatWindow 
            conversationId={selectedConversationId}
            onConversationSelect={setSelectedConversationId}
          />
        </CardContent>
      </Card>
    </div>
  );
};