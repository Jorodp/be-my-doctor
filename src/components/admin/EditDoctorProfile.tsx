import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, X } from 'lucide-react';
import { DoctorImageUpload } from './DoctorImageUpload';

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  professional_license: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  profile_image_url: string | null;
  office_address: string | null;
  office_phone: string | null;
  practice_locations: string[] | null;
  verification_status: 'pending' | 'verified' | 'rejected';
}

interface Profile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

interface EditDoctorProfileProps {
  isOpen: boolean;
  onClose: () => void;
  doctorProfile: DoctorProfile | null;
  profile: Profile | null;
  onProfileUpdated: () => void;
}

export const EditDoctorProfile = ({ 
  isOpen, 
  onClose, 
  doctorProfile, 
  profile,
  onProfileUpdated 
}: EditDoctorProfileProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    professional_license: '',
    specialty: '',
    biography: '',
    years_experience: '',
    consultation_fee: '',
    office_address: '',
    office_phone: '',
    practice_locations: ['']
  });

  useEffect(() => {
    if (doctorProfile && profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        professional_license: doctorProfile.professional_license || '',
        specialty: doctorProfile.specialty || '',
        biography: doctorProfile.biography || '',
        years_experience: doctorProfile.years_experience?.toString() || '',
        consultation_fee: doctorProfile.consultation_fee?.toString() || '',
        office_address: doctorProfile.office_address || '',
        office_phone: doctorProfile.office_phone || '',
        practice_locations: doctorProfile.practice_locations || ['']
      });
      setCurrentProfileImage(doctorProfile.profile_image_url);
    }
  }, [doctorProfile, profile]);

  // Image upload is now handled by DoctorImageUpload component

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorProfile || !profile) return;

    setLoading(true);

    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name.trim(),
          phone: profileData.phone.trim() || null
        })
        .eq('user_id', profile.user_id);

      if (profileError) throw profileError;

      // Update doctor_profiles table
      const { error: doctorError } = await supabase
        .from('doctor_profiles')
        .update({
          professional_license: profileData.professional_license.trim(),
          specialty: profileData.specialty.trim(),
          biography: profileData.biography.trim() || null,
          years_experience: profileData.years_experience ? parseInt(profileData.years_experience) : null,
          consultation_fee: profileData.consultation_fee ? parseFloat(profileData.consultation_fee) : null,
          office_address: profileData.office_address.trim() || null,
          office_phone: profileData.office_phone.trim() || null,
          practice_locations: profileData.practice_locations.filter(loc => loc.trim() !== '')
        })
        .eq('user_id', profile.user_id);

      if (doctorError) throw doctorError;

      toast({
        title: "Perfil actualizado",
        description: "Los datos del doctor han sido actualizados correctamente",
      });

      onProfileUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating doctor profile:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPracticeLocation = () => {
    setProfileData(prev => ({
      ...prev,
      practice_locations: [...prev.practice_locations, '']
    }));
  };

  const removePracticeLocation = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      practice_locations: prev.practice_locations.filter((_, i) => i !== index)
    }));
  };

  const updatePracticeLocation = (index: number, value: string) => {
    setProfileData(prev => ({
      ...prev,
      practice_locations: prev.practice_locations.map((loc, i) => i === index ? value : loc)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil de Doctor</DialogTitle>
          <DialogDescription>
            Modifica la información profesional del doctor. Solo administradores pueden realizar estos cambios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Personal</h3>
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
          </div>

          {/* Profile Photo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Foto de Perfil</h3>
            <DoctorImageUpload
              doctorId={doctorProfile.user_id}
              currentImageUrl={currentProfileImage}
              onImageUpdated={onProfileUpdated}
              disabled={loading}
            />
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Profesional</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license">Cédula Profesional *</Label>
                <Input
                  id="license"
                  value={profileData.professional_license}
                  onChange={(e) => setProfileData(prev => ({ ...prev, professional_license: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidad *</Label>
                <Input
                  id="specialty"
                  value={profileData.specialty}
                  onChange={(e) => setProfileData(prev => ({ ...prev, specialty: e.target.value }))}
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
                />
              </div>
            </div>
          </div>

          {/* Office Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información de Consultorio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="office_address">Dirección del Consultorio</Label>
                <Input
                  id="office_address"
                  value={profileData.office_address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, office_address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="office_phone">Teléfono del Consultorio</Label>
                <Input
                  id="office_phone"
                  value={profileData.office_phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, office_phone: e.target.value }))}
                />
              </div>
            </div>

            {/* Practice Locations */}
            <div className="space-y-2">
              <Label>Lugares de Atención</Label>
              {profileData.practice_locations.map((location, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={location}
                    onChange={(e) => updatePracticeLocation(index, e.target.value)}
                    placeholder={`Hospital o clínica ${index + 1}`}
                  />
                  {profileData.practice_locations.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePracticeLocation(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPracticeLocation}
              >
                Agregar lugar de atención
              </Button>
            </div>
          </div>

          {/* Actions */}
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
      </DialogContent>
    </Dialog>
  );
};