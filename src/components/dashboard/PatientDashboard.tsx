import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Star, FileText } from 'lucide-react';

export const PatientDashboard = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-section">
      <header className="bg-background shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Bienvenido, {profile?.first_name || 'Paciente'}
              </h1>
              <p className="text-muted-foreground">Dashboard de Paciente</p>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Próximas Citas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Próximas Citas
              </CardTitle>
              <CardDescription>
                Tus citas médicas programadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                No tienes citas programadas
              </div>
              <Button className="w-full mt-4">
                Buscar Médicos
              </Button>
            </CardContent>
          </Card>

          {/* Historial de Consultas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Historial Médico
              </CardTitle>
              <CardDescription>
                Consultas pasadas y notas médicas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Sin consultas anteriores
              </div>
              <Button variant="outline" className="w-full mt-4">
                Ver Historial
              </Button>
            </CardContent>
          </Card>

          {/* Calificaciones Pendientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Calificar Médicos
              </CardTitle>
              <CardDescription>
                Comparte tu experiencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                No hay calificaciones pendientes
              </div>
              <Button variant="outline" className="w-full mt-4">
                Ver Pendientes
              </Button>
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Opciones más utilizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="h-20 flex flex-col gap-2">
                  <User className="h-6 w-6" />
                  Buscar Médicos
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Calendar className="h-6 w-6" />
                  Mis Citas
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <FileText className="h-6 w-6" />
                  Recetas
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Clock className="h-6 w-6" />
                  Historial
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};