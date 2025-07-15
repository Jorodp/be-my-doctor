import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Play,
  User,
  Clock,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Save,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Shield,
  AlertTriangle,
  Upload,
} from 'lucide-react';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onConsultationComplete: () => void;
}

interface ConsultationStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface PatientProfile {
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  date_of_birth: string;
  profile_image_url: string;
  id_document_url: string;
}

interface ConsultationForm {
  diagnosis: string;
  prescription: string;
  recommendations: string;
  follow_up_date: string;
}

const INITIAL_STEPS: ConsultationStep[] = [
  {
    id: 1,
    title: "Verificación de Identidad",
    description: "Verificar que el paciente coincide con sus documentos",
    completed: false,
  },
  {
    id: 2,
    title: "Inicio de Consulta",
    description: "Revisar información del paciente e iniciar consulta",
    completed: false,
  },
  {
    id: 3,
    title: "Registrar Consulta",
    description: "Llenar diagnóstico, receta y recomendaciones",
    completed: false,
  },
  {
    id: 4,
    title: "Finalizar Consulta",
    description: "Confirmar datos y completar la consulta",
    completed: false,
  },
];

export function ConsultationModal({
  isOpen,
  onClose,
  appointment,
  onConsultationComplete,
}: ConsultationModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<ConsultationStep[]>(INITIAL_STEPS);
  const [consultationStarted, setConsultationStarted] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [consultationForm, setConsultationForm] = useState<ConsultationForm>({
    diagnosis: '',
    prescription: '',
    recommendations: '',
    follow_up_date: '',
  });

  useEffect(() => {
    if (isOpen && appointment) {
      fetchPatientData();
      resetModal();
    }
  }, [isOpen, appointment]);

  const resetModal = () => {
    setCurrentStep(1);
    setSteps(INITIAL_STEPS);
    setConsultationStarted(false);
    setIdentityVerified(false);
    setConsultationForm({
      diagnosis: '',
      prescription: '',
      recommendations: '',
      follow_up_date: '',
    });
  };

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      // Fetch patient profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', appointment.patient_user_id)
        .single();

      if (profileError) throw profileError;
      setPatientProfile(profile);

      // Fetch patient history (previous appointments)
      const { data: history, error: historyError } = await supabase
        .from('appointments')
        .select(`
          *,
          consultation_notes (*)
        `)
        .eq('patient_user_id', appointment.patient_user_id)
        .eq('status', 'completed')
        .order('ends_at', { ascending: false })
        .limit(5);

      if (historyError) throw historyError;
      setPatientHistory(history || []);

    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del paciente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const verifyIdentity = () => {
    setIdentityVerified(true);
    markStepCompleted(1);
    setCurrentStep(2);
  };

  const startConsultation = () => {
    setConsultationStarted(true);
    markStepCompleted(2);
    setCurrentStep(3);
  };

  const markStepCompleted = (stepId: number) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      markStepCompleted(currentStep);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveAndContinue = async () => {
    if (!consultationForm.diagnosis.trim()) {
      toast({
        title: "Campo requerido",
        description: "El diagnóstico es obligatorio",
        variant: "destructive",
      });
      return;
    }

    markStepCompleted(3);
    setCurrentStep(4);
  };

  const finalizeConsultation = async () => {
    try {
      setLoading(true);

      // Save consultation notes
      const { error: notesError } = await supabase
        .from('consultation_notes')
        .insert({
          appointment_id: appointment.id,
          doctor_user_id: appointment.doctor_user_id,
          patient_user_id: appointment.patient_user_id,
          diagnosis: consultationForm.diagnosis,
          prescription: consultationForm.prescription,
          recommendations: consultationForm.recommendations,
          follow_up_date: consultationForm.follow_up_date || null,
        });

      if (notesError) throw notesError;

      // Update appointment status to completed
      const { error: statusError } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointment.id);

      if (statusError) throw statusError;

      markStepCompleted(4);
      
      toast({
        title: "Consulta Finalizada",
        description: "La consulta se ha completado exitosamente",
      });

      setTimeout(() => {
        onConsultationComplete();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error finalizing consultation:', error);
      toast({
        title: "Error",
        description: "No se pudo finalizar la consulta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Verificación de Identidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientProfile && patientProfile.profile_image_url && patientProfile.id_document_url ? (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-900 font-medium mb-2">
                        Verifique que la persona presente coincide con los documentos cargados.
                      </p>
                      <p className="text-blue-700 text-sm">
                        Compare la apariencia física del paciente con la foto de perfil y documento de identificación oficial.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Foto de Perfil
                        </h4>
                        <div className="border rounded-lg p-4 bg-muted/50">
                          <img
                            src={patientProfile.profile_image_url}
                            alt="Foto de perfil del paciente"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documento de Identificación
                        </h4>
                        <div className="border rounded-lg p-4 bg-muted/50">
                          <img
                            src={patientProfile.id_document_url}
                            alt="Documento de identificación"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center pt-4">
                      <Button 
                        onClick={verifyIdentity}
                        size="lg"
                        className="w-full max-w-md"
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        ✅ Verificación Completada
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-900">
                          Documentos Incompletos
                        </p>
                        <p className="text-amber-700 text-sm mt-1">
                          Este paciente no ha cargado su identificación y/o foto de perfil. 
                          El asistente deberá subirlos antes de proceder.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className={`p-3 rounded-lg border ${patientProfile?.profile_image_url ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">Foto de Perfil</span>
                        </div>
                        <p className={`text-xs mt-1 ${patientProfile?.profile_image_url ? 'text-green-700' : 'text-red-700'}`}>
                          {patientProfile?.profile_image_url ? '✅ Disponible' : '❌ Faltante'}
                        </p>
                      </div>

                      <div className={`p-3 rounded-lg border ${patientProfile?.id_document_url ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">Identificación</span>
                        </div>
                        <p className={`text-xs mt-1 ${patientProfile?.id_document_url ? 'text-green-700' : 'text-red-700'}`}>
                          {patientProfile?.id_document_url ? '✅ Disponible' : '❌ Faltante'}
                        </p>
                      </div>
                    </div>

                    <div className="text-center">
                      <Button variant="outline" disabled className="cursor-not-allowed">
                        <Upload className="h-5 w-5 mr-2" />
                        No se puede proceder sin documentos
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {patientProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información del Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-lg">
                        {patientProfile.full_name?.split(' ').map(n => n[0]).join('') || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{patientProfile.full_name}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Edad: {calculateAge(patientProfile.date_of_birth)} años</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{patientProfile.phone || 'No especificado'}</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{patientProfile.address || 'No especificada'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {patientHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Historial Reciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patientHistory.slice(0, 3).map((history, index) => (
                      <div key={history.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">
                            {new Date(history.ends_at).toLocaleDateString()}
                          </span>
                          <Badge variant="secondary">Completada</Badge>
                        </div>
                        {history.consultation_notes[0] && (
                          <p className="text-sm text-muted-foreground">
                            {history.consultation_notes[0].diagnosis?.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={startConsultation} 
                size="lg"
                className="w-full max-w-md"
              >
                <Play className="h-5 w-5 mr-2" />
                Iniciar Consulta
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Consulta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="diagnosis">Diagnóstico *</Label>
                  <Textarea
                    id="diagnosis"
                    value={consultationForm.diagnosis}
                    onChange={(e) => setConsultationForm(prev => ({ 
                      ...prev, 
                      diagnosis: e.target.value 
                    }))}
                    placeholder="Describa el diagnóstico de la consulta..."
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="prescription">Receta Médica</Label>
                  <Textarea
                    id="prescription"
                    value={consultationForm.prescription}
                    onChange={(e) => setConsultationForm(prev => ({ 
                      ...prev, 
                      prescription: e.target.value 
                    }))}
                    placeholder="Medicamentos recetados, dosificación, duración..."
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="recommendations">Recomendaciones</Label>
                  <Textarea
                    id="recommendations"
                    value={consultationForm.recommendations}
                    onChange={(e) => setConsultationForm(prev => ({ 
                      ...prev, 
                      recommendations: e.target.value 
                    }))}
                    placeholder="Cuidados especiales, recomendaciones generales..."
                  />
                </div>

                <div>
                  <Label htmlFor="follow_up">Fecha de Seguimiento (Opcional)</Label>
                  <Input
                    id="follow_up"
                    type="date"
                    value={consultationForm.follow_up_date}
                    onChange={(e) => setConsultationForm(prev => ({ 
                      ...prev, 
                      follow_up_date: e.target.value 
                    }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <Button onClick={saveAndContinue} className="flex-1">
                Guardar y Continuar
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Resumen de Consulta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Paciente</Label>
                  <p className="text-lg">{patientProfile?.full_name}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Diagnóstico</Label>
                  <p className="text-muted-foreground">{consultationForm.diagnosis}</p>
                </div>

                {consultationForm.prescription && (
                  <div>
                    <Label className="text-sm font-medium">Receta</Label>
                    <p className="text-muted-foreground">{consultationForm.prescription}</p>
                  </div>
                )}

                {consultationForm.recommendations && (
                  <div>
                    <Label className="text-sm font-medium">Recomendaciones</Label>
                    <p className="text-muted-foreground">{consultationForm.recommendations}</p>
                  </div>
                )}

                {consultationForm.follow_up_date && (
                  <div>
                    <Label className="text-sm font-medium">Seguimiento</Label>
                    <p className="text-muted-foreground">
                      {new Date(consultationForm.follow_up_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <Button 
                onClick={finalizeConsultation} 
                className="flex-1"
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Finalizando...' : 'Finalizar Consulta'}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Consulta Médica - {new Date(appointment?.starts_at).toLocaleString()}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step.completed
                    ? 'bg-primary border-primary text-primary-foreground'
                    : currentStep === step.id
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground text-muted-foreground'
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-2 min-w-0">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-border mx-4" />
              )}
            </div>
          ))}
        </div>

        {loading && currentStep === 1 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Cargando información del paciente...</p>
            </div>
          </div>
        ) : (
          renderStepContent()
        )}
      </DialogContent>
    </Dialog>
  );
}