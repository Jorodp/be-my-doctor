import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, User, Stethoscope, CreditCard } from 'lucide-react';

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  biography?: string;
  consultation_fee?: number;
  subscription_status: string;
  verification_status: string;
  experience_years?: number;
  professional_license?: string;
  office_phone?: string;
  office_address?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  phone?: string;
  profile_image_url?: string;
}

interface AdminEditDoctorProps {
  doctorId: string;
}

export function AdminEditDoctor({ doctorId }: AdminEditDoctorProps) {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    specialty: '',
    biography: '',
    consultation_fee: '',
    subscription_status: '',
    verification_status: '',
    experience_years: '',
    professional_license: '',
    office_phone: '',
    office_address: '',
    profile_image_url: ''
  });

  useEffect(() => {
    loadDoctorData();
  }, [doctorId]);

  const loadDoctorData = async () => {
    try {
      setLoading(true);
      
      // Cargar perfil del doctor
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', doctorId)
        .single();

      if (doctorError) throw doctorError;

      // Cargar perfil de usuario
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', doctorId)
        .single();

      if (userError) throw userError;

      setDoctorProfile(doctorData);
      setUserProfile(userData);

      // Llenar el formulario con los datos existentes
      setFormData({
        full_name: userData?.full_name || '',
        phone: userData?.phone || '',
        specialty: doctorData?.specialty || '',
        biography: doctorData?.biography || '',
        consultation_fee: doctorData?.consultation_fee?.toString() || '',
        subscription_status: doctorData?.subscription_status || '',
        verification_status: doctorData?.verification_status || '',
        experience_years: doctorData?.experience_years?.toString() || '',
        professional_license: doctorData?.professional_license || '',
        office_phone: doctorData?.office_phone || '',
        office_address: doctorData?.office_address || '',
        profile_image_url: userData?.profile_image_url || ''
      });

    } catch (error) {
      console.error('Error loading doctor data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del doctor',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Actualizar perfil de usuario
      const { error: userError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          profile_image_url: formData.profile_image_url
        })
        .eq('user_id', doctorId);

      if (userError) throw userError;

      // Actualizar perfil del doctor
      const doctorUpdateData: any = {
        specialty: formData.specialty,
        biography: formData.biography,
        subscription_status: formData.subscription_status,
        verification_status: formData.verification_status,
        professional_license: formData.professional_license,
        office_phone: formData.office_phone,
        office_address: formData.office_address
      };

      // Solo incluir campos numéricos si tienen valor
      if (formData.consultation_fee) {
        doctorUpdateData.consultation_fee = parseFloat(formData.consultation_fee);
      }
      if (formData.experience_years) {
        doctorUpdateData.experience_years = parseInt(formData.experience_years);
      }

      const { error: doctorError } = await supabase
        .from('doctor_profiles')
        .update(doctorUpdateData)
        .eq('user_id', doctorId);

      if (doctorError) throw doctorError;

      toast({
        title: 'Éxito',
        description: 'Los datos del doctor se actualizaron correctamente',
        variant: 'default'
      });

      // Recargar datos
      await loadDoctorData();

    } catch (error) {
      console.error('Error saving doctor data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!doctorProfile || !userProfile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No se encontró la información del doctor
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información Personal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Nombre completo del doctor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Número de teléfono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office_phone">Teléfono del consultorio</Label>
              <Input
                id="office_phone"
                value={formData.office_phone}
                onChange={(e) => handleInputChange('office_phone', e.target.value)}
                placeholder="Teléfono del consultorio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile_image_url">URL de foto de perfil</Label>
              <Input
                id="profile_image_url"
                value={formData.profile_image_url}
                onChange={(e) => handleInputChange('profile_image_url', e.target.value)}
                placeholder="URL de la imagen de perfil"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="office_address">Dirección del consultorio</Label>
            <Textarea
              id="office_address"
              value={formData.office_address}
              onChange={(e) => handleInputChange('office_address', e.target.value)}
              placeholder="Dirección completa del consultorio"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Información Profesional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Información Profesional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidad</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) => handleInputChange('specialty', e.target.value)}
                placeholder="Especialidad médica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience_years">Años de experiencia</Label>
              <Input
                id="experience_years"
                type="number"
                value={formData.experience_years}
                onChange={(e) => handleInputChange('experience_years', e.target.value)}
                placeholder="Años de experiencia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultation_fee">Precio de consulta (MXN)</Label>
              <Input
                id="consultation_fee"
                type="number"
                step="0.01"
                value={formData.consultation_fee}
                onChange={(e) => handleInputChange('consultation_fee', e.target.value)}
                placeholder="Precio de consulta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="professional_license">Cédula profesional</Label>
              <Input
                id="professional_license"
                value={formData.professional_license}
                onChange={(e) => handleInputChange('professional_license', e.target.value)}
                placeholder="Número de cédula profesional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="biography">Biografía</Label>
            <Textarea
              id="biography"
              value={formData.biography}
              onChange={(e) => handleInputChange('biography', e.target.value)}
              placeholder="Biografía del doctor"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Estado y Suscripción */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Estado y Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="verification_status">Estado de verificación</Label>
              <Select
                value={formData.verification_status}
                onValueChange={(value) => handleInputChange('verification_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="verified">Verificado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription_status">Estado de suscripción</Label>
              <Select
                value={formData.subscription_status}
                onValueChange={(value) => handleInputChange('subscription_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón de guardar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}