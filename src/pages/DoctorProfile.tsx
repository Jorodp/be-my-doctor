import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Lock,
  User,
  CheckCircle
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

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
  ratings: Array<{
    rating: number;
    comment: string | null;
    created_at: string;
    patient_name: string | null;
  }>;
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function DoctorProfile() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

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

      // Get ratings with patient names
      const { data: ratings } = await supabase
        .from('ratings')
        .select(`
          rating,
          comment,
          created_at,
          patient_user_id
        `)
        .eq('doctor_user_id', doctorId)
        .order('created_at', { ascending: false });

      const ratingsWithNames = await Promise.all(
        (ratings || []).map(async (rating) => {
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

      const average_rating = ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      setDoctor({
        ...doctorProfile,
        profile,
        average_rating: Math.round(average_rating * 10) / 10,
        total_ratings: ratings?.length || 0,
        ratings: ratingsWithNames
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
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const bookAppointment = async () => {
    if (!user || !selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Debes completar todos los campos",
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

      if (error) throw error;

      toast({
        title: "Cita Agendada",
        description: "Tu cita ha sido agendada exitosamente",
      });

      setShowBooking(false);
      setSelectedDate(undefined);
      setSelectedTime('');
      setAppointmentNotes('');
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo agendar la cita",
        variant: "destructive"
      });
    } finally {
      setBookingLoading(false);
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

  const hasAvailability = availability.length > 0;
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/search" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver a la búsqueda
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor Profile */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="h-32 w-32 mx-auto md:mx-0">
                    <AvatarImage 
                      src={doctor.profile_image_url || `https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face`} 
                      alt={doctor.profile?.full_name || 'Doctor'} 
                    />
                    <AvatarFallback className="text-2xl">
                      {doctor.profile?.full_name?.split(' ').map(n => n[0]).join('') || 'DR'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <h1 className="text-3xl font-bold">
                        Dr. {doctor.profile?.full_name || 'Nombre no disponible'}
                      </h1>
                      <p className="text-xl text-muted-foreground">{doctor.specialty}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Doctor Verificado</span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-3">
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

                    {/* Experience */}
                    {doctor.years_experience && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        <span>{doctor.years_experience} años de experiencia</span>
                      </div>
                    )}

                    {/* License */}
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-muted-foreground" />
                      <span>Cédula: {doctor.professional_license}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Biography - Limited access */}
            {isAuthenticated && doctor.biography ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sobre el Doctor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{doctor.biography}</p>
                </CardContent>
              </Card>
            ) : !isAuthenticated && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Información Completa Disponible</h3>
                  <p className="text-muted-foreground mb-4">
                    Inicia sesión para ver la biografía completa, horarios disponibles y agendar una cita.
                  </p>
                  <Link to="/auth">
                    <Button>Iniciar Sesión</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {doctor.ratings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Reseñas de Pacientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {doctor.ratings.slice(0, 5).map((rating, index) => (
                      <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {rating.patient_name || 'Paciente Anónimo'}
                              </span>
                              <div className="flex">
                                {renderStars(rating.rating)}
                              </div>
                            </div>
                            {rating.comment && (
                              <p className="text-sm text-muted-foreground">{rating.comment}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(rating.created_at), 'dd/MM/yyyy', { locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Booking */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información de Consulta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Consultation Fee - Always visible */}
                {doctor.consultation_fee && (
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Tarifa de consulta</p>
                    <p className="text-3xl font-bold text-primary">
                      ${doctor.consultation_fee.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Location */}
                {isAuthenticated && doctor.profile?.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Ubicación</p>
                      <p className="text-sm text-muted-foreground">{doctor.profile.address}</p>
                    </div>
                  </div>
                )}

                {/* Contact */}
                {isAuthenticated && doctor.profile?.phone && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Contacto</p>
                      <p className="text-sm text-muted-foreground">{doctor.profile.phone}</p>
                    </div>
                  </div>
                )}

                {/* Booking Section */}
                {isAuthenticated ? (
                  hasAvailability ? (
                    <Dialog open={showBooking} onOpenChange={setShowBooking}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          <CalendarIcon className="h-5 w-5 mr-2" />
                          Agendar Cita
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Agendar Cita</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* Date Selection */}
                          <div>
                            <Label>Selecciona una fecha</Label>
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) => !isDateAvailable(date)}
                              className="rounded-md border mt-2"
                            />
                          </div>

                          {/* Time Selection */}
                          {selectedDate && (
                            <div>
                              <Label>Hora disponible</Label>
                              <Select value={selectedTime} onValueChange={setSelectedTime}>
                                <SelectTrigger className="mt-2">
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
                            </div>
                          )}

                          {/* Notes */}
                          <div>
                            <Label>Motivo de la consulta (opcional)</Label>
                            <Textarea
                              value={appointmentNotes}
                              onChange={(e) => setAppointmentNotes(e.target.value)}
                              placeholder="Describe brevemente el motivo de tu consulta..."
                              className="mt-2"
                              rows={3}
                            />
                          </div>

                          <Button 
                            onClick={bookAppointment} 
                            disabled={!selectedDate || !selectedTime || bookingLoading}
                            className="w-full"
                          >
                            {bookingLoading ? 'Agendando...' : 'Confirmar Cita'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="font-medium">No disponible</p>
                      <p className="text-sm text-muted-foreground">
                        Este doctor no tiene disponibilidad en este momento.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-medium">Inicia sesión para agendar</p>
                    <Link to="/auth">
                      <Button className="mt-2 w-full">Iniciar Sesión</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Availability Schedule - Only for authenticated users */}
            {isAuthenticated && hasAvailability && (
              <Card>
                <CardHeader>
                  <CardTitle>Horarios Disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dayNames.map((day, index) => {
                      const dayAvailability = availability.filter(a => a.day_of_week === index);
                      return (
                        <div key={index} className="flex justify-between items-center py-2">
                          <span className="font-medium">{day}</span>
                          <div className="text-sm text-muted-foreground">
                            {dayAvailability.length > 0 ? (
                              dayAvailability.map((slot, i) => (
                                <div key={i}>
                                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                </div>
                              ))
                            ) : (
                              'No disponible'
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}