import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, CheckCircle, FileText, User, Camera, Shield, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface DoctorIdentityValidatorProps {
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

export const DoctorIdentityValidator = ({ 
  appointmentId, 
  patientUserId, 
  onValidationComplete, 
  onCancel 
}: DoctorIdentityValidatorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patient, setPatient] = useState<PatientDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');

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

  const handleValidateIdentity = async () => {
    if (!user || !isValid) return;

    setValidating(true);
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

      onValidationComplete(true);
    } catch (error) {
      console.error('Error validating identity:', error);
      toast({
        title: "Error",
        description: "No se pudo validar la identidad",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  const handleProceed = () => {
    if (isValid) {
      handleValidateIdentity();
    } else {
      onValidationComplete(false);
    }
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Validación de Identidad del Paciente
        </CardTitle>
        <CardDescription>
          Como doctor, debes verificar que el paciente presente coincida con sus documentos antes de iniciar la consulta
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
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
        {isValid ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Documentos disponibles. Verifique que la persona presente coincida con la información mostrada abajo.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Foto de Perfil
                </h4>
                <div className="border rounded-lg p-4">
                  <img 
                    src={patient.profile_image_url} 
                    alt="Foto del paciente" 
                    className="w-full max-h-48 object-contain rounded"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documento de Identidad
                </h4>
                <div className="border rounded-lg p-4">
                  <img 
                    src={patient.id_document_url} 
                    alt="Identificación" 
                    className="w-full max-h-48 object-contain rounded"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
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
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              El paciente no tiene todos los documentos requeridos. No se puede proceder con la consulta.
              Solicita al paciente o asistente que complete la documentación.
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
            disabled={!isValid || validating}
            className="flex-1"
          >
            {validating ? (
              <>
                <Shield className="h-4 w-4 mr-2 animate-spin" />
                Validando...
              </>
            ) : isValid ? (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Confirmar Validación
              </>
            ) : (
              'No se puede proceder'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};