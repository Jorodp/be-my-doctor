import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatTimeInMexicoTZ, formatDateTimeInMexicoTZ, formatInMexicoTZ } from '@/utils/dateUtils';
import {
  User,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  MessageCircle,
  Phone,
  MapPin,
  DollarSign,
  Upload,
  Download
} from 'lucide-react';

interface AppointmentDetail {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  price?: number | null;
  patient_user_id: string;
  doctor_user_id: string;
  consultation_status?: string;
  patient_profile?: {
    full_name: string;
    phone: string;
    profile_image_url?: string;
    address?: string;
    date_of_birth?: string;
  };
}

interface ConsultationNote {
  id: string;
  diagnosis: string;
  prescription: string;
  recommendations: string;
  follow_up_date: string;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  sender_user_id: string;
  sent_at: string;
  sender_profile?: {
    full_name: string;
  };
}

interface AppointmentDetailModalProps {
  appointment: AppointmentDetail | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

export function AppointmentDetailModal({ 
  appointment, 
  isOpen, 
  onClose, 
  userRole 
}: AppointmentDetailModalProps) {
  const { toast } = useToast();
  const [consultationNotes, setConsultationNotes] = useState<ConsultationNote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (appointment && isOpen) {
      fetchAppointmentDetails();
    }
  }, [appointment, isOpen]);

  const fetchAppointmentDetails = async () => {
    if (!appointment) return;
    
    setLoading(true);
    try {
      // Fetch consultation notes
      const { data: notes } = await supabase
        .from('consultation_notes')
        .select('*')
        .eq('appointment_id', appointment.id)
        .order('created_at', { ascending: false });

      setConsultationNotes(notes || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('consultation_payments')
        .select('*')
        .eq('appointment_id', appointment.id)
        .order('created_at', { ascending: false });

      setPayments(paymentsData || []);

      // Fetch chat messages (if conversation exists)
      const { data: conversation } = await supabase
        .from('conversations')
        .select(`
          id,
          conversation_messages(
            id,
            content,
            sender_user_id,
            sent_at,
            profiles!conversation_messages_sender_user_id_fkey(full_name)
          )
        `)
        .eq('appointment_id', appointment.id)
        .single();

      if (conversation?.conversation_messages) {
        const messagesWithSender = conversation.conversation_messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender_user_id: msg.sender_user_id,
          sent_at: msg.sent_at,
          sender_profile: msg.profiles
        }));
        setMessages(messagesWithSender);
      }

    } catch (error) {
      console.error('Error fetching appointment details:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la cita",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Detalles de la Cita - {appointment.patient_profile?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={appointment.patient_profile?.profile_image_url} />
                      <AvatarFallback>
                        {appointment.patient_profile?.full_name?.split(' ').map(n => n[0]).join('') || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{appointment.patient_profile?.full_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {appointment.patient_profile?.phone || 'No especificado'}
                      </div>
                    </div>
                  </div>
                  
                  {appointment.patient_profile?.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {appointment.patient_profile.address}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(appointment.starts_at), 'EEEE, dd MMMM yyyy', { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatTimeInMexicoTZ(appointment.starts_at)} - {formatTimeInMexicoTZ(appointment.ends_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(appointment.status)}>
                      {getStatusText(appointment.status)}
                    </Badge>
                    {appointment.price && (
                      <Badge variant="outline" className="text-green-600">
                        <DollarSign className="h-3 w-3 mr-1" />
                        ${appointment.price}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {appointment.notes && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Notas de la Cita</h4>
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for detailed info */}
          <Tabs defaultValue="consultation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="consultation">Consulta</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="payments">Pagos</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="consultation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notas de Consulta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Cargando...</p>
                    </div>
                  ) : consultationNotes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p>No hay notas de consulta registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {consultationNotes.map((note) => (
                        <div key={note.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">Consulta</h4>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTimeInMexicoTZ(note.created_at)}
                            </span>
                          </div>
                          
                          {note.diagnosis && (
                            <div>
                              <h5 className="font-medium text-sm mb-1">Diagnóstico:</h5>
                              <p className="text-sm text-muted-foreground">{note.diagnosis}</p>
                            </div>
                          )}
                          
                          {note.prescription && (
                            <div>
                              <h5 className="font-medium text-sm mb-1">Receta:</h5>
                              <p className="text-sm text-muted-foreground">{note.prescription}</p>
                            </div>
                          )}
                          
                          {note.recommendations && (
                            <div>
                              <h5 className="font-medium text-sm mb-1">Recomendaciones:</h5>
                              <p className="text-sm text-muted-foreground">{note.recommendations}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Conversación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>No hay mensajes en esta conversación</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {messages.map((message) => (
                        <div key={message.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">
                              {message.sender_profile?.full_name || 'Usuario'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTimeInMexicoTZ(message.sent_at)}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Historial de Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-8 w-8 mx-auto mb-2" />
                      <p>No hay pagos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="border rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium">${payment.amount}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.payment_method} • {format(new Date(payment.created_at), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {payment.status === 'completed' ? 'Pagado' : payment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Documentos del Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2" />
                    <p>Funcionalidad de documentos en desarrollo</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}