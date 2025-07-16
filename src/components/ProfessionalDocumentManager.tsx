import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, FileText, Upload, Check, X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface DocumentManagerProps {
  doctorProfile: any;
  onProfileUpdate: () => void;
}

interface DocumentField {
  key: string;
  label: string;
  description: string;
  required: boolean;
  accepts: string;
}

const documentFields: DocumentField[] = [
  {
    key: 'professional_license_document_url',
    label: 'Cédula Profesional',
    description: 'Imagen clara de tu cédula profesional',
    required: true,
    accepts: 'image/*,.pdf'
  },
  {
    key: 'university_degree_document_url',
    label: 'Título Universitario',
    description: 'Imagen o PDF de tu título de médico',
    required: true,
    accepts: 'image/*,.pdf'
  },
  {
    key: 'identification_document_url',
    label: 'Identificación Oficial',
    description: 'INE, pasaporte u otra identificación oficial',
    required: true,
    accepts: 'image/*,.pdf'
  },
  {
    key: 'curp_document_url',
    label: 'CURP',
    description: 'Documento CURP (opcional pero recomendado)',
    required: false,
    accepts: 'image/*,.pdf'
  }
];

export const ProfessionalDocumentManager: React.FC<DocumentManagerProps> = ({
  doctorProfile,
  onProfileUpdate
}) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadDocument = async (file: File, documentKey: string) => {
    if (!user) return;

    setUploading(documentKey);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${documentKey}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to doctor-documents bucket
      const { error: uploadError } = await supabase.storage
        .from('doctor-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL (though bucket is private, we store the path)
      const documentUrl = filePath;

      // Update doctor profile with document URL
      const { error: updateError } = await supabase
        .from('doctor_profiles')
        .update({ [documentKey]: documentUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Documento subido",
        description: "El documento se ha guardado correctamente",
      });

      onProfileUpdate();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (documentKey: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = documentFields.find(f => f.key === documentKey)?.accepts || 'image/*,.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadDocument(file, documentKey);
      }
    };
    input.click();
  };

  const getCompletionPercentage = () => {
    const requiredFields = documentFields.filter(f => f.required);
    const completedFields = requiredFields.filter(f => doctorProfile[f.key]);
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  const hasDocument = (documentKey: string) => {
    return !!doctorProfile[documentKey];
  };

  const isProfileComplete = () => {
    return documentFields
      .filter(f => f.required)
      .every(f => doctorProfile[f.key]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentación Profesional
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sube los documentos requeridos para verificar tu perfil profesional
            </p>
          </div>
          <Badge variant={isProfileComplete() ? "default" : "secondary"}>
            {getCompletionPercentage()}% Completo
          </Badge>
        </div>
        <Progress value={getCompletionPercentage()} className="w-full" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isProfileComplete() && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">Documentación pendiente</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Tu perfil no será visible para los pacientes hasta completar todos los documentos requeridos.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {documentFields.map((field) => (
            <div
              key={field.key}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{field.label}</h4>
                    {field.required && (
                      <Badge variant="outline" className="text-xs">
                        Requerido
                      </Badge>
                    )}
                    {hasDocument(field.key) && (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Subido
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {field.description}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {hasDocument(field.key) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled
                    >
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                  )}
                  
                  <Button
                    variant={hasDocument(field.key) ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleFileSelect(field.key)}
                    disabled={uploading === field.key}
                    className="gap-2"
                  >
                    {uploading === field.key ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {hasDocument(field.key) ? 'Reemplazar' : 'Subir'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Certification Documents */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-medium">Certificaciones Adicionales</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Especialidades, diplomados, certificaciones médicas adicionales (opcional)
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFileSelect('additional_certifications')}
              disabled={uploading === 'additional_certifications'}
              className="gap-2"
            >
              {uploading === 'additional_certifications' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Agregar Certificación
                </>
              )}
            </Button>
          </div>
          
          {doctorProfile.additional_certifications_urls && 
           doctorProfile.additional_certifications_urls.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Certificaciones subidas:</p>
              <div className="flex flex-wrap gap-2">
                {doctorProfile.additional_certifications_urls.map((cert: string, index: number) => (
                  <Badge key={index} variant="outline" className="gap-1">
                    <FileText className="h-3 w-3" />
                    Certificación {index + 1}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Importante</h4>
              <p className="text-sm text-blue-700 mt-1">
                • Todos los documentos deben ser legibles y en buena calidad<br />
                • Formatos aceptados: JPG, PNG, PDF<br />
                • Los documentos serán revisados por nuestro equipo de verificación<br />
                • Una vez verificados, tu perfil será visible para los pacientes
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};