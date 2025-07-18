import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Camera, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    description: 'Documento que acredita tu licencia profesional',
    required: true,
    accepts: 'image/*,.pdf'
  },
  {
    key: 'university_degree_document_url', 
    label: 'Título Universitario',
    description: 'Diploma o título de la carrera de medicina',
    required: true,
    accepts: 'image/*,.pdf'
  },
  {
    key: 'identification_document_url',
    label: 'Identificación Oficial',
    description: 'INE, pasaporte o identificación oficial',
    required: true,
    accepts: 'image/*,.pdf'
  },
  {
    key: 'curp_document_url',
    label: 'CURP',
    description: 'Clave Única de Registro de Población',
    required: false,
    accepts: 'image/*,.pdf'
  }
];

export const ProfessionalDocumentManager: React.FC<DocumentManagerProps> = ({ 
  doctorProfile, 
  onProfileUpdate 
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);

  const uploadDocument = async (file: File, documentKey: string): Promise<void> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No hay usuario autenticado');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${documentKey}_${Date.now()}.${fileExt}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('doctor-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Update doctor profile with document URL
    const { error: updateError } = await supabase
      .from('doctor_profiles')
      .update({ [documentKey]: fileName })
      .eq('user_id', user.id);

    if (updateError) throw updateError;
  };

  const handleUpload = async (file: File, documentKey: string) => {
    setUploading(documentKey);
    try {
      await uploadDocument(file, documentKey);
      toast({
        title: "Documento subido",
        description: "El documento se ha subido correctamente",
      });
      onProfileUpdate();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo subir el documento",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const handleFileInputChange = (documentKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file, documentKey);
    }
  };

  const getCompletionPercentage = (): number => {
    const totalRequired = documentFields.filter(field => field.required).length;
    const completedRequired = documentFields
      .filter(field => field.required)
      .filter(field => hasDocument(field.key)).length;
    return Math.round((completedRequired / totalRequired) * 100);
  };

  const hasDocument = (documentKey: string): boolean => {
    return Boolean(doctorProfile?.[documentKey]);
  };

  const isProfileComplete = (): boolean => {
    return documentFields
      .filter(field => field.required)
      .every(field => hasDocument(field.key));
  };

  const completionPercentage = getCompletionPercentage();
  const profileComplete = isProfileComplete();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Documentos Profesionales
            <span className={`text-sm ${profileComplete ? 'text-green-600' : 'text-orange-600'}`}>
              {completionPercentage}% Completado
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="mb-4" />
          <p className="text-sm text-muted-foreground">
            {profileComplete 
              ? "¡Perfil completo! Todos los documentos requeridos han sido subidos."
              : "Sube todos los documentos requeridos para completar tu perfil profesional."
            }
          </p>
        </CardContent>
      </Card>

      {/* Document Upload Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {documentFields.map((field) => (
          <Card key={field.key} className={hasDocument(field.key) ? 'border-green-200' : ''}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                {field.label}
                {field.required && <span className="text-red-500 text-sm">*</span>}
                {hasDocument(field.key) && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{field.description}</p>
              
              <div className="flex gap-2">
                <Label htmlFor={`upload-${field.key}`} className="cursor-pointer flex-1">
                  <Button
                    variant={hasDocument(field.key) ? "outline" : "default"}
                    className="w-full"
                    disabled={uploading === field.key}
                    asChild
                  >
                    <span>
                      {uploading === field.key ? (
                        <>Subiendo...</>
                      ) : hasDocument(field.key) ? (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Reemplazar
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Subir {field.label}
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
                <Input
                  id={`upload-${field.key}`}
                  type="file"
                  accept={field.accepts}
                  className="hidden"
                  onChange={handleFileInputChange(field.key)}
                />
                
                {hasDocument(field.key) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Open document in new tab
                      window.open(
                        `https://rvsoeuwlgnovcmemlmqz.supabase.co/storage/v1/object/public/doctor-documents/${doctorProfile[field.key]}`,
                        '_blank'
                      );
                    }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos y Contenido Adicional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Additional Certifications */}
            <div className="space-y-2">
              <Label>Certificaciones Adicionales</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Especialidades, diplomados, certificados
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Certificaciones
                </Button>
              </div>
            </div>

            {/* Office Photos */}
            <div className="space-y-2">
              <Label>Fotos del Consultorio</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Fotos de las instalaciones
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Camera className="h-4 w-4 mr-2" />
                  Subir Fotos
                </Button>
              </div>
            </div>

            {/* Professional Photos */}
            <div className="space-y-2">
              <Label>Fotos Profesionales</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Fotos profesionales para el perfil
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Camera className="h-4 w-4 mr-2" />
                  Subir Fotos
                </Button>
              </div>
            </div>

            {/* Patient Questionnaire */}
            <div className="space-y-2">
              <Label>Cuestionario para Pacientes</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Preguntas para pacientes antes de la consulta
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <FileText className="h-4 w-4 mr-2" />
                  Crear Cuestionario
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};