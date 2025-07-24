import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Stethoscope, UserPlus, Clock, MapPin } from 'lucide-react';

export default function DoctorRegistrationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialty: '',
    professional_license: '',
    years_experience: '',
    clinic_address: '',
    clinic_city: '',
    clinic_state: '',
    preferred_contact_method: 'phone',
    preferred_contact_time: '',
    additional_notes: ''
  });

  const specialties = [
    'Medicina General',
    'Cardiología',
    'Dermatología',
    'Pediatría',
    'Ginecología',
    'Neurología',
    'Oftalmología',
    'Ortopedia',
    'Psiquiatría',
    'Urología',
    'Otra'
  ];

  const contactMethods = [
    { value: 'phone', label: 'Teléfono' },
    { value: 'email', label: 'Correo electrónico' },
    { value: 'whatsapp', label: 'WhatsApp' }
  ];

  const contactTimes = [
    { value: 'morning', label: 'Mañana (8:00 - 12:00)' },
    { value: 'afternoon', label: 'Tarde (12:00 - 18:00)' },
    { value: 'evening', label: 'Noche (18:00 - 21:00)' },
    { value: 'any', label: 'Cualquier horario' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validaciones básicas
      if (!formData.full_name || !formData.email || !formData.phone || 
          !formData.specialty || !formData.professional_license || !formData.years_experience) {
        toast({
          variant: "destructive",
          title: "Campos requeridos",
          description: "Por favor completa todos los campos obligatorios."
        });
        return;
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          variant: "destructive",
          title: "Email inválido",
          description: "Por favor ingresa un email válido."
        });
        return;
      }

      // Validar años de experiencia
      const experience = parseInt(formData.years_experience);
      if (isNaN(experience) || experience < 0 || experience > 50) {
        toast({
          variant: "destructive",
          title: "Experiencia inválida",
          description: "Por favor ingresa un número válido de años de experiencia (0-50)."
        });
        return;
      }

      const { error } = await supabase
        .from('doctor_registration_requests')
        .insert([{
          ...formData,
          years_experience: experience
        }]);

      if (error) {
        throw error;
      }

      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud ha sido enviada exitosamente. Te contactaremos pronto para programar una visita."
      });

      // Limpiar formulario
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        specialty: '',
        professional_license: '',
        years_experience: '',
        clinic_address: '',
        clinic_city: '',
        clinic_state: '',
        preferred_contact_method: 'phone',
        preferred_contact_time: '',
        additional_notes: ''
      });

    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        variant: "destructive",
        title: "Error al enviar solicitud",
        description: error.message || "Hubo un problema al enviar tu solicitud. Intenta de nuevo."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">¿Eres profesional de la salud?</CardTitle>
        <CardDescription className="text-lg">
          Únete a nuestra plataforma de consultas médicas digitales
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Información Personal</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Dr. Juan Pérez"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="doctor@ejemplo.com"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+52 55 1234 5678"
                required
              />
            </div>
          </div>

          {/* Información Profesional */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Información Profesional</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidad *</Label>
                <Select value={formData.specialty} onValueChange={(value) => handleInputChange('specialty', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="years_experience">Años de experiencia *</Label>
                <Input
                  id="years_experience"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.years_experience}
                  onChange={(e) => handleInputChange('years_experience', e.target.value)}
                  placeholder="5"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="professional_license">Cédula profesional *</Label>
              <Input
                id="professional_license"
                value={formData.professional_license}
                onChange={(e) => handleInputChange('professional_license', e.target.value)}
                placeholder="12345678"
                required
              />
            </div>
          </div>

          {/* Ubicación del Consultorio */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Ubicación del Consultorio</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinic_address">Dirección del consultorio</Label>
                <Input
                  id="clinic_address"
                  value={formData.clinic_address}
                  onChange={(e) => handleInputChange('clinic_address', e.target.value)}
                  placeholder="Av. Reforma 123, Col. Centro"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinic_city">Ciudad</Label>
                  <Input
                    id="clinic_city"
                    value={formData.clinic_city}
                    onChange={(e) => handleInputChange('clinic_city', e.target.value)}
                    placeholder="Ciudad de México"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clinic_state">Estado</Label>
                  <Input
                    id="clinic_state"
                    value={formData.clinic_state}
                    onChange={(e) => handleInputChange('clinic_state', e.target.value)}
                    placeholder="CDMX"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferencias de Contacto */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Preferencias de Contacto</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferred_contact_method">Método de contacto preferido</Label>
                <Select 
                  value={formData.preferred_contact_method} 
                  onValueChange={(value) => handleInputChange('preferred_contact_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contactMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preferred_contact_time">Horario preferido</Label>
                <Select 
                  value={formData.preferred_contact_time} 
                  onValueChange={(value) => handleInputChange('preferred_contact_time', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un horario" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactTimes.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notas Adicionales */}
          <div className="space-y-2">
            <Label htmlFor="additional_notes">Comentarios adicionales</Label>
            <Textarea
              id="additional_notes"
              value={formData.additional_notes}
              onChange={(e) => handleInputChange('additional_notes', e.target.value)}
              placeholder="Cualquier información adicional que consideres importante..."
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? 'Enviando solicitud...' : 'Enviar solicitud de registro'}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            Al enviar esta solicitud, un miembro de nuestro equipo se pondrá en contacto contigo 
            para programar una visita a tu consultorio y completar el proceso de registro.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}