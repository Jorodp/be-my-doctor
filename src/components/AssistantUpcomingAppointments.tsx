import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AppointmentActions } from '@/components/AppointmentActions';
import { AppointmentDetailModal } from '@/components/AppointmentDetailModal';
import { AppointmentActionsExtended } from '@/components/AppointmentActionsExtended';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDateInMexicoTZ, formatTimeInMexicoTZ, formatDateTimeInMexicoTZ } from '@/utils/dateUtils';
import { es } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  User,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  Image as ImageIcon,
  Eye,
  MapPin
} from 'lucide-react';
import { PatientIdDocument } from './PatientIdDocument';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  patient_user_id: string;
  doctor_user_id: string;
  patient_profile?: {
    full_name: string;
    phone: string;
    profile_image_url?: string;
    id_document_url?: string;
  };
  clinics?: {
    name: string;
    address: string;
  };
}

interface AssistantUpcomingAppointmentsProps {
  doctorId: string;
}

export function AssistantUpcomingAppointments({ doctorId }: AssistantUpcomingAppointmentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Appointment | null>(null);
  const [identityVerificationModal, setIdentityVerificationModal] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (doctorId) {
      fetchUpcomingAppointments();
    }
  }, [doctorId]);

  const fetchUpcomingAppointments = async () => {
    try {
      setLoading(true);
      
      // Fetch upcoming appointments for the assigned doctor
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clinics (
            name,
            address
          )
        `)
        .eq('doctor_user_id', doctorId)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true });

      if (error) throw error;

      // Fetch patient profiles for each appointment
      const appointmentsWithPatients = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('full_name, phone, profile_image_url, id_document_url')
            .eq('user_id', appointment.patient_user_id)
            .single();

          return {
            ...appointment,
            patient_profile: patientProfile
          };
        })
      );

      setAppointments(appointmentsWithPatients);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markPatientArrived = async (appointmentId: string) => {
    try {
      const { error } = await supabase.rpc('mark_patient_arrived', {
        p_appointment_id: appointmentId,
        p_actor_user_id: user?.id
      });

      if (error) throw error;

      toast({
        title: "Paciente marcado como llegado",
        description: "El estado de la cita ha sido actualizado"
      });

      fetchUpcomingAppointments();
    } catch (error) {
      console.error('Error marking patient arrived:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar la llegada del paciente",
        variant: "destructive"
      });
    }
  };

  const markIdentityVerified = async (appointmentId: string) => {
    try {
      // Add verification note to appointment
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      const verificationNote = `[Identidad verificada por asistente el ${formatDateTimeInMexicoTZ(new Date())}]`;
      const existingNotes = appointment.notes || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n\n${verificationNote}` : verificationNote;

      const { error } = await supabase
        .from('appointments')
        .update({ 
          notes: updatedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Identidad Verificada",
        description: "El paciente ha sido verificado correctamente"
      });

      setIdentityVerificationModal(false);
      fetchUpcomingAppointments();
    } catch (error) {
      console.error('Error marking identity verified:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar la verificación",
        variant: "destructive"
      });
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

  const isToday = (dateString: string) => {
    const appointmentDate = new Date(dateString);
    const today = new Date();
    return appointmentDate.toDateString() === today.toDateString();
  };

  const hasRequiredDocuments = (patient: any) => {
    return patient?.profile_image_url && patient?.id_document_url;
  };

  // Componente para mostrar la foto de perfil del paciente
  const ProfileImageViewer = ({ profileImageUrl, patientName }: { profileImageUrl?: string; patientName?: string }) => {
    const { signedUrl, loading, error } = useSignedUrl('patient-profiles', profileImageUrl);
    
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Foto de Perfil</h4>
        <div className="border rounded-lg p-2 h-32 flex items-center justify-center bg-muted/30">
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          ) : error ? (
            <div className="text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-destructive">Error al cargar</p>
            </div>
          ) : signedUrl ? (
            <img 
              src={signedUrl}
              alt={`Foto de perfil de ${patientName || 'paciente'}`}
              className="max-h-full max-w-full object-cover rounded shadow-sm"
              onError={(e) => {
                console.error('Error loading profile image:', e);
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : (
            <div className="text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Sin foto</p>
            </div>
          )}
          
          {/* Fallback icon (initially hidden) */}
          {signedUrl && (
            <div className="hidden text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-destructive">Error al cargar imagen</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Próximas Citas del Doctor ({appointments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay citas próximas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {appointment.patient_profile?.full_name || 'Paciente'}
                      </span>
                      {isToday(appointment.starts_at) && (
                        <Badge variant="outline" className="text-xs">HOY</Badge>
                      )}
                      <Badge variant={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateInMexicoTZ(appointment.starts_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeInMexicoTZ(appointment.starts_at)} - {formatTimeInMexicoTZ(appointment.ends_at)}
                      </div>
                      {appointment.clinics && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {appointment.clinics.name}
                        </div>
                      )}
                    </div>

                    {appointment.patient_profile?.phone && (
                      <div className="text-sm text-muted-foreground">
                        📞 {appointment.patient_profile.phone}
                      </div>
                    )}

                    {/* Document Verification Status */}
                    <div className="flex items-center gap-2">
                      {hasRequiredDocuments(appointment.patient_profile) ? (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Documentos Completos
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Documentos Faltantes
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Ver Detalles Button */}
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setDetailModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalles
                    </Button>

                    {/* Mark Patient Arrived Button */}
                    {appointment.status === 'scheduled' && (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => markPatientArrived(appointment.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Paciente Llegó
                      </Button>
                    )}

                    {/* Identity Verification Button */}
                    {appointment.status === 'scheduled' && hasRequiredDocuments(appointment.patient_profile) && (
                      <Dialog open={identityVerificationModal} onOpenChange={setIdentityVerificationModal}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedPatient(appointment)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Verificar ID
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Shield className="h-5 w-5" />
                              Verificación de Identidad
                            </DialogTitle>
                          </DialogHeader>
                          
                          {selectedPatient && (
                            <div className="space-y-4">
                              <div className="text-center">
                                <p className="font-medium">{selectedPatient.patient_profile?.full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDateTimeInMexicoTZ(selectedPatient.starts_at)}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                              <ProfileImageViewer 
                                profileImageUrl={selectedPatient.patient_profile?.profile_image_url}
                                patientName={selectedPatient.patient_profile?.full_name}
                              />

                                <PatientIdDocument 
                                  idDocumentUrl={selectedPatient.patient_profile?.id_document_url}
                                  patientUserId={selectedPatient.patient_user_id}
                                />
                              </div>

                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-blue-900 text-sm font-medium">
                                  Verifica que la persona presente coincide con los documentos mostrados
                                </p>
                              </div>

                              <Button 
                                onClick={() => markIdentityVerified(selectedPatient.id)}
                                className="w-full"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                ✅ Verificación Completada
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Appointment Actions (Cancel/Reschedule) */}
                    <AppointmentActionsExtended
                      appointment={appointment}
                      userRole="assistant"
                      currentUserId={user?.id || ''}
                      onAppointmentUpdated={fetchUpcomingAppointments}
                      showPatientName={false}
                    />
                  </div>
                </div>

                {appointment.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      <strong>Notas:</strong> {appointment.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        appointment={selectedAppointment}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedAppointment(null);
        }}
        userRole="assistant"
      />
    </Card>
  );
}