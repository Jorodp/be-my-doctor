import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const CreateDemoUsers = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createDemoUsers = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-demo-users');
      
      if (error) throw error;

      toast({
        title: "Usuarios demo creados",
        description: "Se han creado exitosamente las cuentas demo. Revisa la consola para las contraseñas.",
      });

      console.log('Usuarios creados con contraseñas seguras:', data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudieron crear los usuarios demo",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Crear Usuarios Demo</CardTitle>
        <CardDescription>
          Crea 4 cuentas de prueba: admin, doctor, paciente y asistente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={createDemoUsers}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'Creando...' : 'Crear Usuarios Demo'}
        </Button>
        <div className="mt-4 text-xs text-muted-foreground">
          <p><strong>Admin:</strong> jorodp@hotmail.com</p>
          <p><strong>Doctor:</strong> doctor.demo@bemy.com</p>
          <p><strong>Paciente:</strong> paciente@paciente.com</p>
          <p><strong>Asistente:</strong> asistente.demo@bemy.com</p>
          <p className="mt-2 text-orange-600 font-medium">
            ⚠️ Las contraseñas se generan automáticamente y se muestran en la consola por seguridad.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};