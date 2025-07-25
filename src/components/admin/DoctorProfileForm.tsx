import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, User, Stethoscope, Phone, Mail, Award } from 'lucide-react';

interface DoctorProfileFormProps {
  doctorProfile: any;
  userProfile: any;
  onUpdate: () => void;
}

export function DoctorProfileForm({ doctorProfile, userProfile, onUpdate }: DoctorProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Datos del usuario
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
    
    // Datos del doctor
    specialty: doctorProfile?.specialty || '',
    biography: doctorProfile?.biography || '',
    consultation_fee: doctorProfile?.consultation_fee?.toString() || '',
    experience_years: doctorProfile?.experience_years?.toString() || '',
    professional_license: doctorProfile?.professional_license || '',
    verification_status: doctorProfile?.verification_status || 'pending',
    subscription_status: doctorProfile?.subscription_status || 'inactive',
  });

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
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userProfile.user_id);

      if (userError) throw userError;

      // Preparar datos del doctor
      const doctorUpdateData: any = {
        specialty: formData.specialty,
        biography: formData.biography,
        professional_license: formData.professional_license,
        verification_status: formData.verification_status,
        subscription_status: formData.subscription_status,
        updated_at: new Date().toISOString()
      };

      // Solo incluir campos numéricos si tienen valor
      if (formData.consultation_fee) {
        doctorUpdateData.consultation_fee = parseFloat(formData.consultation_fee);
      }
      if (formData.experience_years) {
        doctorUpdateData.experience_years = parseInt(formData.experience_years);
      }

      // Actualizar perfil del doctor
      const { error: doctorError } = await supabase
        .from('doctor_profiles')
        .update(doctorUpdateData)
        .eq('user_id', doctorProfile.user_id);

      if (doctorError) throw doctorError;

      toast({
        title: 'Éxito',
        description: 'Los datos del doctor se actualizaron correctamente',
      });

      onUpdate();

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
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nombre completo
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Nombre completo del doctor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Teléfono
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Número de teléfono"
              />
            </div>
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
              <Label htmlFor="experience_years" className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Años de experiencia
              </Label>
              <Input
                id="experience_years"
                type="number"
                min="0"
                max="60"
                value={formData.experience_years}
                onChange={(e) => handleInputChange('experience_years', e.target.value)}
                placeholder="Años de experiencia"
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
            <div className="space-y-2">
              <Label htmlFor="consultation_fee">Precio por consulta (MXN)</Label>
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

      {/* Estado y Configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Estado y Configuración</CardTitle>
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
          className="min-w-[140px]"
        >
          {saving ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  );
}