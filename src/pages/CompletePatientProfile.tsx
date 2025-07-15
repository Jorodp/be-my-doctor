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

export const CompletePatientProfile = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    date_of_birth: profile?.date_of_birth || '',
    profile_image_url: profile?.profile_image_url || ''
  });

  const handleFileUpload = async (file: File) => {
    if (!user) return;

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
      if (!profileData.full_name.trim()) {
        toast({
          title: "Campo requerido",
          description: "Por favor completa tu nombre completo",
          variant: "destructive"
        });
        return;
      }

      console.log('Submitting patient profile data:', profileData);

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name.trim(),
          phone: profileData.phone.trim() || null,
          address: profileData.address.trim() || null,
          date_of_birth: profileData.date_of_birth || null,
          profile_image_url: profileData.profile_image_url || null
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      toast({
        title: "Perfil completado",
        description: "Tu perfil ha sido actualizado correctamente",
      });

      // Redirect to patient dashboard
      navigate('/dashboard/patient', { replace: true });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil. Intenta nuevamente.",
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
            <CardTitle className="text-xl">Completar Perfil de Paciente</CardTitle>
            <CardDescription>
              Para tener acceso completo a la plataforma, necesitas completar tu perfil con tu información personal.
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

              {/* Personal Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre Completo *</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Ej: Juan Pérez García"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+52 55 1234 5678"
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

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Textarea
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Calle, Colonia, Ciudad, Estado"
                    rows={3}
                  />
                </div>
              </div>

              {/* Information about current user */}
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Información de registro:</p>
                    <p className="text-sm text-muted-foreground">
                      Email: {user?.email}<br />
                      Rol: Paciente
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