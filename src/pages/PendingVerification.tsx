import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';

export default function PendingVerification() {
  const { profile, doctorProfile, signOut } = useAuth();

  const getStatusInfo = () => {
    if (!doctorProfile) {
      return {
        icon: <Clock className="h-12 w-12 text-muted-foreground" />,
        title: "Perfil de médico incompleto",
        description: "Necesitas completar tu perfil de médico para continuar.",
        status: "incomplete"
      };
    }

    switch (doctorProfile.verification_status) {
      case 'pending':
        return {
          icon: <Clock className="h-12 w-12 text-primary" />,
          title: "Verificación pendiente",
          description: "Tu solicitud está siendo revisada por nuestro equipo. Te notificaremos cuando sea aprobada.",
          status: "pending"
        };
      case 'verified':
        return {
          icon: <CheckCircle className="h-12 w-12 text-primary" />,
          title: "Cuenta verificada",
          description: "¡Felicitaciones! Tu cuenta ha sido verificada exitosamente.",
          status: "verified"
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-12 w-12 text-destructive" />,
          title: "Verificación rechazada",
          description: "Tu solicitud fue rechazada. Contacta al soporte para más información.",
          status: "rejected"
        };
      default:
        return {
          icon: <Clock className="h-12 w-12 text-muted-foreground" />,
          title: "Estado desconocido",
          description: "Contacta al soporte para revisar el estado de tu cuenta.",
          status: "unknown"
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-section px-4">
      {/* Back to Home Button */}
      <div className="absolute top-4 left-4">
        <BackToHomeButton />
      </div>
      
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {statusInfo.icon}
          </div>
          <CardTitle>{statusInfo.title}</CardTitle>
          <CardDescription>
            {statusInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile && (
            <div className="text-sm text-muted-foreground">
              Registrado como: <span className="font-semibold">{profile.full_name}</span>
            </div>
          )}
          
          {doctorProfile && (
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Especialidad: <span className="font-semibold">{doctorProfile.specialty}</span></div>
              <div>Cédula: <span className="font-semibold">{doctorProfile.professional_license}</span></div>
            </div>
          )}

          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => signOut()}
              className="w-full"
            >
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}