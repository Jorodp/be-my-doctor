import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Calendar,
  Stethoscope,
  Pill,
  Heart,
  Eye,
  Download,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { generateConsultationPDF } from '@/utils/pdfGenerator';

interface ConsultationNote {
  id: string;
  appointment_id: string;
  diagnosis: string | null;
  prescription: string | null;
  recommendations: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  appointment: {
    starts_at: string;
    doctor_user_id: string;
  };
  doctor_profile?: {
    full_name: string;
    specialty: string;
    profile_image_url?: string;
  };
}

interface ConsultationNotesViewerProps {
  appointmentId?: string;
  showAll?: boolean;
}

export const ConsultationNotesViewer: React.FC<ConsultationNotesViewerProps> = ({
  appointmentId,
  showAll = false
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ConsultationNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConsultationNotes();
    }
  }, [user, appointmentId, showAll]);

  const fetchConsultationNotes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('consultation_notes')
        .select(`
          *,
          appointment:appointments(starts_at, doctor_user_id)
        `)
        .eq('patient_user_id', user.id)
        .order('created_at', { ascending: false });

      if (appointmentId && !showAll) {
        query = query.eq('appointment_id', appointmentId);
      }

      const { data: notesData, error: notesError } = await query;
      
      if (notesError) throw notesError;

      // Fetch doctor profiles for each note
      const doctorIds = [...new Set(notesData?.map(note => note.appointment?.doctor_user_id).filter(Boolean) || [])];
      
      let doctorProfiles: any = {};
      if (doctorIds.length > 0) {
        const [profilesResponse, doctorProfilesResponse] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', doctorIds),
          supabase
            .from('doctor_profiles')
            .select('user_id, specialty, profile_image_url')
            .in('user_id', doctorIds)
        ]);

        if (profilesResponse.data && doctorProfilesResponse.data) {
          profilesResponse.data.forEach(profile => {
            const doctorProfile = doctorProfilesResponse.data.find(dp => dp.user_id === profile.user_id);
            doctorProfiles[profile.user_id] = {
              full_name: profile.full_name,
              specialty: doctorProfile?.specialty || 'Medicina General',
              profile_image_url: doctorProfile?.profile_image_url
            };
          });
        }
      }

      // Combine notes with doctor profiles
      const notesWithDoctors = (notesData || []).map(note => ({
        ...note,
        doctor_profile: note.appointment?.doctor_user_id ? doctorProfiles[note.appointment.doctor_user_id] : null
      }));

      setNotes(notesWithDoctors);
    } catch (error) {
      console.error('Error fetching consultation notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (note: ConsultationNote) => {
    try {
      // Fetch patient profile
      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();

      const pdfData = {
        patientName: patientProfile?.full_name || 'Paciente',
        doctorName: note.doctor_profile?.full_name || 'Doctor',
        specialty: note.doctor_profile?.specialty || 'Medicina General',
        date: (() => {
          const dateStr = (note.appointment?.starts_at || note.created_at).replace('Z', '').replace('+00:00', '');
          const localDate = new Date(dateStr);
          return localDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        })(),
        time: (() => {
          const dateStr = (note.appointment?.starts_at || note.created_at).replace('Z', '').replace('+00:00', '');
          const localDate = new Date(dateStr);
          return localDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
        })(),
        diagnosis: note.diagnosis,
        prescription: note.prescription,
        recommendations: note.recommendations,
        followUpDate: note.follow_up_date ? format(new Date(note.follow_up_date), "d 'de' MMMM, yyyy", { locale: es }) : null
      };

      generateConsultationPDF(pdfData);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notas Médicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No hay notas médicas disponibles</h3>
            <p className="text-sm text-muted-foreground">
              Las notas médicas aparecerán aquí después de tus consultas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showAll && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mis Notas Médicas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Historial completo de notas médicas de tus consultas
            </p>
          </CardHeader>
        </Card>
      )}

      {notes.map((note) => (
        <Card key={note.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {note.doctor_profile?.full_name || 'Doctor'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {note.doctor_profile?.specialty || 'Medicina General'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const dateStr = (note.appointment?.starts_at || note.created_at).replace('Z', '').replace('+00:00', '');
                      const localDate = new Date(dateStr);
                      return localDate.toLocaleString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      });
                    })()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  Consulta
                </Badge>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Notas Médicas - {note.doctor_profile?.full_name}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Header Info */}
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Doctor</p>
                            <p className="text-sm text-muted-foreground">
                              {note.doctor_profile?.full_name} - {note.doctor_profile?.specialty}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Fecha de consulta</p>
                            <p className="text-sm text-muted-foreground">
                              {(() => {
                                const dateStr = (note.appointment?.starts_at || note.created_at).replace('Z', '').replace('+00:00', '');
                                const localDate = new Date(dateStr);
                                return localDate.toLocaleString('es-MX', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                });
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Diagnosis */}
                      {note.diagnosis && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-blue-600" />
                            <h4 className="font-semibold">Diagnóstico</h4>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="text-sm whitespace-pre-wrap">{note.diagnosis}</p>
                          </div>
                        </div>
                      )}

                      {/* Prescription */}
                      {note.prescription && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Pill className="h-5 w-5 text-green-600" />
                            <h4 className="font-semibold">Prescripción Médica</h4>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <p className="text-sm whitespace-pre-wrap">{note.prescription}</p>
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {note.recommendations && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Heart className="h-5 w-5 text-purple-600" />
                            <h4 className="font-semibold">Recomendaciones y Cuidados</h4>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <p className="text-sm whitespace-pre-wrap">{note.recommendations}</p>
                          </div>
                        </div>
                      )}

                      {/* Follow-up date */}
                      {note.follow_up_date && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-orange-600" />
                            <h4 className="font-semibold">Próxima cita de seguimiento</h4>
                          </div>
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <p className="text-sm">
                              {format(new Date(note.follow_up_date), "d 'de' MMMM, yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => generatePDF(note)} className="gap-2">
                          <Download className="h-4 w-4" />
                          Descargar PDF
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {note.diagnosis && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Diagnóstico</p>
                  </div>
                  <p className="text-sm text-blue-800 line-clamp-3">
                    {note.diagnosis.length > 100 ? 
                      `${note.diagnosis.substring(0, 100)}...` : 
                      note.diagnosis
                    }
                  </p>
                </div>
              )}

              {note.prescription && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-900">Prescripción</p>
                  </div>
                  <p className="text-sm text-green-800 line-clamp-3">
                    {note.prescription.length > 100 ? 
                      `${note.prescription.substring(0, 100)}...` : 
                      note.prescription
                    }
                  </p>
                </div>
              )}

              {note.recommendations && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-purple-600" />
                    <p className="text-sm font-medium text-purple-900">Recomendaciones</p>
                  </div>
                  <p className="text-sm text-purple-800 line-clamp-3">
                    {note.recommendations.length > 100 ? 
                      `${note.recommendations.substring(0, 100)}...` : 
                      note.recommendations
                    }
                  </p>
                </div>
              )}
            </div>

            {note.follow_up_date && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">
                    Próximo seguimiento: {format(new Date(note.follow_up_date), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};