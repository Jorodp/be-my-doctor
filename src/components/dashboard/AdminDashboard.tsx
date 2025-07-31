import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, Clock, Shield, Star, Calendar, Activity, CreditCard, FileText, DollarSign, UserPlus, TestTube } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { DoctorListComponent } from '@/components/admin/DoctorListComponent';
import { PatientsList } from '@/components/admin/PatientsList';
import { AdminAppointments } from '@/components/admin/AdminAppointments';
import { PaymentSettings } from '@/components/admin/PaymentSettings';
import DoctorRegistrationRequests from '@/components/admin/DoctorRegistrationRequests';
import PhysicalPaymentRequests from '@/components/admin/PhysicalPaymentRequests';
import { SystemTester } from '@/components/SystemTester';
import { RevenueOverview } from '@/components/admin/RevenueOverview';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DashboardLayout } from '@/components/ui/DashboardLayout';

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
  newPatients: number;
  totalAppointments: number;
  averageRating: number;
}

export const AdminDashboard = () => {
  const { user } = useAuth();
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

      if (doctorsError) throw doctorsError;

      // Get profile data for pending doctors
      const doctorWithProfiles: DoctorProfile[] = await Promise.all(
        (doctors || []).map(async (doctor) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', doctor.user_id)
            .maybeSingle();
          
          return {
            ...doctor,
            profiles: { full_name: profile?.full_name || 'Sin nombre' }
          };
        })
      );

      // Fetch user counts by role
      const { data: userCounts } = await supabase
        .from('profiles')
        .select('role, created_at');

      // Fetch appointments count
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id');

      // Fetch new patients (last 24 hours)
      const { data: newPatientsData } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'patient')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setPendingDoctors(doctorWithProfiles);

      const counts = userCounts?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setStats({
        patients: counts.patient || 0,
        doctors: counts.doctor || 0,
        assistants: counts.assistant || 0,
        pendingDoctors: doctors?.length || 0,
        newPatients: newPatientsData?.length || 0,
        totalAppointments: appointments?.length || 0,
        averageRating: 4.8 // Placeholder
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const approveDoctor = async (doctorId: string) => {
    try {
      // Usar la función existente para verificar doctor que maneja correctamente las referencias
      const { data, error } = await supabase.rpc('admin_verify_doctor', {
        doctor_id: doctorId
      });

      if (error) {
        console.error('Error al aprobar médico:', error);
        toast({
          title: "Error",
          description: `No se pudo aprobar al médico: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Médico Aprobado",
        description: "El médico ha sido verificado exitosamente",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error approving doctor:', error);
      toast({
        title: "Error",
        description: "Error inesperado al aprobar al médico",
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
          verified_at: new Date().toISOString()
        })
        .eq('id', doctorId);

      if (error) {
        console.error('Error al rechazar médico:', error);
        toast({
          title: "Error",
          description: `No se pudo rechazar al médico: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Médico Rechazado",
        description: "La solicitud ha sido rechazada",
      });

      fetchData();
    } catch (error) {
      console.error('Error rejecting doctor:', error);
      toast({
        title: "Error",
        description: "Error inesperado al rechazar al médico",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <DashboardLayout
      title="Panel de Administración"
      subtitle="Gestiona la plataforma Be My Doctor"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
                {stats.averageRating}
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
              <p className="text-sm text-muted-foreground">
                Última actualización: {format(new Date(), 'HH:mm', { locale: es })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access to Pending Actions - Solo mostrar si hay doctores pendientes */}
        {pendingDoctors.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                Solicitudes de Verificación ({pendingDoctors.length})
              </CardTitle>
              <CardDescription>
                Médicos que requieren verificación de documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {pendingDoctors.slice(0, 3).map((doctor) => (
                  <div key={doctor.id} className="flex justify-between items-center p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-4 w-4 text-primary" />
                      <div>
                        <span className="font-medium">{doctor.profiles?.full_name || 'N/A'}</span>
                        <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
                        <div className="text-xs text-muted-foreground">Cédula: {doctor.professional_license}</div>
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
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab('requests')}
                      className="mt-2"
                    >
                      Ver todas las solicitudes ({pendingDoctors.length})
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="revenue">Ingresos</TabsTrigger>
            <TabsTrigger value="requests">Solicitudes</TabsTrigger>
            <TabsTrigger value="payments">Pagos Físicos</TabsTrigger>
            <TabsTrigger value="doctors">Doctores</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
            <TabsTrigger value="pricing">Precios</TabsTrigger>
            <TabsTrigger value="testing">Pruebas</TabsTrigger>
          </TabsList>


          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Quick Overview of Doctors */}
              <DoctorListComponent
                title="Médicos Recientes"
                compact={true}
                limit={6}
                showFilters={false}
                showActions={true}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Actividad Reciente</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Acciones Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                      <Button variant="outline" className="h-24 flex flex-col gap-2 text-center" onClick={() => setActiveTab('requests')}>
                        <UserPlus className="h-5 w-5" />
                        <span className="text-xs leading-tight">Nuevas Solicitudes</span>
                      </Button>
                      <Button className="h-24 flex flex-col gap-2 text-center" onClick={() => setActiveTab('doctors')}>
                        <UserCheck className="h-5 w-5" />
                        <span className="text-xs leading-tight">Gestionar Doctores</span>
                      </Button>
                      <Button variant="outline" className="h-24 flex flex-col gap-2 text-center" onClick={() => setActiveTab('patients')}>
                        <Users className="h-5 w-5" />
                        <span className="text-xs leading-tight">Ver Pacientes</span>
                      </Button>
                      <Button variant="outline" className="h-24 flex flex-col gap-2 text-center" onClick={() => setActiveTab('pricing')}>
                        <DollarSign className="h-5 w-5" />
                        <span className="text-xs leading-tight">Configurar Precios</span>
                      </Button>
                      <Button variant="outline" className="h-24 flex flex-col gap-2 text-center" onClick={() => setActiveTab('testing')}>
                        <TestTube className="h-5 w-5" />
                        <span className="text-xs leading-tight">Pruebas Sistema</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <RevenueOverview />
          </TabsContent>

          <TabsContent value="requests">
            <DoctorRegistrationRequests />
          </TabsContent>

          <TabsContent value="payments">
            <PhysicalPaymentRequests />
          </TabsContent>

          <TabsContent value="doctors">
            <DoctorListComponent
              title="Gestión de Médicos"
              showFilters={true}
              showActions={true}
              compact={false}
            />
          </TabsContent>

          <TabsContent value="patients">
            <PatientsList />
          </TabsContent>

          <TabsContent value="pricing">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Configuración de Precios Globales
                  </CardTitle>
                  <CardDescription>
                    Establece los precios base para la plataforma. Los médicos podrán ajustar estos precios individualmente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentSettings />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="testing">
            <div className="space-y-6">
              <SystemTester />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};