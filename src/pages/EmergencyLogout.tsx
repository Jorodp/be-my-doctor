import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmergencyLogout() {
  const [status, setStatus] = useState('Preparando logout...');

  const forceLogout = async () => {
    try {
      setStatus('Cerrando sesión...');
      
      // Force logout from Supabase
      await supabase.auth.signOut();
      
      // Clear all localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      setStatus('Sesión cerrada exitosamente');
      
      // Force redirect to auth page
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
      
    } catch (error) {
      setStatus('Error al cerrar sesión, pero limpiando datos...');
      
      // Even if there's an error, clear everything
      localStorage.clear();
      sessionStorage.clear();
      
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
    }
  };

  useEffect(() => {
    // Auto-execute logout on component mount
    forceLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-section">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Logout de Emergencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {status}
          </p>
          
          <Button 
            onClick={forceLogout} 
            variant="destructive" 
            className="w-full"
          >
            Forzar Logout Manual
          </Button>
          
          <Button 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/auth';
            }} 
            variant="outline" 
            className="w-full"
          >
            Limpiar Todo y Ir a Auth
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}