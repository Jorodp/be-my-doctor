import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Stethoscope, FileText, Save, UserPlus, Mail, Phone, Shield, BookOpen } from 'lucide-react';
import { DoctorImage } from '@/components/DoctorImage';

interface CreateDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDoctorCreated: () => void;
}

export function CreateDoctorModal({ isOpen, onClose, onDoctorCreated }: CreateDoctorModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Información personal
    full_name: '',
    email: '',
    phone: '',
    profile_image_url: '',
    
    // Información profesional
    specialty: '',
    professional_license: '',
    experience_years: '',
    biography: '',
    consultation_fee: '',
    
    // Documentos
    professional_license_document_url: '',
    university_degree_document_url: '',
    identification_document_url: '',
    
    // Configuración inicial
    verification_status: 'pending',
    subscription_status: 'inactive'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const tempUserId = `temp_${Date.now()}`;
    const fileName = `${folder}/${tempUserId}_${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleFileUpload = async (file: File, field: string, bucket: string, folder: string) => {
    try {
      setUploading(true);
      const url = await uploadFile(file, bucket, folder);
      handleInputChange(field, url);
      
      toast({
        title: 'Éxito',
        description: 'Archivo subido correctamente',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el archivo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const validateStep1 = () => {
    return formData.full_name.trim() && 
           formData.email.trim() && 
           formData.specialty.trim() && 
           formData.professional_license.trim();
  };

  const handleCreateDoctor = async () => {
    try {
      setLoading(true);

      // 1. Crear usuario en auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: `TempDoc${Math.random().toString(36).substring(2, 8)}`, // Contraseña temporal
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.full_name,
            role: 'doctor'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      const userId = authData.user.id;

      // 2. Crear perfil en la tabla profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: formData.full_name,
          phone: formData.phone,
          role: 'doctor',
          profile_image_url: formData.profile_image_url,
          roles: ['doctor']
        });

      if (profileError) throw profileError;

      // 3. Crear perfil de doctor
      const doctorProfileData = {
        user_id: userId,
        specialty: formData.specialty,
        professional_license: formData.professional_license,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        biography: formData.biography,
        consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
        professional_license_document_url: formData.professional_license_document_url,
        university_degree_document_url: formData.university_degree_document_url,
        identification_document_url: formData.identification_document_url,
        verification_status: 'pending',
        subscription_status: 'inactive',
        profile_complete: false,
        created_by_admin: true
      };

      const { error: doctorProfileError } = await supabase
        .from('doctor_profiles')
        .insert(doctorProfileData);

      if (doctorProfileError) throw doctorProfileError;

      toast({
        title: 'Éxito',
        description: `Doctor ${formData.full_name} creado correctamente. Se ha enviado un email de verificación.`,
      });

      // Limpiar formulario y cerrar modal
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        profile_image_url: '',
        specialty: '',
        professional_license: '',
        experience_years: '',
        biography: '',
        consultation_fee: '',
        professional_license_document_url: '',
        university_degree_document_url: '',
        identification_document_url: '',
        verification_status: 'pending',
        subscription_status: 'inactive'
      });
      setStep(1);
      onDoctorCreated();
      onClose();

    } catch (error: any) {
      console.error('Error creating doctor:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el doctor',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const FileUploadField = ({ 
    label, 
    field, 
    bucket, 
    folder, 
    accept = "image/*,application/pdf",
    required = false
  }: {
    label: string;
    field: string;
    bucket: string;
    folder: string;
    accept?: string;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file, field, bucket, folder);
          }
        }}
        disabled={uploading}
        className="cursor-pointer"
      />
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner size="sm" />
          Subiendo archivo...
        </div>
      )}
      {formData[field as keyof typeof formData] && (
        <div className="text-sm text-green-600">
          ✓ Archivo subido correctamente
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="w-6 h-6 text-primary" />
            Crear Nuevo Doctor
          </DialogTitle>
        </DialogHeader>

        <Tabs value={`step${step}`} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="step1" disabled={step < 1}>
              <User className="w-4 h-4 mr-2" />
              Información Básica
            </TabsTrigger>
            <TabsTrigger value="step2" disabled={step < 2}>
              <Stethoscope className="w-4 h-4 mr-2" />
              Información Profesional
            </TabsTrigger>
            <TabsTrigger value="step3" disabled={step < 3}>
              <FileText className="w-4 h-4 mr-2" />
              Documentos y Finalizar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="step1" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">
                      Nombre completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Dr. Juan Pérez González"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="doctor@hospital.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">
                      Especialidad <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => handleInputChange('specialty', e.target.value)}
                      placeholder="Cardiología"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Foto de perfil</Label>
                  <div className="flex items-start gap-4">
                    <DoctorImage 
                      profileImageUrl={formData.profile_image_url}
                      doctorName={formData.full_name}
                      size="lg"
                    />
                    <div className="flex-1">
                      <FileUploadField
                        label=""
                        field="profile_image_url"
                        bucket="doctor-images"
                        folder="profiles"
                        accept="image/*"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setStep(2)} 
                    disabled={!validateStep1()}
                    className="min-w-[120px]"
                  >
                    Siguiente →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="step2" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  Información Profesional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="professional_license">
                      Cédula Profesional <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="professional_license"
                      value={formData.professional_license}
                      onChange={(e) => handleInputChange('professional_license', e.target.value)}
                      placeholder="12345678"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience_years">Años de Experiencia</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      min="0"
                      max="60"
                      value={formData.experience_years}
                      onChange={(e) => handleInputChange('experience_years', e.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation_fee">Precio por Consulta (MXN)</Label>
                    <Input
                      id="consultation_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.consultation_fee}
                      onChange={(e) => handleInputChange('consultation_fee', e.target.value)}
                      placeholder="1500.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="biography">Biografía Profesional</Label>
                  <Textarea
                    id="biography"
                    value={formData.biography}
                    onChange={(e) => handleInputChange('biography', e.target.value)}
                    placeholder="Describe la experiencia y especialización del doctor..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                  >
                    ← Anterior
                  </Button>
                  <Button onClick={() => setStep(3)}>
                    Siguiente →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="step3" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documentos y Finalizar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUploadField
                    label="Cédula Profesional (Documento)"
                    field="professional_license_document_url"
                    bucket="doctor-documents"
                    folder="licenses"
                    required
                  />
                  <FileUploadField
                    label="Título Universitario"
                    field="university_degree_document_url"
                    bucket="doctor-documents"
                    folder="degrees"
                  />
                  <FileUploadField
                    label="Identificación Oficial"
                    field="identification_document_url"
                    bucket="doctor-documents"
                    folder="identification"
                  />
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Configuración Inicial
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• El doctor será creado con estado "Pendiente de Verificación"</p>
                    <p>• La suscripción estará "Inactiva" hasta que se active manualmente</p>
                    <p>• Se enviará un email de verificación al correo proporcionado</p>
                    <p>• El doctor deberá completar su perfil al iniciar sesión</p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(2)}
                    disabled={loading}
                  >
                    ← Anterior
                  </Button>
                  <Button 
                    onClick={handleCreateDoctor}
                    disabled={loading}
                    className="min-w-[140px]"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Crear Doctor
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
}