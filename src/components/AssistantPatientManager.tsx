import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Search,
  Eye,
  FileText,
  Phone,
  MapPin,
  Calendar,
  Upload,
  AlertCircle,
  User,
  Image,
  IdCard
} from 'lucide-react';

interface Patient {
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  date_of_birth: string;
  profile_image_url: string | null;
  id_document_url: string | null;
  appointment_count: number;
  last_appointment: string | null;
}

interface ConsultationNote {
  id: string;
  appointment_id: string;
  diagnosis: string;
  prescription: string;
  recommendations: string;
  follow_up_date: string;
  created_at: string;
  appointment: {
    starts_at: string;
    status: string;
  };
}

interface AssistantPatientManagerProps {
  doctorId: string;
}

export function AssistantPatientManager({ doctorId }: AssistantPatientManagerProps) {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientHistory, setPatientHistory] = useState<ConsultationNote[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (doctorId) {
      fetchPatients();
    }
  }, [doctorId]);

  const fetchPatients = async () => {
    try {
      // Get all patients who have had appointments with the assigned doctor
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          patient_user_id
        `)
        .eq('doctor_user_id', doctorId);

      if (error) throw error;

      // Get unique patient IDs
      const patientIds = [...new Set(appointments?.map(apt => apt.patient_user_id) || [])];
      
      if (patientIds.length === 0) {
        setPatients([]);
        return;
      }

      // Get patient profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, address, date_of_birth, profile_image_url, id_document_url')
        .in('user_id', patientIds);

      if (profilesError) throw profilesError;

      // Group by patient and count appointments
      const patientMap = new Map<string, Patient>();
      
      (profiles || []).forEach(profile => {
        const appointmentCount = appointments?.filter(apt => apt.patient_user_id === profile.user_id).length || 0;
        
        patientMap.set(profile.user_id, {
          user_id: profile.user_id,
          full_name: profile.full_name || 'Sin nombre',
          phone: profile.phone || '',
          address: profile.address || '',
          date_of_birth: profile.date_of_birth || '',
          profile_image_url: profile.profile_image_url,
          id_document_url: profile.id_document_url,
          appointment_count: appointmentCount,
          last_appointment: null
        });
      });

      // Get last appointment date for each patient
      const patientsArray = Array.from(patientMap.values());
      
      for (const patient of patientsArray) {
        const { data: lastAppointment } = await supabase
          .from('appointments')
          .select('ends_at')
          .eq('doctor_user_id', doctorId)
          .eq('patient_user_id', patient.user_id)
          .eq('status', 'completed')
          .order('ends_at', { ascending: false })
          .limit(1)
          .single();

        if (lastAppointment) {
          patient.last_appointment = lastAppointment.ends_at;
        }
      }

      setPatients(patientsArray);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pacientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientHistory = async (patientUserId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('consultation_notes')
        .select(`
          *,
          appointment:appointments!inner(starts_at, status)
        `)
        .eq('doctor_user_id', doctorId)
        .eq('patient_user_id', patientUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatientHistory(data || []);
    } catch (error) {
      console.error('Error fetching patient history:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial del paciente",
        variant: "destructive"
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 'No especificada';
    const today = new Date();
    const birth = new Date(dateOfBirth);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const uploadDocument = async (patientId: string, file: File, documentType: 'profile' | 'id') => {
    try {
      const bucket = documentType === 'profile' ? 'patient-profiles' : 'patient-documents';
      const fileName = `${patientId}/${documentType}_${Date.now()}.${file.name.split('.').pop()}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Update patient profile with new document URL
      const updateField = documentType === 'profile' ? 'profile_image_url' : 'id_document_url';
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: urlData.publicUrl })
        .eq('user_id', patientId);

      if (updateError) throw updateError;

      toast({
        title: "Éxito",
        description: `${documentType === 'profile' ? 'Foto de perfil' : 'Documento de identidad'} subido correctamente`
      });

      fetchPatients(); // Refresh patients list
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive"
      });
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pacientes del Dr. ({patients.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''} 
              {searchTerm ? ' encontrado' + (filteredPatients.length !== 1 ? 's' : '') : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card>
        <CardContent className="p-6">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPatients.map((patient) => (
                <div key={patient.user_id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {patient.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-2">
                        <div>
                          <h4 className="font-medium">{patient.full_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Edad: {calculateAge(patient.date_of_birth)} años
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {patient.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {patient.address.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            {patient.appointment_count} consulta{patient.appointment_count !== 1 ? 's' : ''}
                          </Badge>
                          
                          {patient.last_appointment && (
                            <Badge variant="outline">
                              Última: {new Date(patient.last_appointment).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>

                        {/* Document Status */}
                        <div className="flex gap-2">
                          {!patient.profile_image_url && (
                            <Badge variant="destructive" className="text-xs">
                              <Image className="h-3 w-3 mr-1" />
                              Sin foto
                            </Badge>
                          )}
                          {!patient.id_document_url && (
                            <Badge variant="destructive" className="text-xs">
                              <IdCard className="h-3 w-3 mr-1" />
                              Sin ID
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPatient(patient);
                              fetchPatientHistory(patient.user_id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Historial
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              Historial Médico - {selectedPatient?.full_name}
                            </DialogTitle>
                          </DialogHeader>
                          
                          {historyLoading ? (
                            <div className="p-8 text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="mt-2 text-muted-foreground">Cargando historial...</p>
                            </div>
                          ) : patientHistory.length === 0 ? (
                            <div className="p-8 text-center">
                              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-muted-foreground">No hay consultas registradas</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {patientHistory.map((note) => (
                                <Card key={note.id}>
                                  <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium">
                                          {new Date(note.appointment.starts_at).toLocaleDateString('es-ES', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          })}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {new Date(note.appointment.starts_at).toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                      <Badge>{note.appointment.status}</Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    {note.diagnosis && (
                                      <div>
                                        <h4 className="font-medium text-sm">Diagnóstico:</h4>
                                        <p className="text-sm text-muted-foreground">{note.diagnosis}</p>
                                      </div>
                                    )}
                                    {note.prescription && (
                                      <div>
                                        <h4 className="font-medium text-sm">Receta:</h4>
                                        <p className="text-sm text-muted-foreground">{note.prescription}</p>
                                      </div>
                                    )}
                                    {note.recommendations && (
                                      <div>
                                        <h4 className="font-medium text-sm">Recomendaciones:</h4>
                                        <p className="text-sm text-muted-foreground">{note.recommendations}</p>
                                      </div>
                                    )}
                                    {note.follow_up_date && (
                                      <div>
                                        <h4 className="font-medium text-sm">Seguimiento:</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {new Date(note.follow_up_date).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {/* Upload Documents */}
                      {(!patient.profile_image_url || !patient.id_document_url) && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              Documentos
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Subir Documentos - {patient.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {!patient.profile_image_url && (
                                <div>
                                  <label className="block text-sm font-medium mb-2">
                                    Foto de Perfil
                                  </label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadDocument(patient.user_id, file, 'profile');
                                    }}
                                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                                  />
                                </div>
                              )}
                              
                              {!patient.id_document_url && (
                                <div>
                                  <label className="block text-sm font-medium mb-2">
                                    Documento de Identidad
                                  </label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadDocument(patient.user_id, file, 'id');
                                    }}
                                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                                  />
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}