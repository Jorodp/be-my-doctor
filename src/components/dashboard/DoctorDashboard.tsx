import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Edit,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Save,
  Camera,
  Users,
  Stethoscope,
  Award
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  profile_image_url: string | null;
  professional_license: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  profile: {
    full_name: string | null;
    phone: string | null;
    address: string | null;
  } | null;
}

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  patient_user_id: string;
  patient_profile?: {
    full_name: string;
  };
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface ConsultationNote {
  id: string;
  appointment_id: string;
  diagnosis: string | null;
  prescription: string | null;
  recommendations: string | null;
  follow_up_date: string | null;
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name: string | null;
}

interface AssistantInfo {
  full_name: string | null;
  email: string;
  phone: string | null;
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const specialties = [
  'Medicina General',
  'Cardiología',
  'Dermatología',
  'Pediatría',
  'Ginecología',
  'Neurología',
  'Traumatología',
  'Psiquiatría',
  'Oftalmología',
  'Otorrinolaringología'
];

export const DoctorDashboard = () => {
  const { user, doctorProfile, userRole, signOut } = useAuth();
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [weeklyAppointments, setWeeklyAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  
  // Edit states
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    specialty: '',
    biography: '',
    consultation_fee: '',
    years_experience: '',
    professional_license: '',
    profile_image_url: ''
  });
  
  // Availability states
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [agendaEnabled, setAgendaEnabled] = useState(true);
  
  // Consultation notes state
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [consultationNotes, setConsultationNotes] = useState<ConsultationNote | null>(null);
  const [notesForm, setNotesForm] = useState({
    diagnosis: '',
    prescription: '',
    recommendations: '',
    follow_up_date: ''
  });

  useEffect(() => {
    if (user && userRole === 'doctor') {
      fetchAllData();
    }
  }, [user, userRole]);

  const fetchAllData = async () => {
    if (!user) return;

    try {
      await Promise.all([
        fetchDoctorProfile(),
        fetchTodayAppointments(),
        fetchWeeklyAppointments(),
        fetchAvailability(),
        fetchRatings(),
        fetchAssistant()
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

    // Fetch doctor profile separately
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (doctorError) throw doctorError;

    // Fetch profile data separately  
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, phone, address')
      .eq('user_id', user.id)
      .single();

    if (profileError) console.warn('Profile not found:', profileError);

    const completeProfile = {
      ...doctorData,
      profile: profileData
    };

    setProfile(completeProfile);
    setProfileForm({
      specialty: doctorData.specialty || '',
      biography: doctorData.biography || '',
      consultation_fee: doctorData.consultation_fee?.toString() || '',
      years_experience: doctorData.years_experience?.toString() || '',
      professional_license: doctorData.professional_license || '',
      profile_image_url: doctorData.profile_image_url || ''
    });
  };

  const fetchTodayAppointments = async () => {
    if (!user) return;

    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!patient_user_id(full_name)
      `)
      .eq('doctor_user_id', user.id)
      .gte('starts_at', today.toISOString())
      .lte('starts_at', tomorrow.toISOString())
      .order('starts_at', { ascending: true });

    if (error) throw error;
    setTodayAppointments(data || []);
  };

  const fetchWeeklyAppointments = async () => {
    if (!user) return;

    const today = startOfDay(new Date());
    const weekEnd = endOfDay(addDays(today, 7));

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!patient_user_id(full_name)
      `)
      .eq('doctor_user_id', user.id)
      .gte('starts_at', today.toISOString())
      .lte('starts_at', weekEnd.toISOString())
      .order('starts_at', { ascending: true });

    if (error) throw error;
    setWeeklyAppointments(data || []);
  };

  const fetchAvailability = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_user_id', user.id)
      .order('day_of_week', { ascending: true });

    if (error) throw error;
    setAvailability(data || []);
  };

  const fetchRatings = async () => {
    if (!user) return;

    // Fetch ratings first
    const { data: ratingsData, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('doctor_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Then fetch patient names for each rating
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

  const fetchAssistant = async () => {
    if (!user) return;

    try {
      // Query profiles table directly for assistants assigned to this doctor
      const { data: assistantProfiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .eq('role', 'assistant');

      if (error) {
        console.error('Error fetching assistant profiles:', error);
        return;
      }

      // For now, we'll just show if there are any assistants
      // In a real implementation, you'd need a proper way to link assistants to doctors
      if (assistantProfiles && assistantProfiles.length > 0) {
        const assistant = assistantProfiles[0]; // Take first assistant for demo
        setAssistantInfo({
          full_name: assistant.full_name,
          email: 'asistente@clinica.com', // Placeholder email
          phone: assistant.phone
        });
      }
    } catch (error) {
      console.error('Error in fetchAssistant:', error);
    }
  };

  const updateProfile = async () => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('doctor_profiles')
        .update({
          specialty: profileForm.specialty,
          biography: profileForm.biography,
          consultation_fee: profileForm.consultation_fee ? parseFloat(profileForm.consultation_fee) : null,
          years_experience: profileForm.years_experience ? parseInt(profileForm.years_experience) : null,
          professional_license: profileForm.professional_license,
          profile_image_url: profileForm.profile_image_url
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente"
      });

      setEditingProfile(false);
      fetchDoctorProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    }
  };

  const addAvailability = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_user_id: user.id,
          day_of_week: selectedDay,
          start_time: startTime,
          end_time: endTime,
          is_available: true
        });

      if (error) throw error;

      toast({
        title: "Disponibilidad agregada",
        description: "Nuevo horario agregado correctamente"
      });

      fetchAvailability();
    } catch (error) {
      console.error('Error adding availability:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la disponibilidad",
        variant: "destructive"
      });
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Disponibilidad eliminada",
        description: "Horario eliminado correctamente"
      });

      fetchAvailability();
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la disponibilidad",
        variant: "destructive"
      });
    }
  };

  const fetchConsultationNotes = async (appointmentId: string) => {
    const { data, error } = await supabase
      .from('consultation_notes')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (data) {
      setConsultationNotes(data);
      setNotesForm({
        diagnosis: data.diagnosis || '',
        prescription: data.prescription || '',
        recommendations: data.recommendations || '',
        follow_up_date: data.follow_up_date || ''
      });
    } else {
      setConsultationNotes(null);
      setNotesForm({
        diagnosis: '',
        prescription: '',
        recommendations: '',
        follow_up_date: ''
      });
    }
  };

  const saveConsultationNotes = async () => {
    if (!selectedAppointment || !user) return;

    try {
      const appointment = todayAppointments.find(a => a.id === selectedAppointment);
      if (!appointment) return;

      const noteData = {
        appointment_id: selectedAppointment,
        doctor_user_id: user.id,
        patient_user_id: appointment.patient_user_id,
        diagnosis: notesForm.diagnosis || null,
        prescription: notesForm.prescription || null,
        recommendations: notesForm.recommendations || null,
        follow_up_date: notesForm.follow_up_date || null
      };

      if (consultationNotes) {
        // Update existing notes
        const { error } = await supabase
          .from('consultation_notes')
          .update(noteData)
          .eq('id', consultationNotes.id);

        if (error) throw error;
      } else {
        // Create new notes
        const { error } = await supabase
          .from('consultation_notes')
          .insert(noteData);

        if (error) throw error;
      }

      toast({
        title: "Notas guardadas",
        description: "Las notas médicas se han guardado correctamente"
      });

      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error saving consultation notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las notas",
        variant: "destructive"
      });
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: es });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Perfil no encontrado</h3>
            <p className="text-muted-foreground">
              No se pudo cargar tu perfil de doctor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.verification_status !== 'verified') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Cuenta en Verificación</h3>
            <p className="text-muted-foreground mb-4">
              Tu cuenta está en proceso de verificación. No puedes recibir citas aún.
            </p>
            <Badge variant="secondary" className="mb-4">
              Estado: {profile.verification_status}
            </Badge>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile.profile_image_url || undefined} />
                <AvatarFallback>
                  <Stethoscope className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Dr. {profile.profile?.full_name || 'Doctor'}
                </h1>
                <p className="text-muted-foreground">{profile.specialty}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="schedule">Agenda</TabsTrigger>
            <TabsTrigger value="appointments">Citas</TabsTrigger>
            <TabsTrigger value="ratings">Calificaciones</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{todayAppointments.length}</p>
                      <p className="text-sm text-muted-foreground">Citas hoy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{weeklyAppointments.length}</p>
                      <p className="text-sm text-muted-foreground">Esta semana</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Star className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground">Calificación</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">${profile.consultation_fee || 0}</p>
                      <p className="text-sm text-muted-foreground">Tarifa</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Citas de Hoy
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tienes citas programadas para hoy
                  </p>
                ) : (
                  <div className="space-y-4">
                    {todayAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {appointment.patient_profile?.full_name || 'Paciente'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}
                            </span>
                          </div>
                          <Badge>{appointment.status}</Badge>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedAppointment(appointment.id);
                                fetchConsultationNotes(appointment.id);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Notas
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>
                                Notas Médicas - {appointment.patient_profile?.full_name}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="diagnosis">Diagnóstico</Label>
                                <Textarea
                                  id="diagnosis"
                                  value={notesForm.diagnosis}
                                  onChange={(e) => setNotesForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                                  placeholder="Ingresa el diagnóstico..."
                                />
                              </div>
                              <div>
                                <Label htmlFor="prescription">Receta</Label>
                                <Textarea
                                  id="prescription"
                                  value={notesForm.prescription}
                                  onChange={(e) => setNotesForm(prev => ({ ...prev, prescription: e.target.value }))}
                                  placeholder="Medicamentos y dosis..."
                                />
                              </div>
                              <div>
                                <Label htmlFor="recommendations">Recomendaciones</Label>
                                <Textarea
                                  id="recommendations"
                                  value={notesForm.recommendations}
                                  onChange={(e) => setNotesForm(prev => ({ ...prev, recommendations: e.target.value }))}
                                  placeholder="Recomendaciones y cuidados..."
                                />
                              </div>
                              <div>
                                <Label htmlFor="follow_up">Fecha de Seguimiento</Label>
                                <Input
                                  id="follow_up"
                                  type="date"
                                  value={notesForm.follow_up_date}
                                  onChange={(e) => setNotesForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                                />
                              </div>
                              <Button onClick={saveConsultationNotes} className="w-full">
                                <Save className="h-4 w-4 mr-2" />
                                Guardar Notas
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assistant Info */}
            {assistantInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Asistente Asignado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{assistantInfo.full_name || 'Asistente'}</p>
                      <p className="text-sm text-muted-foreground">{assistantInfo.email}</p>
                      {assistantInfo.phone && (
                        <p className="text-sm text-muted-foreground">{assistantInfo.phone}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información del Perfil
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingProfile(!editingProfile)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {editingProfile ? 'Cancelar' : 'Editar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {editingProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="specialty">Especialidad</Label>
                      <Select 
                        value={profileForm.specialty} 
                        onValueChange={(value) => setProfileForm(prev => ({ ...prev, specialty: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona especialidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {specialties.map(specialty => (
                            <SelectItem key={specialty} value={specialty}>
                              {specialty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="license">Licencia Profesional</Label>
                      <Input
                        id="license"
                        value={profileForm.professional_license}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, professional_license: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="fee">Tarifa de Consulta</Label>
                      <Input
                        id="fee"
                        type="number"
                        value={profileForm.consultation_fee}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, consultation_fee: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="experience">Años de Experiencia</Label>
                      <Input
                        id="experience"
                        type="number"
                        value={profileForm.years_experience}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, years_experience: e.target.value }))}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="biography">Biografía</Label>
                      <Textarea
                        id="biography"
                        value={profileForm.biography}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, biography: e.target.value }))}
                        placeholder="Cuéntanos sobre tu experiencia y especialización..."
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="image">URL de Imagen de Perfil</Label>
                      <Input
                        id="image"
                        value={profileForm.profile_image_url}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, profile_image_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Button onClick={updateProfile} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Nombre</Label>
                        <p className="text-lg">{profile.profile?.full_name || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Especialidad</Label>
                        <p className="text-lg">{profile.specialty}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Licencia</Label>
                        <p className="text-lg">{profile.professional_license}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Estado</Label>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-600 font-medium">Verificado</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Experiencia</Label>
                        <p className="text-lg">{profile.years_experience || 'No especificado'} años</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Tarifa</Label>
                        <p className="text-lg">${profile.consultation_fee || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Teléfono</Label>
                        <p className="text-lg">{profile.profile?.phone || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Dirección</Label>
                        <p className="text-lg">{profile.profile?.address || 'No especificado'}</p>
                      </div>
                    </div>
                    
                    {profile.biography && (
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium">Biografía</Label>
                        <p className="text-muted-foreground leading-relaxed mt-1">
                          {profile.biography}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Gestión de Agenda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* General Schedule Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-lg font-medium">Agenda Activa</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar o deshabilitar disponibilidad general
                    </p>
                  </div>
                  <Switch 
                    checked={agendaEnabled}
                    onCheckedChange={setAgendaEnabled}
                  />
                </div>

                {/* Add New Availability */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-medium">Agregar Disponibilidad</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Día de la semana</Label>
                      <Select 
                        value={selectedDay.toString()} 
                        onValueChange={(value) => setSelectedDay(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dayNames.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Hora de inicio</Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Hora de fin</Label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button onClick={addAvailability} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Current Availability */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Disponibilidad Actual</h3>
                  {availability.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No tienes horarios disponibles configurados
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availability.map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{dayNames[slot.day_of_week]}</span>
                            <span className="text-muted-foreground">
                              {slot.start_time} - {slot.end_time}
                            </span>
                            <Badge variant={slot.is_available ? "default" : "secondary"}>
                              {slot.is_available ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteAvailability(slot.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Próximas Citas (7 días)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tienes citas programadas en los próximos 7 días
                  </p>
                ) : (
                  <div className="space-y-4">
                    {weeklyAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">
                              {appointment.patient_profile?.full_name || 'Paciente'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatDate(appointment.starts_at)}</span>
                            <span>{formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}</span>
                          </div>
                          {appointment.notes && (
                            <p className="text-sm text-muted-foreground">
                              Notas: {appointment.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{appointment.status}</Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment.id);
                                  fetchConsultationNotes(appointment.id);
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>
                                  Notas Médicas - {appointment.patient_profile?.full_name}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="diagnosis">Diagnóstico</Label>
                                  <Textarea
                                    id="diagnosis"
                                    value={notesForm.diagnosis}
                                    onChange={(e) => setNotesForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                                    placeholder="Ingresa el diagnóstico..."
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="prescription">Receta</Label>
                                  <Textarea
                                    id="prescription"
                                    value={notesForm.prescription}
                                    onChange={(e) => setNotesForm(prev => ({ ...prev, prescription: e.target.value }))}
                                    placeholder="Medicamentos y dosis..."
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="recommendations">Recomendaciones</Label>
                                  <Textarea
                                    id="recommendations"
                                    value={notesForm.recommendations}
                                    onChange={(e) => setNotesForm(prev => ({ ...prev, recommendations: e.target.value }))}
                                    placeholder="Recomendaciones y cuidados..."
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="follow_up">Fecha de Seguimiento</Label>
                                  <Input
                                    id="follow_up"
                                    type="date"
                                    value={notesForm.follow_up_date}
                                    onChange={(e) => setNotesForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                                  />
                                </div>
                                <Button onClick={saveConsultationNotes} className="w-full">
                                  <Save className="h-4 w-4 mr-2" />
                                  Guardar Notas
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-2">
                    {renderStars(Math.round(averageRating))}
                  </div>
                  <p className="text-3xl font-bold">{averageRating.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Calificación promedio</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-bold">{ratings.length}</p>
                  <p className="text-sm text-muted-foreground">Total de reseñas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-bold">{ratings.filter(r => r.rating >= 4).length}</p>
                  <p className="text-sm text-muted-foreground">Reseñas positivas</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Reseñas Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ratings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aún no tienes calificaciones
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ratings.map((rating) => (
                      <div key={rating.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {rating.patient_name || 'Paciente Anónimo'}
                              </p>
                              <div className="flex">
                                {renderStars(rating.rating)}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(rating.created_at)}
                          </span>
                        </div>
                        {rating.comment && (
                          <p className="text-muted-foreground">{rating.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};