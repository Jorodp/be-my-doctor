import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatTimeInMexicoTZ, formatInMexicoTZ } from '@/utils/dateUtils';
import {
  FileText,
  Eye,
  Calendar,
  User,
  Stethoscope,
  Pill,
  Heart,
  CalendarClock,
  Download
} from 'lucide-react';

interface ConsultationNote {
  id: string;
  appointment_id: string;
  doctor_user_id: string;
  patient_user_id: string;
  diagnosis: string;
  prescription: string;
  recommendations: string;
  follow_up_date: string;
  created_at: string;
  updated_at: string;
  appointment: {
    starts_at: string;
    ends_at: string;
    doctor_profile?: {
      full_name: string;
      specialty: string;
    };
    patient_profile?: {
      full_name: string;
    };
  };
}

interface ConsultationNotesViewerProps {
  appointmentId?: string; // Si se pasa, muestra solo las notas de esa cita
}

export const ConsultationNotesViewer: React.FC<ConsultationNotesViewerProps> = ({
  appointmentId
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<ConsultationNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ConsultationNote | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConsultationNotes();
    }
  }, [user, appointmentId]);

  const fetchConsultationNotes = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('consultation_notes')
        .select(`
          *,
          appointment:appointments (
            starts_at,
            ends_at,
            doctor_profile:doctor_profiles!appointments_doctor_user_id_fkey (
              full_name:user_id (
                profiles (full_name)
              ),
              specialty
            ),
            patient_profile:profiles!appointments_patient_user_id_fkey (
              full_name
            )
          )
        `);

      if (appointmentId) {
        query = query.eq('appointment_id', appointmentId);
      } else {
        // Si no se especifica una cita, mostrar todas las notas del usuario
        query = query.or(`doctor_user_id.eq.${user?.id},patient_user_id.eq.${user?.id}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Procesar los datos para obtener los nombres de los doctores
      const processedNotes = await Promise.all(
        (data || []).map(async (note) => {
          let doctorName = 'Doctor';
          
          // Obtener el nombre completo del doctor
          const { data: doctorProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', note.doctor_user_id)
            .single();

          if (doctorProfile) {
            doctorName = doctorProfile.full_name;
          }

          // Obtener especialidad del doctor
          const { data: doctorData } = await supabase
            .from('doctor_profiles')
            .select('specialty')
            .eq('user_id', note.doctor_user_id)
            .single();

          return {
            ...note,
            appointment: {
              ...note.appointment,
              doctor_profile: {
                full_name: doctorName,
                specialty: doctorData?.specialty || 'Medicina General'
              }
            }
          };
        })
      );

      setNotes(processedNotes);
    } catch (error) {
      console.error('Error fetching consultation notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las notas de consulta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = (note: ConsultationNote) => {
    setSelectedNote(note);
    setDetailModalOpen(true);
  };

  const generatePDF = (note: ConsultationNote) => {
    // Placeholder para generar PDF
    toast({
      title: "PDF Generado",
      description: "Funcionalidad de PDF será implementada próximamente",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notas de Consulta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {appointmentId ? 'Notas de la Consulta' : 'Historial de Consultas'}
          </CardTitle>
          {!appointmentId && (
            <p className="text-sm text-muted-foreground">
              Todas tus consultas médicas con sus respectivas notas
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No hay notas disponibles</h3>
              <p className="text-sm text-muted-foreground">
                {appointmentId 
                  ? 'Esta consulta aún no tiene notas médicas.'
                  : 'No tienes consultas con notas médicas registradas.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <Card key={note.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(note.appointment.starts_at), 'PPP', { locale: es })}
                          </span>
                          <Badge variant="outline">
                            {formatTimeInMexicoTZ(note.appointment.starts_at)}
                          </Badge>
                        </div>
                        
                        {note.appointment.doctor_profile && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Dr. {note.appointment.doctor_profile.full_name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {note.appointment.doctor_profile.specialty}
                            </Badge>
                          </div>
                        )}

                        {note.diagnosis && (
                          <div className="flex items-start gap-2">
                            <Stethoscope className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span className="text-sm">
                              <strong>Diagnóstico:</strong> {note.diagnosis.substring(0, 100)}
                              {note.diagnosis.length > 100 ? '...' : ''}
                            </span>
                          </div>
                        )}

                        {note.prescription && (
                          <div className="flex items-start gap-2">
                            <Pill className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span className="text-sm">
                              <strong>Prescripción:</strong> {note.prescription.substring(0, 80)}
                              {note.prescription.length > 80 ? '...' : ''}
                            </span>
                          </div>
                        )}

                        {note.follow_up_date && (
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <strong>Seguimiento:</strong> {format(new Date(note.follow_up_date), 'PPP', { locale: es })}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailModal(note)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalle
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generatePDF(note)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalle */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalle de Consulta
            </DialogTitle>
          </DialogHeader>
          
          {selectedNote && (
            <div className="space-y-6">
              {/* Header con información básica */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Fecha:</strong> {format(new Date(selectedNote.appointment.starts_at), 'PPP', { locale: es })}
                    </div>
                    <div>
                      <strong>Hora:</strong> {formatTimeInMexicoTZ(selectedNote.appointment.starts_at)}
                    </div>
                    {selectedNote.appointment.doctor_profile && (
                      <>
                        <div>
                          <strong>Doctor:</strong> Dr. {selectedNote.appointment.doctor_profile.full_name}
                        </div>
                        <div>
                          <strong>Especialidad:</strong> {selectedNote.appointment.doctor_profile.specialty}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Diagnóstico */}
              {selectedNote.diagnosis && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Diagnóstico</h3>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm leading-relaxed">{selectedNote.diagnosis}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Prescripción */}
              {selectedNote.prescription && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Prescripción Médica</h3>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedNote.prescription}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Recomendaciones */}
              {selectedNote.recommendations && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Recomendaciones y Cuidados</h3>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedNote.recommendations}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Fecha de seguimiento */}
              {selectedNote.follow_up_date && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Fecha de Seguimiento</h3>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm">
                        {format(new Date(selectedNote.follow_up_date), 'PPP', { locale: es })}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Separator />

              {/* Footer con fechas */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Consulta creada: {format(new Date(selectedNote.created_at), 'PPpp', { locale: es })}</p>
                {selectedNote.updated_at !== selectedNote.created_at && (
                  <p>Última actualización: {format(new Date(selectedNote.updated_at), 'PPpp', { locale: es })}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => generatePDF(selectedNote)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};