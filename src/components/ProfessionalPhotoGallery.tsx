import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Camera, Upload, X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface PhotoGalleryProps {
  doctorProfile: any;
  onProfileUpdate: () => void;
}

export const ProfessionalPhotoGallery: React.FC<PhotoGalleryProps> = ({
  doctorProfile,
  onProfileUpdate
}) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadPhoto = async (file: File, photoType: 'profile' | 'professional' | 'office') => {
    if (!user) return;

    setUploading(photoType);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${photoType}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to doctor-photos bucket
      const { error: uploadError } = await supabase.storage
        .from('doctor-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('doctor-photos')
        .getPublicUrl(filePath);

      let updateData: any = {};

      if (photoType === 'profile') {
        // Update profile image in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ profile_image_url: publicUrl })
          .eq('user_id', user.id);

        if (profileError) throw profileError;

        // Also update in doctor_profiles
        updateData.profile_image_url = publicUrl;
      } else if (photoType === 'professional') {
        const currentPhotos = doctorProfile.professional_photos_urls || [];
        updateData.professional_photos_urls = [...currentPhotos, publicUrl];
      } else if (photoType === 'office') {
        const currentPhotos = doctorProfile.office_photos_urls || [];
        updateData.office_photos_urls = [...currentPhotos, publicUrl];
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('doctor_profiles')
          .update(updateData)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Foto subida",
        description: "La foto se ha guardado correctamente",
      });

      onProfileUpdate();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la foto",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = async (photoUrl: string, photoType: 'professional' | 'office') => {
    if (!user) return;

    try {
      let updateData: any = {};

      if (photoType === 'professional') {
        const currentPhotos = doctorProfile.professional_photos_urls || [];
        updateData.professional_photos_urls = currentPhotos.filter((url: string) => url !== photoUrl);
      } else if (photoType === 'office') {
        const currentPhotos = doctorProfile.office_photos_urls || [];
        updateData.office_photos_urls = currentPhotos.filter((url: string) => url !== photoUrl);
      }

      const { error: updateError } = await supabase
        .from('doctor_profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Also try to delete from storage
      const pathMatch = photoUrl.match(/\/doctor-photos\/(.+)/);
      if (pathMatch) {
        await supabase.storage
          .from('doctor-photos')
          .remove([pathMatch[1]]);
      }

      toast({
        title: "Foto eliminada",
        description: "La foto se ha eliminado correctamente",
      });

      onProfileUpdate();
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la foto",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (photoType: 'profile' | 'professional' | 'office') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadPhoto(file, photoType);
      }
    };
    input.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Galería Profesional
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sube fotos profesionales que los pacientes verán en tu perfil
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Profile Photo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Foto de Perfil Principal</h4>
              <p className="text-sm text-muted-foreground">Esta será tu foto principal en el directorio</p>
            </div>
            <Badge variant="outline">Requerida</Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <AspectRatio ratio={1} className="w-24 h-24">
                <div className="w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center">
                  {doctorProfile.profile_image_url ? (
                    <img 
                      src={doctorProfile.profile_image_url} 
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              </AspectRatio>
            </div>
            
            <Button
              variant="outline"
              onClick={() => handleFileSelect('profile')}
              disabled={uploading === 'profile'}
              className="gap-2"
            >
              {uploading === 'profile' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {doctorProfile.profile_image_url ? 'Cambiar Foto' : 'Subir Foto'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Professional Photos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Fotos Profesionales</h4>
              <p className="text-sm text-muted-foreground">Fotos tuyas en bata blanca, presentación profesional</p>
            </div>
            <Badge variant="outline">Recomendadas</Badge>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            {doctorProfile.professional_photos_urls?.map((photoUrl: string, index: number) => (
              <div key={index} className="relative group">
                <AspectRatio ratio={3/4}>
                  <img 
                    src={photoUrl} 
                    alt={`Foto profesional ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                    onClick={() => removePhoto(photoUrl, 'professional')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </AspectRatio>
              </div>
            ))}
            
            {(!doctorProfile.professional_photos_urls || doctorProfile.professional_photos_urls.length < 3) && (
              <div className="relative">
                <AspectRatio ratio={3/4}>
                  <Button
                    variant="outline"
                    className="w-full h-full border-dashed gap-2 flex-col"
                    onClick={() => handleFileSelect('professional')}
                    disabled={uploading === 'professional'}
                  >
                    {uploading === 'professional' ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    ) : (
                      <>
                        <Plus className="h-6 w-6" />
                        <span className="text-xs">Agregar Foto</span>
                      </>
                    )}
                  </Button>
                </AspectRatio>
              </div>
            )}
          </div>
        </div>

        {/* Office Photos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Fotos del Consultorio</h4>
              <p className="text-sm text-muted-foreground">Sala de espera, consultorio, equipos médicos (máx. 3 fotos)</p>
            </div>
            <Badge variant="outline">Opcional</Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {doctorProfile.office_photos_urls?.map((photoUrl: string, index: number) => (
              <div key={index} className="relative group">
                <AspectRatio ratio={4/3}>
                  <img 
                    src={photoUrl} 
                    alt={`Foto del consultorio ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                    onClick={() => removePhoto(photoUrl, 'office')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </AspectRatio>
              </div>
            ))}
            
            {(!doctorProfile.office_photos_urls || doctorProfile.office_photos_urls.length < 3) && (
              <div className="relative">
                <AspectRatio ratio={4/3}>
                  <Button
                    variant="outline"
                    className="w-full h-full border-dashed gap-2 flex-col"
                    onClick={() => handleFileSelect('office')}
                    disabled={uploading === 'office'}
                  >
                    {uploading === 'office' ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    ) : (
                      <>
                        <Plus className="h-6 w-6" />
                        <span className="text-xs">Agregar Foto</span>
                      </>
                    )}
                  </Button>
                </AspectRatio>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Camera className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Consejos para mejores fotos</h4>
              <p className="text-sm text-blue-700 mt-1">
                • Usa buena iluminación natural<br />
                • Mantén un fondo profesional y limpio<br />
                • Las fotos profesionales deben mostrar confianza<br />
                • Las fotos del consultorio deben transmitir limpieza y orden
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};