import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientDocumentUploader } from '@/components/PatientDocumentUploader';
import { PatientIdDocument } from '@/components/PatientIdDocument';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  User, 
  Camera,
  Upload,
  Shield,
  Eye
} from 'lucide-react';

interface DoctorIdentityValidatorProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  patientUserId: string;
  onValidationComplete: () => void;
}

interface PatientData {
  full_name: string | null;
  profile_image_url: string | null;
  id_document_url: string | null;
  phone: string | null;
}

export const DoctorIdentityValidator: React.FC<DoctorIdentityValidatorProps> = ({
  isOpen,
  onClose,
  appointmentId,
  patientUserId,
  onValidationComplete
}) => {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState('verify');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchPatientData();
    }
  }, [isOpen, patientUserId]);

  const fetchPatientData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, profile_image_url, id_document_url, phone')
        .eq('user_id', patientUserId)
        .single();

      if (error) throw error;
      setPatient(data);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del paciente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateIdentity = async () => {
    if (!user || !patient) return;

    setValidating(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          identity_validated: true,
          identity_validated_at: new Date().toISOString(),
          identity_validated_by: user.id
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Identidad validada",
        description: "La identidad del paciente ha sido verificada exitosamente",
      });

      onValidationComplete();
      onClose();
    } catch (error) {
      console.error('Error validating identity:', error);
      toast({
        title: "Error",
        description: "No se pudo validar la identidad del paciente",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  const handleUploadComplete = () => {
    fetchPatientData();
    toast({
      title: "Documento actualizado",
      description: "El documento se ha subido correctamente",
    });
  };

  const isDocumentationComplete = patient && patient.profile_image_url && patient.id_document_url;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Cargando información del paciente...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Validación de Identidad del Paciente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Info Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={patient?.profile_image_url || ''} />
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{patient?.full_name || 'Sin nombre'}</h3>
                  <p className="text-muted-foreground">{patient?.phone || 'Sin teléfono'}</p>
                  <Badge variant={isDocumentationComplete ? "default" : "destructive"} className="mt-1">
                    {isDocumentationComplete ? 'Documentación completa' : 'Documentación incompleta'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="verify" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Verificar Documentos
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Subir Documentos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="verify" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documentos del Paciente</CardTitle>
                  <CardDescription>
                    Revisa que los documentos del paciente estén completos antes de validar su identidad
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Document Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Profile Image */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          <span className="text-sm font-medium">Foto de perfil</span>
                        </div>
                        <Badge variant={patient?.profile_image_url ? "default" : "destructive"}>
                          {patient?.profile_image_url ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {patient?.profile_image_url ? 'Válida' : 'Faltante'}
                        </Badge>
                      </div>
                      {patient?.profile_image_url && (
                        <div className="border rounded-lg p-2 bg-muted">
                          <Avatar className="h-24 w-24 mx-auto">
                            <AvatarImage 
                              src={patient.profile_image_url} 
                              alt="Foto del paciente"
                              className="object-cover"
                            />
                            <AvatarFallback>
                              <User className="h-12 w-12" />
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>

                    {/* ID Document */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">Documento de identidad</span>
                        </div>
                        <Badge variant={patient?.id_document_url ? "default" : "destructive"}>
                          {patient?.id_document_url ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {patient?.id_document_url ? 'Válido' : 'Faltante'}
                        </Badge>
                      </div>
                      {patient?.id_document_url && (
                        <div className="border rounded-lg overflow-hidden bg-muted">
                          <PatientIdDocument
                            idDocumentUrl={patient.id_document_url}
                            patientUserId={patientUserId}
                            compact={false}
                            showTitle={false}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Validation Status */}
                  {!isDocumentationComplete && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        El paciente no tiene todos los documentos requeridos. 
                        Puedes usar la pestaña "Subir Documentos" para ayudar al paciente a completar su documentación.
                      </AlertDescription>
                    </Alert>
                  )}

                  {isDocumentationComplete && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        ✅ Todos los documentos están completos. Puedes validar la identidad del paciente.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subir Documentos del Paciente</CardTitle>
                  <CardDescription>
                    Ayuda al paciente a completar su documentación subiendo los archivos necesarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert variant="default">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Si los documentos existentes no coinciden con el paciente presente, puedes reemplazarlos usando los botones de abajo.
                      </AlertDescription>
                    </Alert>
                    <PatientDocumentUploader
                      patientUserId={patientUserId}
                      onUploadComplete={handleUploadComplete}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleValidateIdentity}
              disabled={!isDocumentationComplete || validating}
              className="flex-1"
            >
              {validating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Validando...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  {isDocumentationComplete ? 'Validar Identidad' : 'Documentos Incompletos'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};