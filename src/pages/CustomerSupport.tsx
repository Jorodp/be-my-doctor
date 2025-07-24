import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CustomerSupportChat } from '@/components/CustomerSupportChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CreditCard, MessageCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/ui/DashboardLayout';

export default function CustomerSupport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const reason = searchParams.get('reason') as 'physical_payment' | 'general' | null;

  useEffect(() => {
    // Redirigir a dashboard si no es un doctor
    if (profile && profile.role !== 'doctor') {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  if (!reason) {
    return (
      <DashboardLayout title="Atención al Cliente">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Atención al Cliente</h1>
              <p className="text-muted-foreground">
                Selecciona el tipo de consulta que necesitas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Pago Físico
                </CardTitle>
                <CardDescription>
                  Solicitar información para pagar tu suscripción en efectivo o con tarjeta física
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  onClick={() => navigate('/customer-support?reason=physical_payment')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Solicitar Pago Físico
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Nuestro equipo te ayudará con los pasos para realizar el pago presencial
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Consulta General
                </CardTitle>
                <CardDescription>
                  Obtén ayuda con cualquier otra consulta o problema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/customer-support?reason=general')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Iniciar Chat General
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Para dudas sobre la plataforma, configuración o funcionalidades
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-medium text-blue-900 mb-2">Horarios de Atención</h3>
            <p className="text-sm text-blue-700 mb-2">
              Nuestro equipo de soporte está disponible:
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Lunes a Viernes: 9:00 AM - 6:00 PM</li>
              <li>• Sábados: 10:00 AM - 2:00 PM</li>
              <li>• Domingos: Cerrado</li>
            </ul>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Chat de Soporte">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/customer-support')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {reason === 'physical_payment' ? 'Solicitud de Pago Físico' : 'Consulta General'}
            </h1>
            <p className="text-muted-foreground">
              {reason === 'physical_payment' 
                ? 'Solicita información para pagar tu suscripción presencialmente'
                : 'Obtén ayuda con tu consulta general'
              }
            </p>
          </div>
        </div>

        <CustomerSupportChat reason={reason} />
      </div>
    </DashboardLayout>
  );
}