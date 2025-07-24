import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Trash2, User, Building2, Save, Plus, X, FileText, Camera, CreditCard } from 'lucide-react';
import { ProfessionalDocumentManager } from '@/components/ProfessionalDocumentManager';
import { DoctorDocumentManager } from '@/components/admin/DoctorDocumentManager';
import { PhysicalPaymentButton } from '@/components/admin/PhysicalPaymentButton';

interface Consultorio {
  nombre: string;
  direccion: string;
  horario: string;
}

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
  consultorios: Consultorio[] | null;
  verification_status: 'pending' | 'verified' | 'rejected';
}

interface Profile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

interface EditDoctorProfileAdvancedProps {
  isOpen: boolean;
  onClose: () => void;
  doctorProfile: DoctorProfile | null;
  profile: Profile | null;
  onProfileUpdated: () => void;
  physicalPaymentEnabled?: boolean;
}

export const EditDoctorProfileAdvanced = ({ 
  isOpen, 
  onClose, 
  doctorProfile,
  profile,
  onProfileUpdated,
  physicalPaymentEnabled = false
}: EditDoctorProfileAdvancedProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    specialty: '',
    professional_license: '',
    biography: '',
    years_experience: '',
    consultation_fee: '',
    office_address: '',
    office_phone: '',
    practice_locations: [''],
    consultorios: [{ nombre: '', direccion: '', horario: '' }] as Consultorio[]
  });

  const profileImageUrl = useSignedUrl('patient-profiles', doctorProfile?.profile_image_url);

  useEffect(() => {
    if (doctorProfile && profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        specialty: doctorProfile.specialty || '',
        professional_license: doctorProfile.professional_license || '',
        biography: doctorProfile.biography || '',
        years_experience: doctorProfile.years_experience?.toString() || '',
        consultation_fee: doctorProfile.consultation_fee?.toString() || '',
        office_address: doctorProfile.office_address || '',
        office_phone: doctorProfile.office_phone || '',
        practice_locations: doctorProfile.practice_locations || [''],
        consultorios: doctorProfile.consultorios || [{ nombre: '', direccion: '', horario: '' }]
      });
    }
  }, [doctorProfile, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorProfile || !profile) return;

    setLoading(true);

    try {
      // Update basic profile first
      const { data: profileResult, error: profileError } = await supabase.functions.invoke('admin-profile-management', {
        body: {
          action: 'update-profile',
          userId: profile.user_id,
          profileData: {
            full_name: profileData.full_name,
            phone: profileData.phone
          }
        }
      });

      if (profileError) throw profileError;
      if (!profileResult.success) throw new Error(profileResult.error);

      // Update doctor profile
      const { data: doctorResult, error: doctorError } = await supabase.functions.invoke('admin-profile-management', {
        body: {
          action: 'update-doctor-profile',
          userId: profile.user_id,
          profileData: {
            specialty: profileData.specialty,
            professional_license: profileData.professional_license,
            biography: profileData.biography,
            years_experience: profileData.years_experience ? parseInt(profileData.years_experience) : null,
            consultation_fee: profileData.consultation_fee ? parseFloat(profileData.consultation_fee) : null,
            office_address: profileData.office_address,
            office_phone: profileData.office_phone,
            practice_locations: profileData.practice_locations.filter(loc => loc.trim() !== ''),
            consultorios: profileData.consultorios.filter(cons => cons.nombre.trim() !== '')
          }
        }
      });

      if (doctorError) throw doctorError;
      if (!doctorResult.success) throw new Error(doctorResult.error);

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

  const handleImageUpload = async (file: File) => {
    if (!doctorProfile) return;

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result?.toString().split(',')[1];
          if (!base64) throw new Error('Failed to convert file');

          const fileName = `${doctorProfile.user_id}/${Date.now()}_${file.name}`;

          const { data, error } = await supabase.functions.invoke('admin-profile-management', {
            body: {
              action: 'upload-image',
              userId: doctorProfile.user_id,
              imageData: {
                file: base64,
                bucket: 'patient-profiles',
                path: fileName,
                field: 'profile_image_url',
                isDoctorProfile: true,
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
    if (!doctorProfile?.profile_image_url) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-profile-management', {
        body: {
          action: 'delete-image',
          userId: doctorProfile.user_id,
          imageData: {
            bucket: 'patient-profiles',
            path: doctorProfile.profile_image_url,
            field: 'profile_image_url',
            isDoctorProfile: true
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

  const addConsultorio = () => {
    setProfileData(prev => ({
      ...prev,
      consultorios: [...prev.consultorios, { nombre: '', direccion: '', horario: '' }]
    }));
  };

  const removeConsultorio = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      consultorios: prev.consultorios.filter((_, i) => i !== index)
    }));
  };

  const updateConsultorio = (index: number, field: keyof Consultorio, value: string) => {
    setProfileData(prev => ({
      ...prev,
      consultorios: prev.consultorios.map((cons, i) => 
        i === index ? { ...cons, [field]: value } : cons
      )
    }));
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

  if (!doctorProfile || !profile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil Completo de Doctor</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="profile-image">Foto</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="consultorios">Consultorios</TabsTrigger>
            <TabsTrigger value="practice">Práctica</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal y Profesional</CardTitle>
              </CardHeader>
              <CardContent>
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
                    
                    {doctorProfile.profile_image_url && (
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

          <TabsContent value="consultorios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Consultorios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileData.consultorios.map((consultorio, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Consultorio {index + 1}</h4>
                      {profileData.consultorios.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeConsultorio(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre del Consultorio</Label>
                        <Input
                          value={consultorio.nombre}
                          onChange={(e) => updateConsultorio(index, 'nombre', e.target.value)}
                          placeholder="Ej: Hospital General"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horario</Label>
                        <Input
                          value={consultorio.horario}
                          onChange={(e) => updateConsultorio(index, 'horario', e.target.value)}
                          placeholder="Ej: Lun-Vie 9:00-17:00"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Dirección</Label>
                      <Input
                        value={consultorio.direccion}
                        onChange={(e) => updateConsultorio(index, 'direccion', e.target.value)}
                        placeholder="Dirección completa del consultorio"
                      />
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addConsultorio}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Consultorio
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <DoctorDocumentManager 
              doctorProfile={doctorProfile}
              onProfileUpdate={onProfileUpdated}
              isAdminView={true}
            />
          </TabsContent>

          <TabsContent value="practice" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información de Práctica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="office_address">Dirección Principal</Label>
                    <Input
                      id="office_address"
                      value={profileData.office_address}
                      onChange={(e) => setProfileData(prev => ({ ...prev, office_address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office_phone">Teléfono Principal</Label>
                    <Input
                      id="office_phone"
                      value={profileData.office_phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, office_phone: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Practice Locations */}
                <div className="space-y-2">
                  <Label>Lugares de Atención Adicionales</Label>
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
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar lugar de atención
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Configuración de Pagos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctorProfile && profile && (
                  <PhysicalPaymentButton
                    doctorUserId={doctorProfile.user_id}
                    doctorName={profile.full_name || 'Doctor'}
                    isEnabled={physicalPaymentEnabled}
                    onToggleComplete={onProfileUpdated}
                  />
                )}
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Información sobre Pagos Físicos</h4>
                  <p className="text-sm text-gray-700 mb-3">
                    Los pagos físicos permiten al doctor solicitar ayuda para realizar el pago de su suscripción 
                    en efectivo o con tarjeta física a través de nuestro equipo de atención al cliente.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• El doctor puede contactar al equipo de soporte para coordinar el pago</li>
                    <li>• Se proporcionarán instrucciones específicas para el pago presencial</li>
                    <li>• El proceso incluye verificación manual por parte del equipo</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};