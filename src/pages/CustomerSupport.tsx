import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhysicalPaymentRequestForm } from '@/components/PhysicalPaymentRequestForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/ui/DashboardLayout';

export default function CustomerSupport() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    // Redirigir a dashboard si no es un doctor
    if (profile && profile.role !== 'doctor') {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  return (
    <DashboardLayout title="Solicitud de Pago Físico">
      <div className="container mx-auto py-8 px-4">
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
            <h1 className="text-3xl font-bold">Solicitud de Pago Físico</h1>
            <p className="text-muted-foreground">
              Solicita información para pagar tu suscripción presencialmente
            </p>
          </div>
        </div>

        <PhysicalPaymentRequestForm 
          onSuccess={() => {
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          }}
        />
      </div>
    </DashboardLayout>
  );
}