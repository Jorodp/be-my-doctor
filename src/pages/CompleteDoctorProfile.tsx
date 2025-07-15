import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, User, FileText } from 'lucide-react';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';

export const CompleteDoctorProfile = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    professional_license: '',
    specialty: '',
    biography: '',
    years_experience: '',
    consultation_fee: '',
    profile_image_url: '',
    office_address: '',
    office_phone: '',
    practice_locations: ['']
  });

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `profile.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to patient-profiles bucket (reusing existing bucket)
      const { error: uploadError } = await supabase.storage
        .from('patient-profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('patient-profiles')
        .getPublicUrl(filePath);

      setProfileData(prev => ({ ...prev, profile_image_url: publicUrl }));

      toast({
        title: "Imagen subida",
        description: "Foto de perfil actualizada correctamente",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen",
        variant: "destructive"
      });
    }
  };

  const handleImageInputClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Validate required fields
      if (!profileData.professional_license || !profileData.specialty) {
        toast({
          title: "Campos requeridos",
          description: "Por favor completa al menos la cédula profesional y especialidad",
          variant: "destructive"
        });
        return;
      }

      // Create doctor profile
      const doctorProfileData = {
        user_id: user.id,
        professional_license: profileData.professional_license,
        specialty: profileData.specialty,
        biography: profileData.biography || null,
        years_experience: profileData.years_experience ? parseInt(profileData.years_experience) : null,
        consultation_fee: profileData.consultation_fee ? parseFloat(profileData.consultation_fee) : null,
        profile_image_url: profileData.profile_image_url || null,
        office_address: profileData.office_address || null,
        office_phone: profileData.office_phone || null,
        practice_locations: profileData.practice_locations.filter(loc => loc.trim() !== ''),
        verification_status: 'pending' as const
      };

      const { error: doctorError } = await supabase
        .from('doctor_profiles')
        .insert([doctorProfileData]);

      if (doctorError) throw doctorError;

      // Update profile image URL in profiles table if provided
      if (profileData.profile_image_url) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ profile_image_url: profileData.profile_image_url })
          .eq('user_id', user.id);

        if (profileError) {
          console.error('Error updating profile image:', profileError);
        }
      }

      toast({
        title: "Perfil completado",
        description: "Tu perfil ha sido enviado para verificación. Te notificaremos cuando sea aprobado.",
      });

      // Refresh the page to load the new doctor profile
      window.location.reload();
    } catch (error) {
      console.error('Error creating doctor profile:', error);
      toast({
        title: "Error",
        description: "No se pudo completar el perfil. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-section px-4 py-8">
      {/* Back to Home Button */}
      <div className="absolute top-4 left-4">
        <BackToHomeButton />
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/lovable-uploads/2176a5eb-dd8e-4ff9-8a38-3cfe98feb63a.png" alt="Be My Doctor" className="h-8 w-auto" />
              <CardTitle className="text-2xl">Be My Doctor</CardTitle>
            </div>
            <CardTitle className="text-xl">Completar Perfil Médico</CardTitle>
            <CardDescription>
              Para comenzar a ofrecer consultas, necesitas completar tu perfil profesional.
              La información será verificada por nuestro equipo antes de activar tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Image */}
              <div className="space-y-4">
                <Label>Foto de Perfil</Label>
                <div className="flex flex-col items-center gap-4">
                  {profileData.profile_image_url ? (
                    <div className="w-32 h-32">
                      <img
                        src={profileData.profile_image_url}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover rounded-full border-4 border-primary/20"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center border-4 border-primary/20">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleImageInputClick}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {profileData.profile_image_url ? 'Cambiar foto' : 'Subir foto'}
                  </Button>
                </div>
              </div>

              {/* Professional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license">Cédula Profesional *</Label>
                  <Input
                    id="license"
                    value={profileData.professional_license}
                    onChange={(e) => setProfileData(prev => ({ ...prev, professional_license: e.target.value }))}
                    placeholder="Ej: 12345678"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidad *</Label>
                  <Input
                    id="specialty"
                    value={profileData.specialty}
                    onChange={(e) => setProfileData(prev => ({ ...prev, specialty: e.target.value }))}
                    placeholder="Ej: Medicina General"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="biography">Biografía Profesional</Label>
                <Textarea
                  id="biography"
                  value={profileData.biography}
                  onChange={(e) => setProfileData(prev => ({ ...prev, biography: e.target.value }))}
                  placeholder="Describe tu experiencia, logros académicos y áreas de especialización..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Años de Experiencia</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={profileData.years_experience}
                    onChange={(e) => setProfileData(prev => ({ ...prev, years_experience: e.target.value }))}
                    placeholder="5"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fee">Precio por Consulta (MXN)</Label>
                  <Input
                    id="fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={profileData.consultation_fee}
                    onChange={(e) => setProfileData(prev => ({ ...prev, consultation_fee: e.target.value }))}
                    placeholder="800.00"
                  />
                </div>
              </div>

              {/* Contact and Practice Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="office_address">Dirección del Consultorio</Label>
                  <Input
                    id="office_address"
                    value={profileData.office_address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, office_address: e.target.value }))}
                    placeholder="Calle, Ciudad, Estado"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="office_phone">Teléfono del Consultorio</Label>
                  <Input
                    id="office_phone"
                    value={profileData.office_phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, office_phone: e.target.value }))}
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>

              {/* Practice Locations */}
              <div className="space-y-2">
                <Label>Lugares de Atención (Hospitales/Clínicas)</Label>
                {profileData.practice_locations.map((location, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={location}
                      onChange={(e) => {
                        const newLocations = [...profileData.practice_locations];
                        newLocations[index] = e.target.value;
                        setProfileData(prev => ({ ...prev, practice_locations: newLocations }));
                      }}
                      placeholder={`Hospital o clínica ${index + 1}`}
                    />
                    {profileData.practice_locations.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newLocations = profileData.practice_locations.filter((_, i) => i !== index);
                          setProfileData(prev => ({ ...prev, practice_locations: newLocations }));
                        }}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProfileData(prev => ({ 
                      ...prev, 
                      practice_locations: [...prev.practice_locations, ''] 
                    }));
                  }}
                >
                  Agregar lugar de atención
                </Button>
              </div>

              {/* Information about current user */}
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Información de registro:</p>
                    <p className="text-sm text-muted-foreground">
                      Nombre: {profile?.full_name}<br />
                      Email: {user?.email}<br />
                      Teléfono: {profile?.phone || 'No proporcionado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit and Cancel */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Guardando...
                    </>
                  ) : (
                    'Completar Perfil'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => signOut()}
                  disabled={loading}
                >
                  Cerrar Sesión
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};