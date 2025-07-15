import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Calendar, FileText, User, Phone, MapPin, Star, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PatientIdDocument } from './PatientIdDocument';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientUserId: string;
  doctorUserId: string;
}

interface PatientProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  profile_image_url: string | null;
  id_document_url: string | null;
}

interface AppointmentHistory {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  consultation_notes?: {
    id: string;
    diagnosis: string | null;
    prescription: string | null;
    recommendations: string | null;
    follow_up_date: string | null;
  }[];
  ratings?: {
    rating: number;
    comment: string | null;
  }[];
}

export const PatientHistoryModal = ({ isOpen, onClose, patientUserId, doctorUserId }: PatientHistoryModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [appointmentHistory, setAppointmentHistory] = useState<AppointmentHistory[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<AppointmentHistory | null>(null);

  useEffect(() => {
    if (isOpen && patientUserId && doctorUserId) {
      fetchPatientData();
    }
  }, [isOpen, patientUserId, doctorUserId]);

  const fetchPatientData = async () => {
    setLoading(true);
    try {
      // Fetch patient profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', patientUserId)
        .single();

      if (profileError) throw profileError;

      // Fetch appointment history with this doctor
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          consultation_notes (*),
          ratings (rating, comment)
        `)
        .eq('patient_user_id', patientUserId)
        .eq('doctor_user_id', doctorUserId)
        .eq('status', 'completed')
        .order('starts_at', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Process appointments to ensure ratings is always an array
      const processedAppointments = (appointments || []).map(app => ({
        ...app,
        ratings: Array.isArray(app.ratings) ? app.ratings : []
      }));

      setPatientProfile(profile);
      setAppointmentHistory(processedAppointments);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial del paciente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial del Paciente</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Patient Info */}
              {patientProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={patientProfile.profile_image_url || ''} />
                        <AvatarFallback>
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">{patientProfile.full_name || 'Paciente'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {patientProfile.date_of_birth && `${calculateAge(patientProfile.date_of_birth)} años`}
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        {patientProfile.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{patientProfile.phone}</span>
                          </div>
                        )}
                        {patientProfile.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{patientProfile.address}</span>
                          </div>
                        )}
                        {patientProfile.date_of_birth && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Nacimiento: {formatDate(patientProfile.date_of_birth)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* ID Document */}
                      {patientProfile.id_document_url && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Identificación Oficial</h4>
                          <div className="border rounded-lg p-2">
                            <PatientIdDocument 
                              idDocumentUrl={patientProfile.id_document_url}
                              patientUserId={patientProfile.user_id}
                              showTitle={false}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Appointment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Historial de Consultas
                  </CardTitle>
                  <CardDescription>
                    {appointmentHistory.length} consulta{appointmentHistory.length !== 1 ? 's' : ''} completada{appointmentHistory.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {appointmentHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay consultas anteriores con este paciente
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {appointmentHistory.map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{formatDate(appointment.starts_at)}</span>
                                <span className="text-sm text-muted-foreground">
                                  {formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}
                                </span>
                              </div>
                              <Badge variant="outline">{appointment.status}</Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {appointment.ratings && appointment.ratings.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm">{appointment.ratings[0].rating}/5</span>
                                </div>
                              )}
                              
                              {appointment.consultation_notes && appointment.consultation_notes.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedNotes(appointment)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver Detalle
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {appointment.consultation_notes && appointment.consultation_notes.length > 0 && (
                            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                              {appointment.consultation_notes[0].diagnosis && (
                                <div>
                                  <strong className="text-sm">Diagnóstico:</strong>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {appointment.consultation_notes[0].diagnosis}
                                  </p>
                                </div>
                              )}
                              
                              {appointment.consultation_notes[0].prescription && (
                                <div>
                                  <strong className="text-sm">Receta:</strong>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {appointment.consultation_notes[0].prescription}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {appointment.notes && (
                            <div className="text-sm">
                              <strong>Notas de la cita:</strong>
                              <p className="text-muted-foreground mt-1">{appointment.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detailed Notes Modal */}
      {selectedNotes && selectedNotes.consultation_notes && selectedNotes.consultation_notes.length > 0 && (
        <Dialog open={!!selectedNotes} onOpenChange={() => setSelectedNotes(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Detalles de la Consulta - {formatDate(selectedNotes.starts_at)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedNotes.consultation_notes[0].diagnosis && (
                <div>
                  <h4 className="font-semibold mb-2">Diagnóstico</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">
                    {selectedNotes.consultation_notes[0].diagnosis}
                  </p>
                </div>
              )}
              
              {selectedNotes.consultation_notes[0].prescription && (
                <div>
                  <h4 className="font-semibold mb-2">Prescripción Médica</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">
                    {selectedNotes.consultation_notes[0].prescription}
                  </p>
                </div>
              )}
              
              {selectedNotes.consultation_notes[0].recommendations && (
                <div>
                  <h4 className="font-semibold mb-2">Recomendaciones</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">
                    {selectedNotes.consultation_notes[0].recommendations}
                  </p>
                </div>
              )}
              
              {selectedNotes.consultation_notes[0].follow_up_date && (
                <div>
                  <h4 className="font-semibold mb-2">Próxima Cita de Seguimiento</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">
                    {formatDate(selectedNotes.consultation_notes[0].follow_up_date)}
                  </p>
                </div>
              )}
              
              {selectedNotes.ratings && selectedNotes.ratings.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Calificación del Paciente</h4>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{selectedNotes.ratings[0].rating}/5</span>
                    </div>
                    {selectedNotes.ratings[0].comment && (
                      <p className="text-sm text-muted-foreground">
                        "{selectedNotes.ratings[0].comment}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};