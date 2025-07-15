import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Star, 
  MapPin, 
  Clock, 
  DollarSign, 
  Stethoscope, 
  Award,
  Phone,
  Calendar
} from 'lucide-react';

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
  practice_locations: string[] | null;
  consultorios: any[] | null;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name: string | null;
}

export default function DoctorProfile() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (doctorId) {
      fetchDoctorProfile();
      fetchRatings();
    }
  }, [doctorId]);

  const fetchDoctorProfile = async () => {
    if (!doctorId) return;

    try {
      // Fetch doctor profile
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', doctorId)
        .eq('verification_status', 'verified')
        .single();

      if (doctorError) throw doctorError;

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', doctorId)
        .single();

      if (profileError) console.warn('Profile not found:', profileError);

      const completeProfile: DoctorProfile = {
        ...doctorData,
        consultorios: doctorData.consultorios ? (Array.isArray(doctorData.consultorios) ? doctorData.consultorios : []) : [],
        profile: profileData
      };

      setDoctor(completeProfile);
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil del médico",
        variant: "destructive"
      });
      navigate('/search');
    }
  };

  const fetchRatings = async () => {
    if (!doctorId) return;

    try {
      // Fetch ratings
      const { data: ratingsData, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('doctor_user_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch patient names for each rating
      const ratingsWithNames = await Promise.all(
        (ratingsData || []).map(async (rating) => {
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', rating.patient_user_id)
            .single();

          return {
            ...rating,
            patient_name: patientProfile?.full_name || 'Paciente anónimo'
          };
        })
      );

      setRatings(ratingsWithNames);
      
      if (ratingsData && ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const handleBookAppointment = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/book/${doctorId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
        <div className="max-w-4xl mx-auto">
          <BackToHomeButton />
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Médico no encontrado</h2>
              <p className="text-muted-foreground">El perfil del médico no está disponible.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <BackToHomeButton />
        
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-32 w-32 mx-auto md:mx-0">
                <AvatarImage src={doctor.profile_image_url || ''} alt={doctor.profile?.full_name || ''} />
                <AvatarFallback className="text-2xl">
                  {doctor.profile?.full_name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">
                  Dr. {doctor.profile?.full_name || 'Nombre no disponible'}
                </h1>
                
                <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-4">
                  <Badge variant="secondary" className="gap-2">
                    <Stethoscope className="h-4 w-4" />
                    {doctor.specialty}
                  </Badge>
                  
                  {doctor.years_experience && (
                    <Badge variant="outline" className="gap-2">
                      <Award className="h-4 w-4" />
                      {doctor.years_experience} años de experiencia
                    </Badge>
                  )}
                  
                  {averageRating > 0 && (
                    <Badge variant="outline" className="gap-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      {averageRating} ({ratings.length} reseñas)
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-muted-foreground mb-4">
                  {doctor.consultation_fee && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>${doctor.consultation_fee} MXN por consulta</span>
                    </div>
                  )}
                  
                  {doctor.office_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{doctor.office_phone}</span>
                    </div>
                  )}
                  
                  {doctor.office_address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{doctor.office_address}</span>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleBookAppointment}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Cita
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Biography */}
        {doctor.biography && (
          <Card>
            <CardHeader>
              <CardTitle>Sobre el Doctor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {doctor.biography}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Consultorios */}
        {doctor.consultorios && doctor.consultorios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Consultorios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {doctor.consultorios.map((consultorio: any, index: number) => (
                  <Card key={index} className="border-2 border-dashed">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">{consultorio.name}</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{consultorio.address}</span>
                        </div>
                        {consultorio.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{consultorio.phone}</span>
                          </div>
                        )}
                        {consultorio.hours && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{consultorio.hours}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ratings */}
        {ratings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                Reseñas de Pacientes
                <Badge variant="secondary">{averageRating}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ratings.slice(0, 5).map((rating) => (
                  <div key={rating.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{rating.patient_name}</div>
                      {renderStars(rating.rating)}
                    </div>
                    {rating.comment && (
                      <p className="text-muted-foreground text-sm">
                        "{rating.comment}"
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(rating.created_at).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Professional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Profesional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Cédula Profesional:</span> {doctor.professional_license}
              </div>
              {doctor.practice_locations && doctor.practice_locations.length > 0 && (
                <div>
                  <span className="font-medium">Ubicaciones de práctica:</span> {doctor.practice_locations.join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}