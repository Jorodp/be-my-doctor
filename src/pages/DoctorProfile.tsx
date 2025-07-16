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
import { AuthPrompt } from '@/components/AuthPrompt';
import { 
  Star, 
  MapPin, 
  Clock, 
  DollarSign, 
  Stethoscope, 
  Award,
  Phone,
  Calendar,
  Camera,
  User
} from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

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
  professional_photos_urls: string[] | null;
  office_photos_urls: string[] | null;
  verification_status: 'pending' | 'verified' | 'rejected';
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
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    if (doctorId) {
      if (!user) {
        // Fetch basic doctor info for the auth prompt
        fetchDoctorBasicInfo();
      } else {
        fetchDoctorProfile();
        fetchRatings();
      }
    }
  }, [doctorId, user]);

  const fetchDoctorBasicInfo = async () => {
    if (!doctorId) return;

    try {
      // Fetch basic doctor info even when not authenticated
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', doctorId)
        .single();

      if (profileData) {
        setDoctor({
          id: '',
          user_id: doctorId,
          specialty: '',
          biography: null,
          years_experience: null,
          consultation_fee: null,
          profile_image_url: null,
          professional_license: '',
          office_address: null,
          office_phone: null,
          practice_locations: null,
          consultorios: null,
          professional_photos_urls: null,
          office_photos_urls: null,
          verification_status: 'pending',
          profile: profileData
        });
      }
      setShowAuthPrompt(true);
    } catch (error) {
      console.error('Error fetching basic doctor info:', error);
      navigate('/search');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorProfile = async () => {
    if (!doctorId) return;

    try {
      // First check if doctor has active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', doctorId)
        .eq('status', 'active')
        .gte('ends_at', new Date().toISOString())
        .single();

      if (!subscription) {
        throw new Error('Doctor not available - no active subscription');
      }

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
      setShowAuthPrompt(true);
      return;
    }
    navigate(`/book/${doctorId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (showAuthPrompt && doctor) {
    return (
      <AuthPrompt 
        doctorName={doctor.profile?.full_name || 'Doctor'} 
        redirectPath={`/doctor/${doctorId}`}
      />
    );
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-5xl mx-auto">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b p-4">
          <BackToHomeButton />
        </div>
        
        {/* Hero Section with Large Photo */}
        <div className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5"></div>
          
          <div className="relative p-6 md:p-12">
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
              
              {/* Large Doctor Photo */}
              <div className="relative">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-background/50">
                  {doctor.profile_image_url ? (
                    <img 
                      src={doctor.profile_image_url.startsWith('http') ? doctor.profile_image_url : `${supabase.storage.from('doctor-photos').getPublicUrl(doctor.profile_image_url).data.publicUrl}`} 
                      alt={`Dr. ${doctor.profile?.full_name}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback */}
                  <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center ${doctor.profile_image_url ? 'hidden' : ''}`}>
                    <div className="text-center">
                      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Stethoscope className="h-12 w-12 text-primary" />
                      </div>
                      <p className="text-4xl font-bold text-primary">
                        {doctor.profile?.full_name?.charAt(0) || 'D'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Verification Badge */}
                {doctor.verification_status === 'verified' && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg">
                    <Award className="h-6 w-6" />
                  </div>
                )}
              </div>
              
              {/* Doctor Info */}
              <div className="flex-1 text-center lg:text-left space-y-6">
                
                {/* Name and Title */}
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                    Dr. {doctor.profile?.full_name || 'Nombre no disponible'}
                  </h1>
                  <p className="text-xl text-muted-foreground mb-4">
                    Especialista en {doctor.specialty}
                  </p>
                  
                  {/* Professional License */}
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                    <Award className="h-4 w-4" />
                    <span className="text-sm font-medium">Cédula: {doctor.professional_license}</span>
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {doctor.years_experience && (
                    <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {doctor.years_experience}+
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Años de experiencia
                      </div>
                    </div>
                  )}
                  
                  {averageRating > 0 && (
                    <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star className="h-6 w-6 text-yellow-400 fill-current" />
                        <span className="text-3xl font-bold text-primary">{averageRating}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ratings.length} reseñas
                      </div>
                    </div>
                  )}
                  
                  {doctor.consultation_fee && (
                    <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-4 text-center shadow-lg">
                      <div className="text-3xl font-bold text-primary mb-1">
                        ${doctor.consultation_fee}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        MXN por consulta
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  {doctor.office_phone && (
                    <div className="flex items-center gap-2 bg-background/30 backdrop-blur-sm px-4 py-2 rounded-full">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-sm">{doctor.office_phone}</span>
                    </div>
                  )}
                  
                  {doctor.office_address && (
                    <div className="flex items-center gap-2 bg-background/30 backdrop-blur-sm px-4 py-2 rounded-full">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm">{doctor.office_address}</span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  <Button 
                    onClick={handleBookAppointment}
                    size="lg"
                    className="w-full lg:w-auto px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Agendar Cita con Dr. {doctor.profile?.full_name?.split(' ')[0]}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="px-6 pb-12 space-y-8">

        {/* About Section with Professional Photos */}
        {(doctor.biography || (doctor.professional_photos_urls && doctor.professional_photos_urls.length > 0)) && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-2 gap-0">
                {/* Biography */}
                {doctor.biography && (
                  <div className="p-8">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                      <User className="h-6 w-6 text-primary" />
                      Conoce a tu Doctor
                    </h2>
                    <div className="prose prose-neutral max-w-none">
                      <p className="text-muted-foreground leading-relaxed text-lg">
                        {doctor.biography}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Professional Photos Gallery */}
                {doctor.professional_photos_urls && doctor.professional_photos_urls.length > 0 && (
                  <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-8">
                    <h3 className="text-xl font-semibold mb-4 text-center">Dr. {doctor.profile?.full_name?.split(' ')[0]} en acción</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {doctor.professional_photos_urls.slice(0, 4).map((photoUrl: string, index: number) => (
                        <div key={index} className="relative group">
                          <AspectRatio ratio={3/4}>
                            <img 
                              src={photoUrl} 
                              alt={`Dr. ${doctor.profile?.full_name} - Foto profesional ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer"
                            />
                          </AspectRatio>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

        {/* Photo Gallery */}
        {((doctor.professional_photos_urls && doctor.professional_photos_urls.length > 0) || 
          (doctor.office_photos_urls && doctor.office_photos_urls.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Galería Profesional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Professional Photos */}
                {doctor.professional_photos_urls && doctor.professional_photos_urls.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Dr. {doctor.profile?.full_name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {doctor.professional_photos_urls.map((photoUrl: string, index: number) => (
                        <div key={index} className="relative group">
                          <AspectRatio ratio={3/4}>
                            <img 
                              src={photoUrl} 
                              alt={`Dr. ${doctor.profile?.full_name} - Foto profesional ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer"
                            />
                          </AspectRatio>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Office Photos */}
                {doctor.office_photos_urls && doctor.office_photos_urls.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Consultorio</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {doctor.office_photos_urls.map((photoUrl: string, index: number) => (
                        <div key={index} className="relative group">
                          <AspectRatio ratio={4/3}>
                            <img 
                              src={photoUrl} 
                              alt={`Consultorio - Foto ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer"
                            />
                          </AspectRatio>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
    </div>
  );
}