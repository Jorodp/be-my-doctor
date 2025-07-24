import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, MapPin, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PhysicalPaymentRequestFormProps {
  onSuccess?: () => void;
}

export const PhysicalPaymentRequestForm = ({ onSuccess }: PhysicalPaymentRequestFormProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    preferred_payment_method: '',
    preferred_location: '',
    subscription_type: '',
    notes: ''
  });

  const paymentMethods = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta (Terminal física)' },
    { value: 'transfer', label: 'Transferencia bancaria' }
  ];

  const subscriptionTypes = [
    { value: 'monthly', label: 'Mensual - $2,320 MXN (incluye IVA)', amount: 2320 },
    { value: 'annual', label: 'Anual - $23,200 MXN (incluye IVA, 2 meses gratis)', amount: 23200 }
  ];

  const getSubscriptionAmount = (type: string) => {
    const subscription = subscriptionTypes.find(s => s.value === type);
    return subscription ? subscription.amount : 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    try {
      // Validaciones
      if (!formData.preferred_payment_method || !formData.subscription_type) {
        toast({
          variant: "destructive",
          title: "Campos requeridos",
          description: "Por favor completa todos los campos obligatorios."
        });
        return;
      }

      const amount = getSubscriptionAmount(formData.subscription_type);

      const { error } = await supabase
        .from('physical_payment_requests')
        .insert({
          doctor_user_id: user.id,
          doctor_name: profile.full_name || 'Doctor',
          doctor_email: user.email || '',
          phone: formData.phone,
          preferred_payment_method: formData.preferred_payment_method,
          preferred_location: formData.preferred_location,
          subscription_type: formData.subscription_type,
          amount: amount,
          notes: formData.notes
        });

      if (error) throw error;

      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de pago físico ha sido enviada exitosamente. Nuestro equipo se pondrá en contacto contigo pronto."
      });

      // Limpiar formulario
      setFormData({
        phone: '',
        preferred_payment_method: '',
        preferred_location: '',
        subscription_type: '',
        notes: ''
      });

      onSuccess?.();

    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        variant: "destructive",
        title: "Error al enviar solicitud",
        description: error.message || "Hubo un problema al enviar tu solicitud. Intenta de nuevo."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Solicitud de Pago Físico</CardTitle>
            <CardDescription>
              Completa el formulario para solicitar información sobre el pago presencial de tu suscripción
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de contacto */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Información de Contacto</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de contacto</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+52 55 1234 5678"
              />
              <p className="text-sm text-muted-foreground">
                Número donde podemos contactarte para coordinar el pago
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_location">Ubicación preferida (opcional)</Label>
              <Input
                id="preferred_location"
                value={formData.preferred_location}
                onChange={(e) => handleInputChange('preferred_location', e.target.value)}
                placeholder="Ej: Ciudad de México, Polanco"
              />
              <p className="text-sm text-muted-foreground">
                Zona donde te gustaría realizar el pago (nos ayuda a coordinar mejor)
              </p>
            </div>
          </div>

          {/* Tipo de suscripción */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Tipo de Suscripción *</h3>
            </div>
            
            <RadioGroup
              value={formData.subscription_type}
              onValueChange={(value) => handleInputChange('subscription_type', value)}
              className="space-y-3"
            >
              {subscriptionTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="flex-1 cursor-pointer">
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {type.value === 'annual' && 'Ahorra 2 meses pagando anualmente'}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Método de pago preferido */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Método de Pago Preferido *</h3>
            </div>
            
            <Select 
              value={formData.preferred_payment_method} 
              onValueChange={(value) => handleInputChange('preferred_payment_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tu método de pago preferido" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas adicionales */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Comentarios Adicionales</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas o instrucciones especiales (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Cualquier información adicional que pueda ayudarnos a coordinar el pago..."
                rows={3}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">¿Qué sigue?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Nuestro equipo revisará tu solicitud en las próximas 24 horas</li>
              <li>• Te contactaremos al teléfono proporcionado para coordinar los detalles</li>
              <li>• Te daremos opciones de ubicación y horarios disponibles</li>
              <li>• Una vez realizado el pago, tu suscripción se activará inmediatamente</li>
            </ul>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
            size="lg"
          >
            {loading ? 'Enviando solicitud...' : 'Enviar Solicitud de Pago Físico'}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            Al enviar esta solicitud, un miembro de nuestro equipo se pondrá en contacto contigo 
            para coordinar el pago presencial de tu suscripción.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};