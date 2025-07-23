import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Upload, FileText, User, Camera } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface Documents {
  profile_image_url: string | null;
  id_document_url: string | null;
}

export const PatientDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'profile' | 'id' | null>(null);
  const [documents, setDocuments] = useState<Documents>({
    profile_image_url: null,
    id_document_url: null
  });

  const profileImageUrl = useSignedUrl('patient-profiles', documents.profile_image_url);
  const idDocumentUrl = useSignedUrl('patient-documents', documents.id_document_url);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_image_url, id_document_url')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setDocuments({
          profile_image_url: data.profile_image_url,
          id_document_url: data.id_document_url
        });
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'profile' | 'id') => {
    if (!user) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "El archivo no puede ser mayor a 5MB",
        variant: "destructive"
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive"
      });
      return;
    }

    setUploading(type);
    try {
      const bucket = type === 'profile' ? 'patient-profiles' : 'patient-documents';
      const fileName = `${user.id}/${type}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const updateField = type === 'profile' ? 'profile_image_url' : 'id_document_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: fileName })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setDocuments(prev => ({
        ...prev,
        [updateField]: fileName
      }));

      toast({
        title: "Éxito",
        description: `${type === 'profile' ? 'Foto de perfil' : 'Documento de identificación'} subido correctamente`
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `No se pudo subir ${type === 'profile' ? 'la foto de perfil' : 'el documento'}`,
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const triggerFileInput = (type: 'profile' | 'id') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, type);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Mis Documentos</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Foto de Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>
              Sube tu foto de perfil para que los médicos puedan identificarte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.profile_image_url && profileImageUrl.signedUrl ? (
              <div className="flex justify-center">
                <img 
                  src={profileImageUrl.signedUrl} 
                  alt="Foto de perfil"
                  className="w-32 h-32 rounded-full object-cover border-2 border-border"
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-16 h-16 text-muted-foreground" />
                </div>
              </div>
            )}
            
            <Button 
              onClick={() => triggerFileInput('profile')}
              disabled={uploading === 'profile'}
              className="w-full"
              variant={documents.profile_image_url ? "outline" : "default"}
            >
              {uploading === 'profile' ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {documents.profile_image_url ? 'Cambiar Foto' : 'Subir Foto'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Documento de Identificación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Identificación Oficial
            </CardTitle>
            <CardDescription>
              Sube una foto de tu identificación oficial (INE, pasaporte, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.id_document_url && idDocumentUrl.signedUrl ? (
              <div className="flex justify-center">
                <img 
                  src={idDocumentUrl.signedUrl} 
                  alt="Documento de identificación"
                  className="w-48 h-32 object-cover border-2 border-border rounded"
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-48 h-32 bg-muted flex items-center justify-center rounded border-2 border-dashed border-border">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                </div>
              </div>
            )}
            
            <Button 
              onClick={() => triggerFileInput('id')}
              disabled={uploading === 'id'}
              className="w-full"
              variant={documents.id_document_url ? "outline" : "default"}
            >
              {uploading === 'id' ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {documents.id_document_url ? 'Cambiar Documento' : 'Subir Documento'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
        <p className="mb-2"><strong>Importante:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Los archivos deben ser imágenes (JPG, PNG, etc.)</li>
          <li>Tamaño máximo: 5MB por archivo</li>
          <li>Tu identificación debe ser legible y estar vigente</li>
          <li>Estos documentos son necesarios para verificar tu identidad</li>
        </ul>
      </div>
    </div>
  );
};