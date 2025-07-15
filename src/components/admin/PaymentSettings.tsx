import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, DollarSign } from 'lucide-react';

interface PaymentSettings {
  monthly_price: number;
  annual_price: number;
  updated_at: string;
}

export const PaymentSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [annualPrice, setAnnualPrice] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setMonthlyPrice(data.monthly_price.toString());
        setAnnualPrice(data.annual_price.toString());
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones de pago",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!monthlyPrice || !annualPrice) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    const monthly = parseFloat(monthlyPrice);
    const annual = parseFloat(annualPrice);

    if (monthly <= 0 || annual <= 0) {
      toast({
        title: "Error",
        description: "Los precios deben ser números positivos",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_settings')
        .update({
          monthly_price: monthly,
          annual_price: annual,
          updated_at: new Date().toISOString()
        })
        .eq('id', true);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Precios de suscripción actualizados correctamente"
      });

      await fetchSettings();
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Configuración de Precios de Suscripción
        </CardTitle>
        <CardDescription>
          Configura los precios para las suscripciones mensuales y anuales de los doctores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="monthly_price">Plan Mensual (MXN)</Label>
            <Input
              id="monthly_price"
              type="number"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              placeholder="799"
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annual_price">Plan Anual (MXN)</Label>
            <Input
              id="annual_price"
              type="number"
              value={annualPrice}
              onChange={(e) => setAnnualPrice(e.target.value)}
              placeholder="7990"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {settings && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Precios Actuales</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Mensual:</span> ${settings.monthly_price} MXN
              </div>
              <div>
                <span className="text-muted-foreground">Anual:</span> ${settings.annual_price} MXN
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Última actualización: {new Date(settings.updated_at).toLocaleString('es-MX')}
            </div>
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full md:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};