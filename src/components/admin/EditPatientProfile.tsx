import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Trash2, User, FileText, Save } from 'lucide-react';

interface PatientProfile {
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  profile_image_url: string | null;
  id_document_url: string | null;
  role: string;
}

interface EditPatientProfileProps {
  isOpen: boolean;
  onClose: () => void;
  patientProfile: PatientProfile | null;
  onProfileUpdated: () => void;
}

export const EditPatientProfile = ({ 
  isOpen, 
  onClose, 
  patientProfile,
  onProfileUpdated 
}: EditPatientProfileProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    address: '',
    date_of_birth: ''
  });

  const profileImageUrl = useSignedUrl('patient-profiles', patientProfile?.profile_image_url);
  const idDocumentUrl = useSignedUrl('patient-documents', patientProfile?.id_document_url);

  useEffect(() => {
    if (patientProfile) {
      setProfileData({
        full_name: patientProfile.full_name || '',
        phone: patientProfile.phone || '',
        address: patientProfile.address || '',
        date_of_birth: patientProfile.date_of_birth || ''
      });
    }
  }, [patientProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientProfile) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-profile-management', {
        body: {
          action: 'update-profile',
          userId: patientProfile.user_id,
          profileData: {
            ...profileData,
            date_of_birth: profileData.date_of_birth || null
          }
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      toast({
        title: "Perfil actualizado",
        description: "Los datos del paciente han sido actualizados correctamente",
      });

      onProfileUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating patient profile:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, field: 'profile_image_url' | 'id_document_url') => {
    if (!patientProfile) return;

    const bucket = field === 'profile_image_url' ? 'patient-profiles' : 'patient-documents';
    const setter = field === 'profile_image_url' ? setUploadingProfile : setUploadingId;
    
    setter(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result?.toString().split(',')[1];
          if (!base64) throw new Error('Failed to convert file');

          const fileName = `${patientProfile.user_id}/${Date.now()}_${file.name}`;

          const { data, error } = await supabase.functions.invoke('admin-profile-management', {
            body: {
              action: 'upload-image',
              userId: patientProfile.user_id,
              imageData: {
                file: base64,
                bucket,
                path: fileName,
                field,
                contentType: file.type
              }
            }
          });

          if (error) throw error;

          if (!data.success) {
            throw new Error(data.error);
          }

          toast({
            title: "Imagen subida",
            description: "La imagen ha sido subida correctamente",
          });

          onProfileUpdated();
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          toast({
            title: "Error",
            description: uploadError.message || "No se pudo subir la imagen",
            variant: "destructive"
          });
        }
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setter(false);
    }
  };

  const handleImageDelete = async (field: 'profile_image_url' | 'id_document_url') => {
    if (!patientProfile) return;

    const bucket = field === 'profile_image_url' ? 'patient-profiles' : 'patient-documents';
    const imagePath = field === 'profile_image_url' ? patientProfile.profile_image_url : patientProfile.id_document_url;
    
    if (!imagePath) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-profile-management', {
        body: {
          action: 'delete-image',
          userId: patientProfile.user_id,
          imageData: {
            bucket,
            path: imagePath,
            field
          }
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      toast({
        title: "Imagen eliminada",
        description: "La imagen ha sido eliminada correctamente",
      });

      onProfileUpdated();
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la imagen",
        variant: "destructive"
      });
    }
  };

  if (!patientProfile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil de Paciente</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="profile-image">Foto de Perfil</TabsTrigger>
            <TabsTrigger value="id-document">Identificación</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Datos Personales</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre Completo *</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={profileData.address}
                      onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Fecha de Nacimiento</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={profileData.date_of_birth}
                      onChange={(e) => setProfileData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <LoadingSpinner className="mr-2 h-4 w-4" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile-image" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Foto de Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileImageUrl.signedUrl || undefined} />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="profile-upload" className="cursor-pointer">
                        <Button asChild disabled={uploadingProfile}>
                          <span>
                            {uploadingProfile ? (
                              <>
                                <LoadingSpinner className="mr-2 h-4 w-4" />
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Subir Nueva Foto
                              </>
                            )}
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id="profile-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'profile_image_url');
                        }}
                      />
                    </div>
                    
                    {patientProfile.profile_image_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImageDelete('profile_image_url')}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar Foto
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="id-document" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Identificación Oficial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patientProfile.id_document_url && idDocumentUrl.signedUrl && (
                  <div className="border rounded-lg p-4">
                    <img 
                      src={idDocumentUrl.signedUrl} 
                      alt="Identificación oficial" 
                      className="max-w-full h-auto max-h-64 object-contain mx-auto"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="id-upload" className="cursor-pointer">
                      <Button asChild disabled={uploadingId}>
                        <span>
                          {uploadingId ? (
                            <>
                              <LoadingSpinner className="mr-2 h-4 w-4" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {patientProfile.id_document_url ? 'Reemplazar ID' : 'Subir ID'}
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="id-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'id_document_url');
                      }}
                    />
                  </div>
                  
                  {patientProfile.id_document_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImageDelete('id_document_url')}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar ID
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};