import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, Clock, BarChart3, Shield, Settings } from 'lucide-react';

export const AdminDashboard = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-section">
      <header className="bg-background shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Panel de Administración
              </h1>
              <p className="text-muted-foreground">
                Bienvenido, {profile?.first_name} {profile?.last_name}
              </p>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Médicos Pendientes */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                Verificaciones Pendientes
              </CardTitle>
              <CardDescription>
                Médicos esperando aprobación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">
                Solicitudes por revisar
              </p>
              <Button className="w-full mt-4">
                Revisar Solicitudes
              </Button>
            </CardContent>
          </Card>

          {/* Total de Usuarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Total de Usuarios
              </CardTitle>
              <CardDescription>
                Usuarios registrados en la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pacientes:</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Médicos:</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Asistentes:</span>
                  <span className="font-semibold">0</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Ver Todos
              </Button>
            </CardContent>
          </Card>

          {/* Médicos Verificados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Médicos Activos
              </CardTitle>
              <CardDescription>
                Médicos verificados y disponibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">
                Médicos verificados
              </p>
              <Button variant="outline" className="w-full mt-4">
                Ver Médicos
              </Button>
            </CardContent>
          </Card>

          {/* Estadísticas Generales */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Estadísticas del Sistema
              </CardTitle>
              <CardDescription>
                Métricas principales de la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Citas realizadas</div>
                  <div className="text-2xl font-bold">0</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Calificación promedio</div>
                  <div className="text-2xl font-bold">5.0</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Especialidades más buscadas</div>
                  <div className="text-sm">Medicina General</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Nuevos registros (mes)</div>
                  <div className="text-2xl font-bold">0</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Herramientas de Admin */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Herramientas
              </CardTitle>
              <CardDescription>
                Gestión y configuración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Gestión de Usuarios
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reportes
              </Button>
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Operaciones principales de administración
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="h-20 flex flex-col gap-2">
                  <UserCheck className="h-6 w-6" />
                  Verificar Médicos
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Users className="h-6 w-6" />
                  Gestionar Usuarios
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Ver Estadísticas
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Settings className="h-6 w-6" />
                  Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};