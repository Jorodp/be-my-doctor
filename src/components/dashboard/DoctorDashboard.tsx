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
  History,
  Building2
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatTimeInMexicoTZ, formatInMexicoTZ } from '@/utils/dateUtils';
import { DashboardLayout } from '@/components/ui/DashboardLayout';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
import { ConsultationFlowManager } from '@/components/ConsultationFlowManager';
import { DoctorCalendarSchedule } from '@/components/DoctorCalendarSchedule';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { AssistantManager } from '@/components/AssistantManager';
import { DoctorChatManager } from '@/components/doctor/DoctorChatManager';
import { DoctorAppointmentHistory } from '@/components/doctor/DoctorAppointmentHistory';
import { AppointmentActionsExtended } from '@/components/AppointmentActionsExtended';
import { ClinicsAndAssistantsManager } from '@/components/ClinicsAndAssistantsManager';
import { ConsultationWorkspace } from '@/components/ConsultationWorkspace';
import { AssistantPaymentManager } from '@/components/AssistantPaymentManager';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { DoctorReviewsSection } from '@/components/DoctorReviewsSection';
import { PatientHistoryModal } from '@/components/PatientHistoryModal';

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
  const { unreadCount, markAsRead } = useUnreadMessages();
  
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

  // Patient History Modal state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isPatientHistoryOpen, setIsPatientHistoryOpen] = useState(false);

  // Realtime updates para appointments y ratings
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'appointments',
          filter: `doctor_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Appointment change detected:', payload);
          // Refresh all data when appointment changes
          fetchAllData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'doctor_ratings',
          filter: `doctor_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Rating change detected:', payload);
          // Refresh ratings when rating changes
          fetchRatings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

    // Crear las fechas en zona horaria de México (GMT-6)
    const now = new Date();
    
    // Inicio del día actual en México
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Final del día actual en México  
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_user_id', user.id)
      .gte('starts_at', todayStart.toISOString())
      .lte('starts_at', todayEnd.toISOString())
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

    // Crear las fechas en zona horaria de México (GMT-6)
    const now = new Date();
    
    // Inicio de la semana actual en México
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    
    // Final de la semana (7 días después)
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_user_id', user.id)
      .gte('starts_at', weekStart.toISOString())
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
      .eq('visible', true)
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
      const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
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

      // Calculate monthly revenue from consultation payments
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data: payments } = await supabase
        .from('consultation_payments')
        .select('amount')
        .eq('doctor_user_id', user.id)
        .eq('status', 'paid')
        .gte('paid_at', firstDayOfMonth.toISOString())
        .lte('paid_at', lastDayOfMonth.toISOString());

      const monthlyRevenue = payments?.reduce((total, payment) => total + (payment.amount || 0), 0) || 0;

      setStats({
        totalAppointments: totalAppointments || 0,
        completedAppointments: completedAppointments || 0,
        totalPatients: uniquePatients.size,
        monthlyRevenue: monthlyRevenue
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
    return formatTimeInMexicoTZ(dateString);
  };

  const formatDate = (dateString: string) => {
    return formatInMexicoTZ(dateString, "d 'de' MMMM");
  };

  const handleViewPatientHistory = (patientUserId: string) => {
    setSelectedPatientId(patientUserId);
    setIsPatientHistoryOpen(true);
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
                  {profile.profile_image_url && !profile.profile_image_url.includes('example.com') ? (
                    <AvatarImage 
                      src={`${profile.profile_image_url}?t=${Date.now()}`} 
                      alt={profile.full_name || 'Doctor'}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{profile.full_name}</h2>
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
              <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">MXN</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="consultas" className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="grid grid-cols-6 lg:grid-cols-10 gap-1 h-auto p-2 bg-muted/50 rounded-lg w-full">
              <TabsTrigger value="consultas" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:block">Consultas</span>
                <span className="sm:hidden">Cons</span>
              </TabsTrigger>
              
              <TabsTrigger value="chat" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
                <div className="relative">
                  <MessageSquare className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                <span className="hidden sm:block">Chat</span>
                <span className="sm:hidden">💬</span>
              </TabsTrigger>
              
              <TabsTrigger value="schedule" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:block">Agenda</span>
                <span className="sm:hidden">Agen</span>
              </TabsTrigger>
              
              <TabsTrigger value="today" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:block">Hoy</span>
                <span className="sm:hidden">Hoy</span>
              </TabsTrigger>
              
              <TabsTrigger value="clinics" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:block">Clinicas</span>
                <span className="sm:hidden">Clin</span>
              </TabsTrigger>
              
              <TabsTrigger value="payments" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:block">Pagos</span>
                <span className="sm:hidden">Pago</span>
              </TabsTrigger>
              
              <TabsTrigger value="subscription" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:block">Suscripción</span>
                <span className="sm:hidden">Subs</span>
              </TabsTrigger>
              
              <TabsTrigger value="ratings" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm lg:flex">
                <Star className="h-4 w-4" />
                <span className="hidden sm:block">Rating</span>
                <span className="sm:hidden">★</span>
              </TabsTrigger>
              
               <TabsTrigger value="income" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm lg:flex">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:block">Ingresos</span>
                <span className="sm:hidden">$</span>
              </TabsTrigger>
              
              <TabsTrigger value="history" className="flex flex-col items-center gap-1 p-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm lg:flex">
                <History className="h-4 w-4" />
                <span className="hidden sm:block">Historial</span>
                <span className="sm:hidden">📋</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="chat" onClick={() => markAsRead()}>
            <DoctorChatManager />
          </TabsContent>

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

          <TabsContent value="clinics">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Consultorios y Asistentes</CardTitle>
                <CardDescription>
                  Administra tus consultorios y asigna asistentes por consultorio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && <ClinicsAndAssistantsManager doctorUserId={user.id} onClinicsChange={fetchAllData} />}
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
                              <Badge variant={
                                appointment.status === 'completed' ? 'secondary' : 
                                appointment.status === 'cancelled' ? 'destructive' : 'default'
                              }>
                                {appointment.status === 'completed' ? 'Completada' : 
                                 appointment.status === 'cancelled' ? 'Cancelada' : 'Programada'}
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
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleViewPatientHistory(appointment.patient_user_id)}
                                 className="ml-auto"
                               >
                                 <FileText className="h-3 w-3 mr-1" />
                                 Ver Historial
                               </Button>
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
                              onAppointmentUpdated={fetchAllData}
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

          <TabsContent value="payments">
            {user && <AssistantPaymentManager doctorId={user.id} />}
          </TabsContent>


          <TabsContent value="ratings">
            {user && <DoctorReviewsSection doctorUserId={user.id} />}
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



          <TabsContent value="income">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Ingresos</CardTitle>
                <CardDescription>
                  Ingresos detallados por citas y consultas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Este Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        ${stats.monthlyRevenue.toLocaleString()} MXN
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {stats.completedAppointments} consultas completadas
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Promedio por Consulta</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        ${stats.completedAppointments > 0 ? Math.round(stats.monthlyRevenue / stats.completedAppointments).toLocaleString() : '0'} MXN
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ingreso promedio
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Pacientes Únicos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {stats.totalPatients}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pacientes diferentes atendidos
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2">Información sobre ingresos</h3>
                  <p className="text-sm text-muted-foreground">
                    Los ingresos mostrados corresponden únicamente a los pagos confirmados de este mes. 
                    Para un análisis más detallado, contacta con tu administrador.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <DoctorAppointmentHistory />
          </TabsContent>
        </Tabs>

        {/* Patient History Modal */}
        {selectedPatientId && user && (
          <PatientHistoryModal
            isOpen={isPatientHistoryOpen}
            onClose={() => {
              setIsPatientHistoryOpen(false);
              setSelectedPatientId(null);
            }}
            patientUserId={selectedPatientId}
            doctorUserId={user.id}
          />
        )}
      </div>
    </DashboardLayout>
  );
};