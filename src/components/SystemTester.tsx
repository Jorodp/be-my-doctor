import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useDoctorSubscription } from '@/hooks/useDoctorSubscription';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandling';
import { CheckCircle, XCircle, AlertCircle, PlayCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export const SystemTester = () => {
  const { user, profile, doctorProfile } = useAuth();
  const { subscriptionData, loading: subscriptionLoading, isSubscribed } = useDoctorSubscription();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const results: TestResult[] = [];

    // Test 1: Autenticación
    results.push({
      name: 'Autenticación',
      status: user ? 'pass' : 'fail',
      message: user ? `Usuario autenticado: ${user.email}` : 'No hay usuario autenticado'
    });

    // Test 2: Perfil de usuario
    results.push({
      name: 'Perfil de Usuario',
      status: profile ? 'pass' : 'fail',
      message: profile ? `Perfil cargado - Rol: ${profile.role}` : 'No se encontró perfil',
      details: profile ? `Nombre: ${profile.full_name}` : undefined
    });

    // Test 3: Perfil de doctor (si es doctor)
    if (profile?.role === 'doctor') {
      results.push({
        name: 'Perfil de Doctor',
        status: doctorProfile ? 'pass' : 'fail',
        message: doctorProfile ? 'Perfil de doctor cargado' : 'No se encontró perfil de doctor',
        details: doctorProfile ? `Especialidad: ${doctorProfile.specialty}` : undefined
      });

      // Test 4: Estado de suscripción
      results.push({
        name: 'Sistema de Suscripciones',
        status: subscriptionLoading ? 'pending' : (isSubscribed ? 'pass' : 'warning'),
        message: subscriptionLoading ? 'Verificando suscripción...' : 
                 (isSubscribed ? 'Suscripción activa' : 'Sin suscripción activa'),
        details: subscriptionData ? `Plan: ${subscriptionData.plan}, Estado: ${subscriptionData.status}` : undefined
      });
    }

    // Test 5: Conexión a base de datos
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      results.push({
        name: 'Conexión Base de Datos',
        status: error ? 'fail' : 'pass',
        message: error ? `Error de conexión: ${error.message}` : 'Conexión exitosa'
      });
    } catch (error) {
      results.push({
        name: 'Conexión Base de Datos',
        status: 'fail',
        message: `Error de conexión: ${handleError(error, { showToast: false, logError: false })}`
      });
    }

    // Test 6: Aprobación de doctores (solo para admins)
    if (profile?.role === 'admin') {
      try {
        const { data: pendingDoctors, error } = await supabase
          .from('doctor_profiles')
          .select('id')
          .eq('verification_status', 'pending')
          .limit(1);

        results.push({
          name: 'Sistema de Aprobación',
          status: error ? 'fail' : 'pass',
          message: error ? `Error al consultar doctores pendientes: ${error.message}` : 
                   `Consulta exitosa - ${pendingDoctors?.length || 0} doctores pendientes`
        });

        // Test adicional: Probar función de aprobación
        if (pendingDoctors && pendingDoctors.length > 0) {
          try {
            const { error: approvalError } = await supabase.rpc('admin_verify_doctor', {
              doctor_id: 'test-id'
            });
            
            results.push({
              name: 'Función de Aprobación',
              status: approvalError ? 'warning' : 'pass',
              message: approvalError ? 
                'La función existe pero falló (esperado con ID de prueba)' : 
                'Función de aprobación disponible',
              details: approvalError?.message
            });
          } catch (error) {
            results.push({
              name: 'Función de Aprobación',
              status: 'fail',
              message: 'Error accediendo a la función de aprobación'
            });
          }
        }
      } catch (error) {
        results.push({
          name: 'Sistema de Aprobación',
          status: 'fail',
          message: `Error en sistema de aprobación: ${handleError(error, { showToast: false, logError: false })}`
        });
      }
    }

    // Test 7: Edge functions críticas
    const edgeFunctionTests = [
      { name: 'test-function', description: 'Función de prueba básica' },
      { name: 'verify-doctor-subscription', description: 'Verificación de suscripciones' },
      { name: 'admin-profile-management', description: 'Gestión de perfiles' }
    ];

    for (const func of edgeFunctionTests) {
      try {
        const { data, error } = await supabase.functions.invoke(func.name, {
          body: { test: true }
        });
        
        results.push({
          name: `Edge Function: ${func.name}`,
          status: error ? 'fail' : 'pass',
          message: error ? 
            `Error en ${func.description}: ${error.message}` : 
            `${func.description} funcionando`,
          details: data ? `Respuesta: ${JSON.stringify(data).substring(0, 100)}...` : undefined
        });
      } catch (error) {
        results.push({
          name: `Edge Function: ${func.name}`,
          status: 'fail',
          message: `Error crítico en ${func.description}`,
          details: handleError(error, { showToast: false, logError: false })
        });
      }
    }

    setTests(results);
    setRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-blue-600 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants: Record<TestResult['status'], string> = {
      pass: 'bg-green-100 text-green-800',
      fail: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={variants[status]}>
        {status === 'pass' ? 'Exitoso' :
         status === 'fail' ? 'Error' :
         status === 'warning' ? 'Advertencia' : 'Pendiente'}
      </Badge>
    );
  };

  const passedTests = tests.filter(t => t.status === 'pass').length;
  const failedTests = tests.filter(t => t.status === 'fail').length;
  const warningTests = tests.filter(t => t.status === 'warning').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-6 w-6" />
          Pruebas del Sistema
        </CardTitle>
        <CardDescription>
          Ejecuta pruebas automáticas para verificar el estado del sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={runTests} disabled={running}>
            {running ? 'Ejecutando...' : 'Ejecutar Pruebas'}
          </Button>
          
          {tests.length > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Resultados:</span>
              <Badge className="bg-green-100 text-green-800">{passedTests} exitosas</Badge>
              <Badge className="bg-red-100 text-red-800">{failedTests} fallidas</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">{warningTests} advertencias</Badge>
            </div>
          )}
        </div>

        {tests.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Resultados de las Pruebas</h3>
            <div className="grid gap-3">
              {tests.map((test, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{test.name}</span>
                      {getStatusBadge(test.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{test.message}</p>
                    {test.details && (
                      <p className="text-xs text-muted-foreground mt-1">{test.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tests.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Resumen del Sistema</h4>
            <div className="text-sm space-y-1">
              <p><strong>Usuario:</strong> {user?.email || 'No autenticado'}</p>
              <p><strong>Rol:</strong> {profile?.role || 'No definido'}</p>
              {profile?.role === 'doctor' && (
                <>
                  <p><strong>Especialidad:</strong> {doctorProfile?.specialty || 'No definida'}</p>
                  <p><strong>Estado de suscripción:</strong> {isSubscribed ? 'Activa' : 'Inactiva'}</p>
                </>
              )}
              <p><strong>Estado general:</strong> {
                failedTests > 0 ? 'Requiere atención' :
                warningTests > 0 ? 'Funcionando con advertencias' :
                'Funcionando correctamente'
              }</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};