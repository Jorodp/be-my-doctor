import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-section px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <ShieldX className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>Acceso no autorizado</CardTitle>
          <CardDescription>
            No tienes permisos para acceder a esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Ir al Dashboard
            </Button>
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