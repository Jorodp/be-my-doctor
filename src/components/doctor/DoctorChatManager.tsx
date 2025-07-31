import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChatWindow } from '@/components/ChatWindow';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Search, MessageSquare, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PatientWithLastAppointment {
  user_id: string;
  full_name: string;
  profile_image_url?: string;
  last_appointment_date: string;
  last_appointment_status: string;
  conversation_id?: string;
  unread_messages: number;
  last_message_time?: string;
}

export const DoctorChatManager = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientWithLastAppointment[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientWithLastAppointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithLastAppointment | null>(null);

  // Subscribe to real-time message updates and read status changes
  useEffect(() => {
    if (!user) return;

    const messageChannel = supabase
      .channel('doctor-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages'
        },
        async (payload) => {
          console.log('New message detected:', payload);
          // Refresh patients list to update unread counts
          fetchPatients();
        }
      )
      .subscribe();

    // Subscribe to message reads to update counts when messages are marked as read
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
          console.log('Message marked as read by doctor:', payload);
          // Refresh patients list to update unread counts
          fetchPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(readChannel);
    };
  }, [user]);

  useEffect(() => {
    fetchPatients();
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient =>
        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Obtener solo las citas completadas del doctor para permitir chat
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('patient_user_id, starts_at, status')
        .eq('doctor_user_id', user.id)
        .eq('status', 'completed')
        .order('starts_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Crear mapa de pacientes únicos con su última cita
      const patientsMap = new Map<string, PatientWithLastAppointment>();

      for (const appointment of appointments || []) {
        const patientId = appointment.patient_user_id;
        
        if (!patientsMap.has(patientId)) {
          // Obtener perfil del paciente
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_image_url')
            .eq('user_id', patientId)
            .single();

          patientsMap.set(patientId, {
            user_id: patientId,
            full_name: profile?.full_name || 'Paciente sin nombre',
            profile_image_url: profile?.profile_image_url,
            last_appointment_date: appointment.starts_at,
            last_appointment_status: appointment.status,
            unread_messages: 0
          });
        }
      }

      // Obtener conversaciones existentes y contar mensajes no leídos
      const patientsArray = Array.from(patientsMap.values());
      
      for (const patient of patientsArray) {
        // Find the most recent appointment for this patient
        const recentAppointment = appointments?.find(app => app.patient_user_id === patient.user_id);
        
        if (recentAppointment) {
          // Get appointment ID for the most recent appointment
          const { data: fullAppointment } = await supabase
            .from('appointments')
            .select('id')
            .eq('patient_user_id', patient.user_id)
            .eq('doctor_user_id', user.id)
            .order('starts_at', { ascending: false })
            .limit(1)
            .single();

          if (fullAppointment) {
            const { data: conversation } = await supabase
              .from('conversations')
              .select('id')
              .eq('appointment_id', fullAppointment.id)
              .single();
            
            if (conversation) {
              patient.conversation_id = conversation.id;
              
              // Count unread messages (messages from patients that haven't been read)
              const oneHourAgo = new Date();
              oneHourAgo.setHours(oneHourAgo.getHours() - 1);
              
              const { data: messages } = await supabase
                .from('conversation_messages')
                .select(`
                  id,
                  sent_at,
                  sender_user_id,
                  profiles!conversation_messages_sender_user_id_fkey(role)
                `)
                .eq('conversation_id', conversation.id)
                .neq('sender_user_id', user.id) // Messages not from doctor
                .gte('sent_at', oneHourAgo.toISOString())
                .order('sent_at', { ascending: false });

              // Filter messages to only include those from patients
              const patientMessages = messages?.filter(message => {
                const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
                return profile?.role === 'patient';
              }) || [];

              // Check which of these patient messages haven't been read by the doctor
              const unreadPromises = patientMessages.map(async (message) => {
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

              patient.unread_messages = actualUnreadCount;
              
              if (actualUnreadCount > 0) {
                // Find the most recent unread message
                const unreadIndices = unreadResults.map((isUnread, index) => isUnread ? index : -1).filter(i => i !== -1);
                if (unreadIndices.length > 0) {
                  patient.last_message_time = patientMessages[unreadIndices[0]].sent_at;
                }
              }
            }
          }
        }
      }

      // Sort patients: those with unread messages first, then by last appointment date
      patientsArray.sort((a, b) => {
        if (a.unread_messages > 0 && b.unread_messages === 0) return -1;
        if (a.unread_messages === 0 && b.unread_messages > 0) return 1;
        return new Date(b.last_appointment_date).getTime() - new Date(a.last_appointment_date).getTime();
      });

      setPatients(patientsArray);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateConversation = async (patient: PatientWithLastAppointment) => {
    try {
      // Get the most recent completed appointment for this patient-doctor pair
      const { data: appointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_user_id', patient.user_id)
        .eq('doctor_user_id', user!.id)
        .eq('status', 'completed')
        .order('starts_at', { ascending: false })
        .limit(1)
        .single();

      if (!appointment) {
        throw new Error('No hay citas completadas con este paciente');
      }

      // Check if conversation exists for this appointment
      let { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('appointment_id', appointment.id)
        .single();

      if (existingConversation) {
        return existingConversation.id;
      }

      // Create new conversation using the edge function
      const { data: createResponse, error: createError } = await supabase.functions.invoke('create-conversation', {
        body: {
          appointment_id: appointment.id,
          patient_id: patient.user_id,
          doctor_id: user!.id
        }
      });

      if (createError) throw createError;
      return createResponse.conversation_id;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  };

  const markPatientMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      // Get all unread messages from patients in this conversation
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

      // Filter to only patient messages
      const patientMessages = unreadMessages.filter(message => {
        const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
        return profile?.role === 'patient';
      });

      // Mark each patient message as read
      const readPromises = patientMessages.map(message =>
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
      console.log(`Marked ${patientMessages.length} patient messages as read`);
    } catch (error) {
      console.error('Error marking patient messages as read:', error);
    }
  };

  const handleChatClick = async (patient: PatientWithLastAppointment) => {
    const conversationId = await getOrCreateConversation(patient);
    if (conversationId) {
      setSelectedConversation(conversationId);
      setSelectedPatient(patient);
      setChatOpen(true);
      
      // Mark patient messages as read when opening chat
      await markPatientMessagesAsRead(conversationId);
      
      // Refresh patient list to update unread counts
      fetchPatients();
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'scheduled':
        return 'Programada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Chat con Pacientes
        </CardTitle>
        <CardDescription>
          Chat disponible solo para citas completadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de pacientes */}
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4" />
              <p>
                {searchTerm ? 'No se encontraron pacientes' : 'No tienes citas completadas aún'}
              </p>
            </div>
          ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.user_id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                      patient.unread_messages > 0 ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                     <div className="flex items-center gap-3">
                       <div className="relative">
                         <ProfileAvatar 
                           profileImageUrl={patient.profile_image_url}
                           fallbackName={patient.full_name}
                           size="md"
                           role="patient"
                         />
                         {patient.unread_messages > 0 && (
                           <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                             {patient.unread_messages > 9 ? '9+' : patient.unread_messages}
                           </div>
                         )}
                       </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{patient.full_name}</h4>
                          {patient.unread_messages > 0 && (
                            <Bell className="h-4 w-4 text-blue-600 animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Última cita: {format(new Date(patient.last_appointment_date), 'd MMM yyyy', { locale: es })}
                          </span>
                          <Badge variant={getStatusBadgeVariant(patient.last_appointment_status)}>
                            {getStatusText(patient.last_appointment_status)}
                          </Badge>
                        </div>
                        {patient.unread_messages > 0 && patient.last_message_time && (
                          <div className="text-xs text-blue-600 font-medium">
                            Nuevo mensaje: {format(new Date(patient.last_message_time), 'HH:mm', { locale: es })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <Button
                        variant={patient.unread_messages > 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleChatClick(patient)}
                        className={patient.unread_messages > 0 ? "bg-blue-600 hover:bg-blue-700" : ""}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {patient.unread_messages > 0 ? `Chat (${patient.unread_messages})` : 'Chat'}
                      </Button>
                      {patient.unread_messages > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse z-10">
                          {patient.unread_messages > 9 ? '9+' : patient.unread_messages}
                        </div>
                      )}
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog para el chat */}
        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Chat con {selectedPatient?.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              {selectedConversation ? (
                <ChatWindow conversationId={selectedConversation} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No se pudo cargar la conversación
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};