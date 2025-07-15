import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Trash2, User, UserCheck, Save } from 'lucide-react';

interface AssistantProfile {
  user_id: string;
  full_name: string;
  phone: string | null;
  profile_image_url: string | null;
  role: string;
  email?: string;
  assigned_doctor_id?: string;
}

interface Doctor {
  user_id: string;
  full_name: string;
  specialty: string;
}

interface EditAssistantProfileProps {
  isOpen: boolean;
  onClose: () => void;
  assistantProfile: AssistantProfile | null;
  onProfileUpdated: () => void;
}

export const EditAssistantProfile = ({ 
  isOpen, 
  onClose, 
  assistantProfile,
  onProfileUpdated 
}: EditAssistantProfileProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    assigned_doctor_id: ''
  });

  const profileImageUrl = useSignedUrl('patient-profiles', assistantProfile?.profile_image_url);

  useEffect(() => {
    if (assistantProfile) {
      setProfileData({
        full_name: assistantProfile.full_name || '',
        phone: assistantProfile.phone || '',
        assigned_doctor_id: assistantProfile.assigned_doctor_id || ''
      });
    }
  }, [assistantProfile]);

  useEffect(() => {
    if (isOpen) {
      fetchDoctors();
    }
  }, [isOpen]);

  const fetchDoctors = async () => {
    try {
      const { data: doctorProfiles, error } = await supabase
        .from('doctor_profiles')
        .select(`
          user_id,
          specialty
        `)
        .eq('verification_status', 'verified');

      if (error) throw error;

      // Get profiles separately
      const userIds = doctorProfiles.map(dp => dp.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const formattedDoctors = doctorProfiles.map(dp => {
        const profile = profiles?.find(p => p.user_id === dp.user_id);
        return {
          user_id: dp.user_id,
          full_name: profile?.full_name || 'Sin nombre',
          specialty: dp.specialty
        };
      });

      setDoctors(formattedDoctors);
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los doctores",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantProfile) return;

    setLoading(true);

    try {
      // Update basic profile
      const { data: profileResult, error: profileError } = await supabase.functions.invoke('admin-profile-management', {
        body: {
          action: 'update-profile',
          userId: assistantProfile.user_id,
          profileData: {
            full_name: profileData.full_name,
            phone: profileData.phone
          }
        }
      });

      if (profileError) throw profileError;
      if (!profileResult.success) throw new Error(profileResult.error);

      // Update assigned doctor if changed
      if (profileData.assigned_doctor_id !== assistantProfile.assigned_doctor_id) {
        const { data: doctorResult, error: doctorError } = await supabase.functions.invoke('admin-profile-management', {
          body: {
            action: 'update-assistant-doctor',
            userId: assistantProfile.user_id,
            profileData: {
              assigned_doctor_id: profileData.assigned_doctor_id || null
            }
          }
        });

        if (doctorError) throw doctorError;
        if (!doctorResult.success) throw new Error(doctorResult.error);
      }

      toast({
        title: "Perfil actualizado",
        description: "Los datos del asistente han sido actualizados correctamente",
      });

      onProfileUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating assistant profile:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!assistantProfile) return;

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result?.toString().split(',')[1];
          if (!base64) throw new Error('Failed to convert file');

          const fileName = `${assistantProfile.user_id}/${Date.now()}_${file.name}`;

          const { data, error } = await supabase.functions.invoke('admin-profile-management', {
            body: {
              action: 'upload-image',
              userId: assistantProfile.user_id,
              imageData: {
                file: base64,
                bucket: 'patient-profiles',
                path: fileName,
                field: 'profile_image_url',
                contentType: file.type
              }
            }
          });

          if (error) throw error;
          if (!data.success) throw new Error(data.error);

          toast({
            title: "Imagen subida",
            description: "La foto de perfil ha sido actualizada correctamente",
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
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
    if (!assistantProfile?.profile_image_url) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-profile-management', {
        body: {
          action: 'delete-image',
          userId: assistantProfile.user_id,
          imageData: {
            bucket: 'patient-profiles',
            path: assistantProfile.profile_image_url,
            field: 'profile_image_url'
          }
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Imagen eliminada",
        description: "La foto de perfil ha sido eliminada correctamente",
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

  if (!assistantProfile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil de Asistente</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="profile-image">Foto de Perfil</TabsTrigger>
            <TabsTrigger value="assignment">Asignación</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Asistente</CardTitle>
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
                    <Label>Email</Label>
                    <Input
                      value={assistantProfile.email || 'No disponible'}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t">
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
                        <Button asChild disabled={uploadingImage}>
                          <span>
                            {uploadingImage ? (
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
                          if (file) handleImageUpload(file);
                        }}
                      />
                    </div>
                    
                    {assistantProfile.profile_image_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleImageDelete}
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

          <TabsContent value="assignment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Asignación de Doctor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assigned_doctor">Doctor Asignado</Label>
                  <Select 
                    value={profileData.assigned_doctor_id} 
                    onValueChange={(value) => setProfileData(prev => ({ ...prev, assigned_doctor_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.user_id} value={doctor.user_id}>
                          {doctor.full_name} - {doctor.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {profileData.assigned_doctor_id && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Doctor actual:</strong> {doctors.find(d => d.user_id === profileData.assigned_doctor_id)?.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      El asistente tendrá acceso a los pacientes y citas de este doctor.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? (
                      <>
                        <LoadingSpinner className="mr-2 h-4 w-4" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Asignación
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};