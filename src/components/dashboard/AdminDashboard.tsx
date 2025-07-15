import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Clock, BarChart3, Shield, Settings, Star } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface DoctorProfile {
  id: string;
  user_id: string;
  professional_license: string;
  specialty: string;
  verification_status: string;
  profiles: {
    full_name: string;
  };
}

interface UserStats {
  patients: number;
  doctors: number;
  assistants: number;
  pendingDoctors: number;
  totalAppointments: number;
  averageRating: number;
}

export const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [stats, setStats] = useState<UserStats>({
    patients: 0,
    doctors: 0,
    assistants: 0,
    pendingDoctors: 0,
    totalAppointments: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch pending doctors
      const { data: doctors, error: doctorsError } = await supabase
        .from('doctor_profiles')
        .select(`
          *,
          profiles!user_id (full_name)
        `)
        .eq('verification_status', 'pending');

      if (doctorsError) throw doctorsError;

      // Fetch user counts by role
      const { data: userCounts, error: countsError } = await supabase
        .from('profiles')
        .select('role');

      if (countsError) throw countsError;

      // Fetch total appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id');

      if (appointmentsError) throw appointmentsError;

      // Fetch average rating
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('rating');

      if (ratingsError) throw ratingsError;

      setPendingDoctors(doctors || []);

      const counts = userCounts?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const averageRating = ratings && ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0;

      setStats({
        patients: counts.patient || 0,
        doctors: counts.doctor || 0,
        assistants: counts.assistant || 0,
        pendingDoctors: doctors?.length || 0,
        totalAppointments: appointments?.length || 0,
        averageRating: Math.round(averageRating * 10) / 10
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const approveDoctor = async (doctorId: string) => {
    try {
      const { error } = await supabase
        .from('doctor_profiles')
        .update({ 
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user?.id
        })
        .eq('id', doctorId);

      if (error) throw error;

      toast({
        title: "Médico Aprobado",
        description: "El médico ha sido verificado exitosamente",
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error approving doctor:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar el médico",
        variant: "destructive"
      });
    }
  };

  const rejectDoctor = async (doctorId: string) => {
    try {
      const { error } = await supabase
        .from('doctor_profiles')
        .update({ 
          verification_status: 'rejected',
          verified_by: user?.id
        })
        .eq('id', doctorId);

      if (error) throw error;

      toast({
        title: "Médico Rechazado",
        description: "La solicitud ha sido rechazada",
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting doctor:', error);
      toast({
        title: "Error",
        description: "No se pudo rechazar el médico",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
              <p className="text-muted-foreground">Gestiona la plataforma Be My Doctor</p>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDoctors}</div>
              <p className="text-sm text-muted-foreground">Médicos por verificar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pacientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.patients}</div>
              <p className="text-sm text-muted-foreground">Usuarios registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Médicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.doctors}</div>
              <p className="text-sm text-muted-foreground">Médicos registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Asistentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assistants}</div>
              <p className="text-sm text-muted-foreground">Asistentes activos</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Doctor Verifications */}
        {pendingDoctors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Médicos Pendientes de Verificación
              </CardTitle>
              <CardDescription>
                Solicitudes que requieren tu revisión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {pendingDoctors.map((doctor) => (
                  <div key={doctor.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          <span className="font-medium">{doctor.profiles.full_name}</span>
                          <Badge variant="secondary">{doctor.specialty}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Cédula: {doctor.professional_license}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => approveDoctor(doctor.id)}
                        >
                          Aprobar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => rejectDoctor(doctor.id)}
                        >
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Estadísticas del Sistema
            </CardTitle>
            <CardDescription>
              Métricas principales de la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Total de citas</div>
                <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Calificación promedio</div>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  {stats.averageRating || '5.0'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
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
      </main>
    </div>
  );
};