import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Star, 
  Clock, 
  MapPin, 
  Award, 
  GraduationCap, 
  Calendar as CalendarIcon,
  ArrowLeft,
  CheckCircle,
  User
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PendingRatingValidator } from '@/components/PendingRatingValidator';

interface Doctor {
  id: string;
  user_id: string;
  specialty: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  profile_image_url: string | null;
  professional_license: string;
  verification_status: string;
  profile: {
    full_name: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  average_rating: number;
  total_ratings: number;
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function BookAppointment() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Rating validation states
  const [showRatingValidator, setShowRatingValidator] = useState(false);
  const [canProceedWithBooking, setCanProceedWithBooking] = useState(false);
  const [hasAvailability, setHasAvailability] = useState(false);

  // Redirect if not a patient
  if (userRole && userRole !== 'patient') {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    if (doctorId) {
      fetchDoctorProfile();
      fetchAvailability();
    }
  }, [doctorId]);

  const fetchDoctorProfile = async () => {
    try {
      // Fetch doctor profile
      const { data: doctorProfile, error } = await supabase
        .from('doctor_profiles')
        .select(`
          id,
          user_id,
          specialty,
          biography,
          years_experience,
          consultation_fee,
          profile_image_url,
          professional_license,
          verification_status
        `)
        .eq('user_id', doctorId)
        .eq('verification_status', 'verified')
        .single();

      if (error) throw error;

      // Get profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('user_id', doctorId)
        .single();

      // Get ratings
      const { data: ratings } = await supabase
        .from('ratings')
        .select('rating')
        .eq('doctor_user_id', doctorId);

      const average_rating = ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      setDoctor({
        ...doctorProfile,
        profile,
        average_rating: Math.round(average_rating * 10) / 10,
        total_ratings: ratings?.length || 0
      });
    } catch (error) {
      console.error('Error fetching doctor:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil del doctor",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_user_id', doctorId)
        .eq('is_available', true);

      if (error) throw error;
      setAvailability(data || []);
      setHasAvailability((data || []).length > 0);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const initiateBookingProcess = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Debes seleccionar fecha y hora",
        variant: "destructive"
      });
      return;
    }

    // Only validate ratings for patients
    if (userRole === 'patient') {
      setShowRatingValidator(true);
    } else {
      setCanProceedWithBooking(true);
      bookAppointment();
    }
  };

  const bookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Debes seleccionar fecha y hora",
        variant: "destructive"
      });
      return;
    }

    setBookingLoading(true);
    try {
      const appointmentStart = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      appointmentStart.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setHours(appointmentStart.getHours() + 1); // 1 hour appointment

      // ✅ VALIDACIÓN DE SOLAPAMIENTO ANTES DE INSERTAR
      const { data: conflictingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id, starts_at, ends_at')
        .eq('doctor_user_id', doctorId)
        .in('status', ['scheduled', 'completed'])
        .lt('starts_at', appointmentEnd.toISOString())
        .gt('ends_at', appointmentStart.toISOString());

      if (checkError) {
        console.error('Error checking for conflicts:', checkError);
        throw new Error('Error verificando disponibilidad');
      }

      if (conflictingAppointments && conflictingAppointments.length > 0) {
        toast({
          title: "Horario no disponible",
          description: "Este horario ya está ocupado. Por favor selecciona otro horario.",
          variant: "destructive"
        });
        setBookingLoading(false);
        return;
      }

      // Si no hay conflictos, proceder con la inserción
      const { error } = await supabase
        .from('appointments')
        .insert({
          doctor_user_id: doctorId,
          patient_user_id: user.id,
          starts_at: appointmentStart.toISOString(),
          ends_at: appointmentEnd.toISOString(),
          status: 'scheduled',
          notes: appointmentNotes || null,
          created_by: user.id
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Error de concurrencia",
            description: "Este horario fue tomado por otro paciente. Selecciona otro horario.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        setBookingLoading(false);
        return;
      }

      setBookingSuccess(true);
      toast({
        title: "¡Cita Agendada!",
        description: "Tu cita ha sido agendada exitosamente",
      });

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo agendar la cita. Intenta con otro horario.",
        variant: "destructive"
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleValidationComplete = (canProceed: boolean) => {
    setCanProceedWithBooking(canProceed);
    if (canProceed) {
      bookAppointment();
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
      }
    }
    return stars;
  };

  const getAvailableTimesForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek);
    
    const times: string[] = [];
    dayAvailability.forEach(slot => {
      const start = slot.start_time;
      const end = slot.end_time;
      
      // Generate hourly slots
      const startHour = parseInt(start.split(':')[0]);
      const endHour = parseInt(end.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        times.push(`${hour.toString().padStart(2, '0')}:00`);
      }
    });
    
    return times.sort();
  };

  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    const today = startOfDay(new Date());
    
    // Can't book past dates or more than 30 days ahead
    if (isBefore(date, today) || isAfter(date, addDays(today, 30))) {
      return false;
    }
    
    return availability.some(a => a.day_of_week === dayOfWeek);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Doctor no encontrado</h2>
          <p className="text-muted-foreground">
            El doctor que buscas no existe o no está verificado.
          </p>
          <Link to="/search">
            <Button>Volver a la búsqueda</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-4">¡Cita Agendada!</h1>
              <p className="text-lg text-muted-foreground mb-6">
                Tu cita con Dr. {doctor.profile?.full_name} ha sido agendada para el{' '}
                {selectedDate && format(selectedDate, 'dd/MM/yyyy', { locale: es })} a las {selectedTime}
              </p>
              <div className="space-y-4">
                <Link to="/dashboard/patient">
                  <Button size="lg" className="w-full">
                    Ver Mis Citas
                  </Button>
                </Link>
                <Link to="/search">
                  <Button variant="outline" size="lg" className="w-full">
                    Buscar Más Doctores
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to={`/doctor/${doctorId}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver al perfil
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Doctor Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage 
                    src={doctor.profile_image_url || `https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face`} 
                    alt={doctor.profile?.full_name || 'Doctor'} 
                  />
                  <AvatarFallback className="text-lg">
                    {doctor.profile?.full_name?.split(' ').map(n => n[0]).join('') || 'DR'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">
                    Dr. {doctor.profile?.full_name || 'Nombre no disponible'}
                  </h1>
                  <p className="text-lg text-muted-foreground">{doctor.specialty}</p>
                  
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex">
                      {renderStars(doctor.average_rating)}
                    </div>
                    <span className="font-medium">
                      {doctor.average_rating > 0 ? doctor.average_rating.toFixed(1) : 'Sin calificar'}
                    </span>
                    <span className="text-muted-foreground">
                      ({doctor.total_ratings} reseña{doctor.total_ratings !== 1 ? 's' : ''})
                    </span>
                  </div>

                  {doctor.consultation_fee && (
                    <div className="text-xl font-bold text-primary mt-2">
                      ${doctor.consultation_fee.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle>Selecciona una fecha</CardTitle>
              </CardHeader>
              <CardContent>
                {hasAvailability ? (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => !isDateAvailable(date)}
                    className="rounded-md border w-full"
                  />
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium">Sin disponibilidad</p>
                    <p className="text-sm text-muted-foreground">
                      Este doctor no tiene horarios disponibles en este momento.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Selection and Details */}
            <div className="space-y-6">
              {/* Time Selection */}
              {selectedDate && hasAvailability && (
                <Card>
                  <CardHeader>
                    <CardTitle>Horarios disponibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una hora" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableTimesForDate(selectedDate).map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Motivo de la consulta</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    placeholder="Describe brevemente el motivo de tu consulta (opcional)..."
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Doctor Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalles de la consulta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {doctor.profile?.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Ubicación</p>
                        <p className="text-sm text-muted-foreground">{doctor.profile.address}</p>
                      </div>
                    </div>
                  )}

                  {doctor.profile?.phone && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Contacto</p>
                        <p className="text-sm text-muted-foreground">{doctor.profile.phone}</p>
                      </div>
                    </div>
                  )}

                  {doctor.years_experience && (
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Experiencia</p>
                        <p className="text-sm text-muted-foreground">{doctor.years_experience} años</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Cédula Profesional</p>
                      <p className="text-sm text-muted-foreground">{doctor.professional_license}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Book Button */}
              {hasAvailability && (
                <Button 
                  onClick={initiateBookingProcess} 
                  disabled={!selectedDate || !selectedTime || bookingLoading}
                  size="lg"
                  className="w-full"
                >
                  {bookingLoading ? (
                    'Agendando...'
                  ) : (
                    <>
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      Confirmar Cita
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating Validation Modal */}
      <PendingRatingValidator
        isOpen={showRatingValidator}
        onClose={() => setShowRatingValidator(false)}
        onValidationComplete={handleValidationComplete}
      />
    </div>
  );
}