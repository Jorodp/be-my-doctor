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
        description: "Se han creado exitosamente las 4 cuentas demo",
      });

      console.log('Usuarios creados:', data);
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
          <p><strong>Admin:</strong> jorodp@hotmail.com / Jorge123</p>
          <p><strong>Doctor:</strong> doctor.demo@bemy.com / Doctor123</p>
          <p><strong>Paciente:</strong> paciente.demo@bemy.com / Paciente123</p>
          <p><strong>Asistente:</strong> asistente.demo@bemy.com / Asistente123</p>
        </div>
      </CardContent>
    </Card>
  );
};