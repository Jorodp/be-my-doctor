import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface PatientDocumentUploaderProps {
  patientUserId: string;
  onUploadComplete?: () => void;
}

export const PatientDocumentUploader = ({ patientUserId, onUploadComplete }: PatientDocumentUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState<{ profile: boolean; id: boolean }>({ profile: false, id: false });

  const handleFileUpload = async (file: File, type: 'profile' | 'id') => {
    if (!user) return;

    // Validación de tipos de archivo
    const allowedTypesProfile = ['image/jpeg', 'image/jpg', 'image/png'];
    const allowedTypesDocument = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const allowedTypes = type === 'profile' ? allowedTypesProfile : allowedTypesDocument;
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Archivo no válido",
        description: type === 'profile' 
          ? "Solo se permiten archivos JPG, JPEG o PNG para la foto de perfil"
          : "Solo se permiten archivos JPG, JPEG, PNG o PDF para la identificación",
        variant: "destructive"
      });
      return;
    }

    // Validación de tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande", 
        description: "El archivo no puede superar los 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      // Subir a storage
      const bucket = type === 'profile' ? 'patient-profiles' : 'patient-documents';
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `${patientUserId}/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Guardar en patient_documents
      const { error: insertError } = await supabase
        .from('patient_documents')
        .insert({
          patient_user_id: patientUserId,
          document_type: type === 'profile' ? 'profile_image' : 'identification',
          document_url: publicUrl,
          original_filename: file.name,
          file_size: file.size,
          uploaded_by: user.id
        });

      if (insertError) throw insertError;

      // También actualizar profiles para compatibilidad
      const updateField = type === 'profile' ? 'profile_image_url' : 'id_document_url';
      await supabase
        .from('profiles')
        .update({ [updateField]: publicUrl })
        .eq('user_id', patientUserId);

      toast({
        title: "Éxito",
        description: `${type === 'profile' ? 'Foto de perfil' : 'Documento de identidad'} subido correctamente`,
      });

      onUploadComplete?.();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `No se pudo subir el ${type === 'profile' ? 'archivo' : 'documento'}`,
        variant: "destructive"
      });
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const createFileInputHandler = (type: 'profile' | 'id') => () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'profile' ? '.jpg,.jpeg,.png' : '.jpg,.jpeg,.png,.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, type);
      }
    };
    input.click();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button
        onClick={createFileInputHandler('profile')}
        disabled={uploading.profile}
        variant="outline"
        className="w-full"
      >
        {uploading.profile ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Subiendo foto...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Subir Foto de Perfil
          </>
        )}
      </Button>

      <Button
        onClick={createFileInputHandler('id')}
        disabled={uploading.id}
        variant="outline"
        className="w-full"
      >
        {uploading.id ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Subiendo documento...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Subir Identificación
          </>
        )}
      </Button>
    </div>
  );
};