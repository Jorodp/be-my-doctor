import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User, Phone, MapPin, Stethoscope, Award, Building, DollarSign, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  profile_image_url: string | null;
  professional_license: string;
  office_address: string | null;
  office_phone: string | null;
  practice_locations: string[] | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  profile: {
    full_name: string | null;
    phone: string | null;
    address: string | null;
  } | null;
}

interface DoctorProfileDisplayProps {
  profile: DoctorProfile;
  onProfileUpdate: () => void;
}

export const DoctorProfileDisplay: React.FC<DoctorProfileDisplayProps> = ({ 
  profile, 
  onProfileUpdate 
}) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleImageUpload = async (file: File) => {
    if (!user) return;

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `profile.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to patient-profiles bucket
      const { error: uploadError } = await supabase.storage
        .from('patient-profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('patient-profiles')
        .getPublicUrl(filePath);

      // Update profile image in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ profile_image_url: publicUrl })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast({
        title: "Imagen actualizada",
        description: "Tu foto de perfil se ha actualizado correctamente",
      });

      onProfileUpdate();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la imagen",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageInputClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    };
    input.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return 'Verificado';
      case 'pending': return 'Pendiente de verificación';
      case 'rejected': return 'Rechazado';
      default: return 'Estado desconocido';
    }
  };

  const isProfileComplete = () => {
    return profile.professional_license && 
           profile.specialty && 
           profile.biography && 
           profile.years_experience && 
           profile.consultation_fee &&
           profile.profile?.full_name;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Mi Perfil Médico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Profile Status Alert */}
        {!isProfileComplete() && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">Perfil incompleto</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Tu perfil necesita información adicional para poder recibir pacientes. 
                  Solo un administrador puede editar estos datos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Header with Photo */}
        <div className="flex items-start gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={profile.profile_image_url || undefined} 
                alt={profile.profile?.full_name || 'Doctor'} 
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              variant="outline"
              className="absolute -bottom-2 -right-2 rounded-full p-2"
              onClick={handleImageInputClick}
              disabled={uploadingImage}
            >
              <Camera className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                Dr. {profile.profile?.full_name || 'Nombre no disponible'}
              </h2>
              <Badge className={getStatusColor(profile.verification_status)}>
                {getStatusIcon(profile.verification_status)}
                <span className="ml-1">{getStatusText(profile.verification_status)}</span>
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Stethoscope className="h-4 w-4" />
              <span>{profile.specialty}</span>
            </div>
            
            {profile.professional_license && (
              <div className="text-sm text-muted-foreground">
                Cédula Profesional: {profile.professional_license}
              </div>
            )}
          </div>
        </div>

        {/* Professional Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Información de Contacto
            </h3>
            <div className="space-y-2 text-sm">
              {profile.profile?.phone && (
                <div>
                  <span className="font-medium">Teléfono personal:</span> {profile.profile.phone}
                </div>
              )}
              {profile.office_phone && (
                <div>
                  <span className="font-medium">Teléfono consultorio:</span> {profile.office_phone}
                </div>
              )}
              {profile.office_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <div>
                    <span className="font-medium">Consultorio:</span><br />
                    {profile.office_address}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Professional Details */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Award className="h-4 w-4" />
              Información Profesional
            </h3>
            <div className="space-y-2 text-sm">
              {profile.years_experience && (
                <div>
                  <span className="font-medium">Experiencia:</span> {profile.years_experience} años
                </div>
              )}
              {profile.consultation_fee && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Consulta:</span> ${profile.consultation_fee} MXN
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Biography */}
        {profile.biography && (
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Biografía Profesional
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {profile.biography}
            </p>
          </div>
        )}

        {/* Practice Locations */}
        {profile.practice_locations && profile.practice_locations.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Building className="h-4 w-4" />
              Lugares de Atención
            </h3>
            <div className="space-y-1">
              {profile.practice_locations.map((location, index) => (
                <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  {location}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Información importante</h4>
              <p className="text-sm text-blue-700 mt-1">
                Solo los administradores pueden modificar la información profesional. 
                Si necesitas actualizar algún dato, contacta al administrador del sistema.
                Puedes cambiar tu foto de perfil usando el botón de la cámara.
              </p>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};