import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChatWindow } from '@/components/ChatWindow';
import { Search, MessageSquare, User } from 'lucide-react';
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
      // Obtener todas las citas del doctor para identificar pacientes
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('patient_user_id, starts_at, status')
        .eq('doctor_user_id', user.id)
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
            last_appointment_status: appointment.status
          });
        }
      }

      // Obtener conversaciones existentes para cada paciente usando appointment_id
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
            }
          }
        }
      }

      setPatients(patientsArray);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateConversation = async (patient: PatientWithLastAppointment) => {
    try {
      // Get the most recent appointment for this patient-doctor pair
      const { data: appointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_user_id', patient.user_id)
        .eq('doctor_user_id', user!.id)
        .order('starts_at', { ascending: false })
        .limit(1)
        .single();

      if (!appointment) {
        throw new Error('No appointment found for this patient');
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

      // Create new conversation using appointment_id
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          appointment_id: appointment.id
        })
        .select('id')
        .single();

      if (error) throw error;
      return newConversation.id;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  };

  const handleChatClick = async (patient: PatientWithLastAppointment) => {
    const conversationId = await getOrCreateConversation(patient);
    if (conversationId) {
      setSelectedConversation(conversationId);
      setSelectedPatient(patient);
      setChatOpen(true);
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
          Comunícate directamente con tus pacientes
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
                {searchTerm ? 'No se encontraron pacientes' : 'No tienes pacientes aún'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={patient.profile_image_url} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{patient.full_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Última cita: {format(new Date(patient.last_appointment_date), 'd MMM yyyy', { locale: es })}
                        </span>
                        <Badge variant={getStatusBadgeVariant(patient.last_appointment_status)}>
                          {getStatusText(patient.last_appointment_status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChatClick(patient)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
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