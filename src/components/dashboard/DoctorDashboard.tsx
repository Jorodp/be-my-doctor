import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  User, 
  DollarSign, 
  Star, 
  Settings, 
  FileText,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  Users,
  Phone,
  MapPin,
  Timer,
  CreditCard,
  UserCheck,
  MessageSquare,
  History
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { DashboardLayout } from '@/components/ui/DashboardLayout';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
import { ConsultationFlowManager } from '@/components/ConsultationFlowManager';
import { DoctorCalendarSchedule } from '@/components/DoctorCalendarSchedule';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { AssistantManager } from '@/components/AssistantManager';
import { DoctorChatManager } from '@/components/doctor/DoctorChatManager';
import { DoctorAppointmentHistory } from '@/components/doctor/DoctorAppointmentHistory';
import { AppointmentActionsExtended } from '@/components/AppointmentActionsExtended';

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  profile_image_url: string | null;
  professional_license: string;
  office_address: string | null;
  office_phone: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  full_name?: string | null;
  phone?: string | null;
}

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  patient_user_id: string;
  doctor_user_id: string;
  consultation_status: string;
  patient_arrived_at?: string;
  consultation_started_at?: string;
  consultation_ended_at?: string;
  waiting_time_minutes?: number;
  consultation_duration_minutes?: number;
  total_clinic_time_minutes?: number;
  patient_profile?: {
    full_name: string;
    phone: string;
  };
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name: string | null;
}

export const DoctorDashboard = () => {
  return (
    <SubscriptionGuard>
      <DoctorDashboardContent />
    </SubscriptionGuard>
  );
};

const DoctorDashboardContent = () => {
  const { user, doctorProfile } = useAuth();
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [weeklyAppointments, setWeeklyAppointments] = useState<Appointment[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    totalPatients: 0,
    monthlyRevenue: 0
  });

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Handle payment result from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      toast({
        title: "¡Suscripción exitosa!",
        description: "Tu suscripción ha sido activada correctamente.",
        variant: "default",
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh data to show updated subscription
      setTimeout(() => {
        fetchAllData();
      }, 2000);
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Suscripción cancelada",
        description: "Has cancelado el proceso de suscripción.",
        variant: "destructive",
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Show verification status alert
  useEffect(() => {
    if (doctorProfile) {
      if (doctorProfile.verification_status === 'pending') {
        toast({
          title: "Perfil pendiente de verificación",
          description: "Tu perfil está siendo revisado por nuestro equipo.",
          variant: "default",
        });
      } else if (doctorProfile.verification_status === 'rejected') {
        toast({
          title: "Perfil rechazado",
          description: "Tu perfil necesita correcciones. Contacta al administrador.",
          variant: "destructive",
        });
      }
    }
  }, [doctorProfile, toast]);

  const fetchAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchDoctorProfile(),
        fetchTodayAppointments(),
        fetchWeeklyAppointments(),
        fetchRatings(),
        fetchStats(),
        checkProfileComplete()
      ]);
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

  const fetchDoctorProfile = async () => {
    if (!user) return;

    // Fetch doctor profile
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor profile:', doctorError);
      return;
    }

    // Fetch profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', user.id)
      .single();

    const completeProfile = {
      ...doctorData,
      full_name: profileData?.full_name,
      phone: profileData?.phone
    };

    setProfile(completeProfile);
  };

  const fetchTodayAppointments = async () => {
    if (!user) return;

    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_user_id', user.id)
      .gte('starts_at', today.toISOString())
      .lte('starts_at', tomorrow.toISOString())
      .order('starts_at', { ascending: true });

    if (error) {
      console.error('Error fetching today appointments:', error);
      return;
    }

    // Fetch patient profiles
    const appointmentsWithPatients = await Promise.all(
      (appointments || []).map(async (appointment) => {
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', appointment.patient_user_id)
          .single();

        return {
          ...appointment,
          patient_profile: patientProfile
        };
      })
    );

    setTodayAppointments(appointmentsWithPatients);
  };

  const fetchWeeklyAppointments = async () => {
    if (!user) return;

    const today = startOfDay(new Date());
    const weekEnd = endOfDay(addDays(today, 7));

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_user_id', user.id)
      .gte('starts_at', today.toISOString())
      .lte('starts_at', weekEnd.toISOString())
      .order('starts_at', { ascending: true });

    if (error) {
      console.error('Error fetching weekly appointments:', error);
      return;
    }

    const appointmentsWithPatients = await Promise.all(
      (appointments || []).map(async (appointment) => {
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', appointment.patient_user_id)
          .single();

        return {
          ...appointment,
          patient_profile: patientProfile
        };
      })
    );

    setWeeklyAppointments(appointmentsWithPatients);
  };

  const fetchRatings = async () => {
    if (!user) return;

    const { data: ratingsData, error } = await supabase
      .from('doctor_ratings')
      .select('*')
      .eq('doctor_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching ratings:', error);
      return;
    }

    // Fetch patient names for ratings
    const ratingsWithNames = await Promise.all(
      (ratingsData || []).map(async (rating) => {
        const { data: patientProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', rating.patient_user_id)
          .single();

        return {
          ...rating,
          patient_name: patientProfile?.full_name || null
        };
      })
    );

    setRatings(ratingsWithNames);
    
    if (ratingsData && ratingsData.length > 0) {
      const avg = ratingsData.reduce((sum, r) => sum + r.stars, 0) / ratingsData.length;
      setAverageRating(Math.round(avg * 10) / 10);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get total appointments
      const { count: totalAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_user_id', user.id);

      // Get completed appointments
      const { count: completedAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_user_id', user.id)
        .eq('status', 'completed');

      // Get unique patients
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('patient_user_id')
        .eq('doctor_user_id', user.id);

      const uniquePatients = new Set(appointmentData?.map(a => a.patient_user_id));

      setStats({
        totalAppointments: totalAppointments || 0,
        completedAppointments: completedAppointments || 0,
        totalPatients: uniquePatients.size,
        monthlyRevenue: 0 // Placeholder for now
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const checkProfileComplete = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('is_doctor_profile_complete', { doctor_user_id: user.id });
      
      if (!error) {
        setProfileComplete(data || false);
      }
    } catch (error) {
      console.error('Error checking profile completion:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: es });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM", { locale: es });
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Dashboard Médico"
        subtitle="Gestiona tu consulta médica"
      >
        <div className="flex justify-center items-center min-h-64">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard Médico"
      subtitle="Gestiona tu consulta médica"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Document Completion Warning */}
        {profile && !profileComplete && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Perfil incompleto:</strong> Faltan documentos requeridos. Tu perfil no puede ser verificado y no recibirás citas hasta completar toda la documentación legal. 
              Solo los administradores pueden gestionar estos documentos.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Profile Overview */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.profile_image_url || ''} />
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">Dr. {profile.full_name}</h2>
                  <p className="text-muted-foreground">{profile.specialty}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={profile.verification_status === 'verified' ? 'default' : 'secondary'}>
                      {profile.verification_status === 'verified' ? 'Verificado' : 'Pendiente'}
                    </Badge>
                    {averageRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{averageRating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.years_experience || 0} años de experiencia</span>
                </div>
                {profile.office_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.office_phone}</span>
                  </div>
                )}
                {profile.office_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.office_address}</span>
                  </div>
                )}
              </div>
              {profile.consultation_fee && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Tarifa de consulta: ${profile.consultation_fee} MXN</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Citas Totales</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Citas Completadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedAppointments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pacientes Únicos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPatients}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calificación</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageRating > 0 ? averageRating : 'N/A'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="consultas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="consultas" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Flujo de Consultas
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Citas de Hoy
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Esta Semana
            </TabsTrigger>
            <TabsTrigger value="ratings" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Calificaciones
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Suscripción
            </TabsTrigger>
            <TabsTrigger value="assistants" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Asistentes
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consultas">
            <ConsultationFlowManager 
              appointments={todayAppointments}
              userRole="doctor"
              onAppointmentUpdate={fetchAllData}
            />
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Agenda</CardTitle>
                <CardDescription>
                  Configura tu disponibilidad usando el calendario visual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && <DoctorCalendarSchedule doctorId={user.id} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="today">
            <Card>
              <CardHeader>
                <CardTitle>Citas de Hoy</CardTitle>
                <CardDescription>
                  {todayAppointments.length} cita(s) programada(s) para hoy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4" />
                    <p>No tienes citas programadas para hoy</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayAppointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {appointment.patient_profile?.full_name || 'Paciente'}
                              </span>
                              <Badge variant={appointment.status === 'completed' ? 'secondary' : 'default'}>
                                {appointment.status === 'completed' ? 'Completada' : 'Programada'}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}
                              </div>
                              {appointment.patient_profile?.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {appointment.patient_profile.phone}
                                </div>
                              )}
                            </div>

                            {appointment.notes && (
                              <div className="bg-muted p-2 rounded text-sm">
                                <strong>Notas:</strong> {appointment.notes}
                              </div>
                            )}
                          </div>

                          <div className="ml-4">
                            <AppointmentActionsExtended
                              appointment={appointment}
                              userRole="doctor"
                              currentUserId={user?.id || ''}
                              onAppointmentUpdated={fetchTodayAppointments}
                              showPatientName={false}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="week">
            <Card>
              <CardHeader>
                <CardTitle>Citas de Esta Semana</CardTitle>
                <CardDescription>
                  {weeklyAppointments.length} cita(s) en los próximos 7 días
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4" />
                    <p>No tienes citas programadas esta semana</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {weeklyAppointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {appointment.patient_profile?.full_name || 'Paciente'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(appointment.starts_at)} • {formatTime(appointment.starts_at)}
                              </p>
                            </div>
                          </div>
                          <AppointmentActionsExtended
                            appointment={appointment}
                            userRole="doctor"
                            currentUserId={user?.id || ''}
                            onAppointmentUpdated={fetchWeeklyAppointments}
                            showPatientName={false}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle>Calificaciones Recientes</CardTitle>
                <CardDescription>
                  Últimas calificaciones de tus pacientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ratings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4" />
                    <p>Aún no tienes calificaciones</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ratings.map((rating) => (
                      <div key={rating.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium">
                                {rating.patient_name || 'Paciente anónimo'}
                              </h4>
                              <div className="flex items-center gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-4 w-4 ${
                                      i < rating.rating 
                                        ? 'text-yellow-500 fill-current' 
                                        : 'text-gray-300'
                                    }`} 
                                  />
                                ))}
                                <span className="text-sm text-muted-foreground ml-2">
                                  {format(new Date(rating.created_at), 'd MMM yyyy', { locale: es })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {rating.comment && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-sm italic">"{rating.comment}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Suscripción</CardTitle>
                <CardDescription>
                  Administra tu suscripción y pagos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionStatus />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assistants">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Asistentes</CardTitle>
                <CardDescription>
                  Administra tus asistentes médicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssistantManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <DoctorChatManager />
          </TabsContent>

          <TabsContent value="history">
            <DoctorAppointmentHistory />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};