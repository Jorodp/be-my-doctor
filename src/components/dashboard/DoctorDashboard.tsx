import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, DollarSign, Star, Settings, FileText } from 'lucide-react';

export const DoctorDashboard = () => {
  const { profile, doctorProfile, signOut } = useAuth();

  const getStatusBadge = () => {
    if (!doctorProfile) return null;
    
    switch (doctorProfile.verification_status) {
      case 'verified':
        return <Badge className="bg-primary">Verificado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-section">
      <header className="bg-background shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  Dr. {profile?.first_name} {profile?.last_name}
                </h1>
                {getStatusBadge()}
              </div>
              <p className="text-muted-foreground">
                {doctorProfile?.specialty || 'Especialidad no especificada'}
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
          {/* Citas de Hoy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Citas de Hoy
              </CardTitle>
              <CardDescription>
                Agenda del día actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                No tienes citas programadas para hoy
              </div>
              <Button className="w-full mt-4">
                Ver Agenda Completa
              </Button>
            </CardContent>
          </Card>

          {/* Resumen Mensual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Resumen Mensual
              </CardTitle>
              <CardDescription>
                Estadísticas del mes actual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Consultas:</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ingresos:</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Calificación:</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="font-semibold">5.0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración de Perfil */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Mi Perfil
              </CardTitle>
              <CardDescription>
                Configura tu información profesional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Cédula:</span> {doctorProfile?.professional_license || 'No especificada'}
                </div>
                <div>
                  <span className="text-muted-foreground">Experiencia:</span> {doctorProfile?.years_experience || 0} años
                </div>
                <div>
                  <span className="text-muted-foreground">Consulta:</span> ${doctorProfile?.consultation_fee || 0}
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Editar Perfil
              </Button>
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Herramientas principales para la práctica médica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="h-20 flex flex-col gap-2">
                  <Calendar className="h-6 w-6" />
                  Gestionar Agenda
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <User className="h-6 w-6" />
                  Pacientes
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <FileText className="h-6 w-6" />
                  Notas Médicas
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Clock className="h-6 w-6" />
                  Disponibilidad
                </Button>
              </div>
            </CardContent>
          </Card>

          {doctorProfile?.verification_status !== 'verified' && (
            <Card className="md:col-span-2 lg:col-span-3 border-primary">
              <CardHeader>
                <CardTitle className="text-primary">Estado de Verificación</CardTitle>
                <CardDescription>
                  Información sobre el proceso de verificación
                </CardDescription>
              </CardHeader>
              <CardContent>
                {doctorProfile?.verification_status === 'pending' && (
                  <div className="space-y-2">
                    <p className="text-sm">
                      Tu cuenta está siendo revisada por nuestro equipo de administradores. 
                      Una vez aprobada, podrás recibir pacientes y aparecer en las búsquedas públicas.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Este proceso puede tomar de 1 a 3 días hábiles.
                    </p>
                  </div>
                )}
                {doctorProfile?.verification_status === 'rejected' && (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">
                      Tu solicitud de verificación fue rechazada. 
                      Contacta al soporte para más información sobre los motivos.
                    </p>
                    <Button variant="outline">
                      Contactar Soporte
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};