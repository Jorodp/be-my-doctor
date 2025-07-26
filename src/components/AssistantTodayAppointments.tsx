import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  User, 
  Shield, 
  ShieldCheck, 
  AlertTriangle, 
  Upload, 
  FileText,
  Camera,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { UploadPatientFiles } from '@/components/UploadPatientFiles';
import { PatientDocumentUploader } from '@/components/PatientDocumentUploader';
import { PatientDocumentImage } from '@/components/PatientDocumentImage';

interface PatientProfile {
  full_name: string;
  phone?: string;
  profile_image_url?: string;
}

interface Appointment {
  id: string;
  patient_user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  consultation_status: string;
  identity_validated: boolean;
  identity_validated_at?: string;
  identity_validated_by?: string;
  patient_profile?: PatientProfile;
}

interface PatientDocuments {
  identification_url?: string;
  profile_image_url?: string;
}

interface AssistantTodayAppointmentsProps {
  doctorId: string;
}

export const AssistantTodayAppointments = ({ doctorId }: AssistantTodayAppointmentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientDocuments, setPatientDocuments] = useState<PatientDocuments>({});
  const [validationNotes, setValidationNotes] = useState('');
  const [validatingIdentity, setValidatingIdentity] = useState(false);

  useEffect(() => {
    if (doctorId) {
      fetchTodayAppointments();
    }
  }, [doctorId]);

  const fetchTodayAppointments = async () => {
    try {
      // Usar la fecha actual en la zona horaria local
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log('AssistantTodayAppointments - Fetching for doctor:', doctorId);
      console.log('AssistantTodayAppointments - Today date range:', `${todayStr}T00:00:00.000Z`, 'to', `${todayStr}T23:59:59.999Z`);
      
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_user_id', doctorId)
        .gte('starts_at', `${todayStr}T00:00:00.000Z`)
        .lt('starts_at', `${todayStr}T23:59:59.999Z`)
        .neq('status', 'cancelled')
        .order('starts_at', { ascending: true });

      console.log('AssistantTodayAppointments - Query result:', appointmentsData);

      if (error) throw error;

      // Fetch patient profiles
      const appointmentsWithPatients = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('full_name, phone, profile_image_url')
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

  const fetchPatientDocuments = async (patientUserId: string) => {
    try {
      // Check patient documents table
      const { data: documents } = await supabase
        .from('patient_documents')
        .select('document_type, document_url')
        .eq('patient_user_id', patientUserId);

      // Get profile image from profiles table (fallback)
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_image_url, id_document_url')
        .eq('user_id', patientUserId)
        .single();

      const docs: PatientDocuments = {
        profile_image_url: profile?.profile_image_url
      };

      // First check patient_documents table
      if (documents && documents.length > 0) {
        documents.forEach(doc => {
          if (doc.document_type === 'identification') {
            docs.identification_url = doc.document_url;
          }
          if (doc.document_type === 'profile_image') {
            docs.profile_image_url = doc.document_url;
          }
        });
      }

      // Fallback: check profiles table if no documents found in patient_documents
      if (!docs.identification_url && profile?.id_document_url) {
        docs.identification_url = profile.id_document_url;
      }

      console.log('Patient documents found:', docs);
      setPatientDocuments(docs);
    } catch (error) {
      console.error('Error fetching patient documents:', error);
    }
  };

  const validateIdentity = async (appointmentId: string, patientUserId: string) => {
    if (!user) return;

    setValidatingIdentity(true);
    try {
      // Update appointment as identity validated
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          identity_validated: true,
          identity_validated_at: new Date().toISOString(),
          identity_validated_by: user.id
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Insert validation record
      const { error: insertError } = await supabase
        .from('patient_identity_validations')
        .insert({
          appointment_id: appointmentId,
          patient_user_id: patientUserId,
          validated_by: user.id,
          validation_notes: validationNotes || null
        });

      if (insertError) throw insertError;

      toast({
        title: "Identidad Validada",
        description: "La identidad del paciente ha sido validada correctamente"
      });

      setValidationNotes('');
      setSelectedPatient(null);
      fetchTodayAppointments();
    } catch (error) {
      console.error('Error validating identity:', error);
      toast({
        title: "Error",
        description: "No se pudo validar la identidad",
        variant: "destructive"
      });
    } finally {
      setValidatingIdentity(false);
    }
  };

  const formatTime = (dateString: string) => {
    // Asegurar formato correcto de hora en zona local
    const date = new Date(dateString);
    return format(date, 'HH:mm', { locale: es });
  };

  const getStatusBadge = (appointment: Appointment) => {
    if (appointment.identity_validated) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Identidad Validada
        </Badge>
      );
    }

    if (appointment.status === 'scheduled') {
      return (
        <Badge variant="outline" className="border-yellow-200 text-yellow-800">
          <Shield className="h-3 w-3 mr-1" />
          Pendiente Validación
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        {appointment.status}
      </Badge>
    );
  };

  const hasRequiredDocuments = (docs: PatientDocuments) => {
    return docs.identification_url && docs.profile_image_url;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 animate-spin mr-2" />
            Cargando citas de hoy...
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
          Citas de Hoy - Validación de Identidad
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {appointments.length} cita(s) programadas para hoy
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4" />
            <p>No hay citas programadas para hoy</p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={appointment.patient_profile?.profile_image_url} 
                        alt={appointment.patient_profile?.full_name || 'Paciente'} 
                      />
                      <AvatarFallback>
                        {appointment.patient_profile?.full_name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h4 className="font-semibold">
                        {appointment.patient_profile?.full_name || 'Paciente'}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(appointment.starts_at)}
                        </span>
                        {appointment.patient_profile?.phone && (
                          <span>{appointment.patient_profile.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(appointment)}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedPatient(appointment.patient_user_id);
                            fetchPatientDocuments(appointment.patient_user_id);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Ver Perfil
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Perfil del Paciente - {appointment.patient_profile?.full_name}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {/* Patient Documents Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Documento de Identificación
                              </h3>
                              <PatientDocumentImage 
                                documentUrl={patientDocuments.identification_url}
                                alt="Documento de identificación"
                              />
                            </div>
                            
                            <div>
                              <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Camera className="h-4 w-4" />
                                Foto del Paciente
                              </h3>
                              <PatientDocumentImage 
                                documentUrl={patientDocuments.profile_image_url}
                                alt="Foto del paciente"
                              />
                            </div>
                          </div>

                          {/* Upload missing documents */}
                          {!hasRequiredDocuments(patientDocuments) && (
                            <div className="border rounded-lg p-4 bg-amber-50">
                              <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-800">
                                <Upload className="h-4 w-4" />
                                Documentos Faltantes
                              </h3>
                              <Alert className="mb-4">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  Faltan documentos para validar la identidad. Utiliza el botón de abajo para subir los documentos faltantes.
                                </AlertDescription>
                              </Alert>
                              <PatientDocumentUploader 
                                patientUserId={appointment.patient_user_id}
                                onUploadComplete={() => {
                                  fetchPatientDocuments(appointment.patient_user_id);
                                  toast({
                                    title: "Documentos subidos",
                                    description: "Los documentos han sido subidos correctamente"
                                  });
                                }}
                              />
                            </div>
                          )}

                          {/* Identity Validation Section */}
                          {hasRequiredDocuments(patientDocuments) && !appointment.identity_validated && (
                            <div className="border rounded-lg p-4 bg-blue-50">
                              <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                                <Shield className="h-4 w-4" />
                                Validar Identidad
                              </h3>
                              <div className="space-y-4">
                                <Alert>
                                  <CheckCircle2 className="h-4 w-4" />
                                  <AlertDescription>
                                    Verifica que la persona presente coincida con los documentos mostrados arriba.
                                  </AlertDescription>
                                </Alert>
                                
                                <div>
                                  <Label htmlFor="validation-notes">
                                    Notas de Validación (Opcional)
                                  </Label>
                                  <Textarea
                                    id="validation-notes"
                                    placeholder="Observaciones sobre la validación de identidad..."
                                    value={validationNotes}
                                    onChange={(e) => setValidationNotes(e.target.value)}
                                  />
                                </div>
                                
                                <Button 
                                  onClick={() => validateIdentity(appointment.id, appointment.patient_user_id)}
                                  disabled={validatingIdentity}
                                  className="w-full"
                                >
                                  {validatingIdentity ? (
                                    <>
                                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                                      Validando...
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="h-4 w-4 mr-2" />
                                      Confirmar Validación de Identidad
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Already validated */}
                          {appointment.identity_validated && (
                            <Alert className="border-green-200 bg-green-50">
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                              <AlertDescription className="text-green-800">
                                Identidad validada el {appointment.identity_validated_at ? 
                                  format(new Date(appointment.identity_validated_at), 'dd/MM/yyyy HH:mm', { locale: es }) 
                                  : 'fecha no disponible'}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};