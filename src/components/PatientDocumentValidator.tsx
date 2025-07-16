import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, CheckCircle, FileText, User, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PatientValidationProps {
  appointmentId: string;
  patientUserId: string;
  onValidationComplete: (isValid: boolean) => void;
  onCancel: () => void;
}

interface PatientDocuments {
  full_name: string | null;
  profile_image_url: string | null;
  id_document_url: string | null;
}

export const PatientDocumentValidator = ({ 
  appointmentId, 
  patientUserId, 
  onValidationComplete, 
  onCancel 
}: PatientValidationProps) => {
  const [patient, setPatient] = useState<PatientDocuments | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientDocuments();
  }, [patientUserId]);

  const fetchPatientDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, profile_image_url, id_document_url')
        .eq('user_id', patientUserId)
        .single();

      if (error) throw error;
      setPatient(data);
    } catch (error) {
      console.error('Error fetching patient documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const isValid = patient && patient.profile_image_url && patient.id_document_url;

  const handleProceed = () => {
    onValidationComplete(!!isValid);
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Validando documentos del paciente...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Validación de Documentos
        </CardTitle>
        <CardDescription>
          Verificar que el paciente tiene los documentos requeridos antes de la consulta
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Patient Info */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={patient?.profile_image_url || ''} />
            <AvatarFallback>
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{patient?.full_name || 'Sin nombre'}</p>
            <p className="text-sm text-muted-foreground">Paciente</p>
          </div>
        </div>

        {/* Document Validation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="text-sm">Foto de perfil</span>
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

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Documento de identidad</span>
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
        </div>

        {/* Validation Result */}
        {!isValid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              El paciente no tiene todos los documentos requeridos. No se puede proceder con la consulta.
              Contacta al asistente o solicita al paciente que complete su documentación.
            </AlertDescription>
          </Alert>
        )}

        {isValid && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Todos los documentos están completos. Puedes proceder con la consulta.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!isValid}
            className="flex-1"
          >
            {isValid ? 'Iniciar Consulta' : 'No se puede proceder'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};