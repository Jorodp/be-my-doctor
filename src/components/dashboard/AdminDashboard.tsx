import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, Clock, BarChart3, Shield, Settings, Star, Calendar, Activity } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { DoctorsList } from '@/components/admin/DoctorsList';
import { PatientsList } from '@/components/admin/PatientsList';
import { AssistantsList } from '@/components/admin/AssistantsList';
import { PatientDocumentManagement } from '@/components/admin/PatientDocumentManagement';
import { DoctorVerificationList } from '@/components/admin/DoctorVerificationList';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DashboardHeader } from '@/components/DashboardHeader';

interface DoctorProfile {
  id: string;
  user_id: string;
  professional_license: string;
  specialty: string;
  verification_status: string;
  profiles: {
    full_name: string;
  } | null;
}

interface UserStats {
  patients: number;
  doctors: number;
  assistants: number;
  pendingDoctors: number;
  newPatients: number;  // New patients in last 24h
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
    newPatients: 0,
    totalAppointments: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      fetchData();
      
      // Set up polling to check for new pending doctors every 30 seconds
      const interval = setInterval(() => {
        fetchData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch pending doctors
      const { data: doctors, error: doctorsError } = await supabase
        .from('doctor_profiles')
        .select(`
          id,
          user_id,
          professional_license,
          specialty,
          verification_status
        `)
        .eq('verification_status', 'pending');

      // Fetch profile names separately
      let doctorWithProfiles: DoctorProfile[] = [];
      if (doctors && doctors.length > 0) {
        const userIds = doctors.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        doctorWithProfiles = doctors.map(doctor => ({
          ...doctor,
          profiles: profiles?.find(p => p.user_id === doctor.user_id) || null
        }));
      }

      if (doctorsError) throw doctorsError;

      // Fetch user counts by role
      const { data: userCounts, error: countsError } = await supabase
        .from('profiles')
        .select('role, created_at');

      if (countsError) throw countsError;

      // Fetch new patients (last 24 hours)
      const { data: newPatientsData, error: newPatientsError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'patient')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (newPatientsError) throw newPatientsError;

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

      setPendingDoctors(doctorWithProfiles);

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
        newPatients: newPatientsData?.length || 0,
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
      <DashboardHeader
        title="Panel de Administración"
        subtitle="Gestiona la plataforma Be My Doctor"
        onSignOut={signOut}
      />

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

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5" />
                Pacientes Nuevos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">{stats.newPatients}</div>
              <p className="text-sm text-muted-foreground">Últimas 24 horas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Citas Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <p className="text-sm text-muted-foreground">Desde el inicio</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Calificación Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                {stats.averageRating || '5.0'}
              </div>
              <p className="text-sm text-muted-foreground">De todas las consultas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Activo</div>
              <p className="text-sm text-muted-foreground">Última actualización: {format(new Date(), 'HH:mm', { locale: es })}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access to Pending Actions */}
        {pendingDoctors.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Clock className="h-5 w-5" />
                Acciones Pendientes ({pendingDoctors.length})
              </CardTitle>
              <CardDescription>
                Médicos que requieren verificación inmediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {pendingDoctors.slice(0, 3).map((doctor) => (
                  <div key={doctor.id} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-4 w-4 text-orange-600" />
                      <div>
                        <span className="font-medium">{doctor.profiles?.full_name || 'N/A'}</span>
                        <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveDoctor(doctor.id)}>
                        Aprobar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectDoctor(doctor.id)}>
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingDoctors.length > 3 && (
                  <div className="text-center text-sm text-muted-foreground">
                    Y {pendingDoctors.length - 3} más en la sección de Doctores...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="doctors">Doctores</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
            <TabsTrigger value="assistants">Asistentes</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Panel de Control Principal</CardTitle>
                  <CardDescription>
                    Vista general del estado de la plataforma Be My Doctor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Actividad Reciente</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg border">
                          <Users className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-medium">{stats.patients} pacientes registrados</div>
                            <div className="text-sm text-muted-foreground">Base de usuarios activa</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg border">
                          <UserCheck className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium">{stats.doctors} doctores verificados</div>
                            <div className="text-sm text-muted-foreground">Profesionales activos</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg border">
                          <Shield className="h-5 w-5 text-purple-600" />
                          <div>
                            <div className="font-medium">{stats.assistants} asistentes</div>
                            <div className="text-sm text-muted-foreground">Personal de apoyo</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Acciones Rápidas</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Button className="h-20 flex flex-col gap-2" onClick={() => setActiveTab('doctors')}>
                          <UserCheck className="h-6 w-6" />
                          Gestionar Doctores
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => setActiveTab('patients')}>
                          <Users className="h-6 w-6" />
                          Ver Pacientes
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => setActiveTab('assistants')}>
                          <Shield className="h-6 w-6" />
                          Asistentes
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => setActiveTab('system')}>
                          <Settings className="h-6 w-6" />
                          Configuración
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="doctors">
            <DoctorVerificationList />
          </TabsContent>

          <TabsContent value="patients">
            <PatientsList />
          </TabsContent>

          <TabsContent value="assistants">
            <AssistantsList />
          </TabsContent>

          <TabsContent value="documents">
            <PatientDocumentManagement />
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
                <CardDescription>
                  Administración general de la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Estado del Sistema</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span>Base de datos</span>
                            <Badge className="bg-green-100 text-green-800">Conectada</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Autenticación</span>
                            <Badge className="bg-green-100 text-green-800">Activa</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Notificaciones</span>
                            <Badge className="bg-green-100 text-green-800">Funcionando</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Estadísticas Generales</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span>Total usuarios</span>
                            <span className="font-semibold">{stats.patients + stats.doctors + stats.assistants + 1}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Citas completadas</span>
                            <span className="font-semibold">{stats.totalAppointments}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Calificación promedio</span>
                            <span className="font-semibold">{stats.averageRating}/5.0</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Herramientas de Administración</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button variant="outline" className="justify-start">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Generar Reportes
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Settings className="h-4 w-4 mr-2" />
                          Configuración General
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Users className="h-4 w-4 mr-2" />
                          Gestión de Usuarios
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Calendar className="h-4 w-4 mr-2" />
                          Administrar Citas
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Activity className="h-4 w-4 mr-2" />
                          Monitoreo del Sistema
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Shield className="h-4 w-4 mr-2" />
                          Seguridad y Permisos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};