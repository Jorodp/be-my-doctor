import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, UserPlus, LogIn } from 'lucide-react';

interface AuthPromptProps {
  doctorName?: string;
  redirectPath: string;
}

export function AuthPrompt({ doctorName, redirectPath }: AuthPromptProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate(`/auth?redirect=${encodeURIComponent(redirectPath)}`);
  };

  const handleSignUp = () => {
    navigate(`/auth?redirect=${encodeURIComponent(redirectPath)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl mb-2">Inicia sesión para continuar</CardTitle>
          <p className="text-muted-foreground">
            Para ver el perfil del Dr. {doctorName} y poder agendar una cita, primero necesitas iniciar sesión o crear una cuenta.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button 
            onClick={handleLogin}
            className="w-full gap-2"
            size="lg"
          >
            <LogIn className="h-5 w-5" />
            Iniciar sesión
          </Button>
          
          <Button 
            onClick={handleSignUp}
            variant="outline"
            className="w-full gap-2"
            size="lg"
          >
            <UserPlus className="h-5 w-5" />
            Crear cuenta
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-6 p-3 bg-muted/50 rounded-lg">
            <Shield className="h-4 w-4 text-primary" />
            <span>Tu información médica estará protegida y solo tú podrás acceder a tu historial.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}