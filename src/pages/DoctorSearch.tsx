import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Star, MapPin, Clock, Filter } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';
import { useToast } from '@/hooks/use-toast';
import { AuthPrompt } from '@/components/AuthPrompt';

interface Doctor {
  id: string;
  user_id: string;
  specialty: string;
  years_experience: number | null;
  consultation_fee: number | null;
  profile_image_url: string | null;
  verification_status: string;
  profile: {
    full_name: string | null;
  } | null;
  average_rating: number;
  total_ratings: number;
  is_available: boolean;
}

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

export default function DoctorSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get('specialty') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rating');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    filterAndSortDoctors();
  }, [doctors, searchTerm, selectedSpecialty, sortBy]);

  useEffect(() => {
    // Update URL parameters
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedSpecialty !== 'all') params.set('specialty', selectedSpecialty);
    if (sortBy !== 'rating') params.set('sort', sortBy);
    setSearchParams(params);
  }, [searchTerm, selectedSpecialty, sortBy, setSearchParams]);

  const fetchDoctors = async () => {
    try {
      // Fetch verified doctors with active subscriptions
      const { data: doctorProfiles, error } = await supabase
        .from('doctor_profiles')
        .select(`
          id,
          user_id,
          specialty,
          years_experience,
          consultation_fee,
          profile_image_url,
          verification_status
        `)
        .eq('verification_status', 'verified');
      
      if (error) throw error;
      if (!doctorProfiles || doctorProfiles.length === 0) {
        setDoctors([]);
        return;
      }

      const userIds = doctorProfiles.map(d => d.user_id);

      // Filter doctors with active subscriptions
      const { data: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('user_id')
        .in('user_id', userIds)
        .eq('status', 'active')
        .gte('ends_at', new Date().toISOString());

      const subscribedUserIds = new Set(activeSubscriptions?.map(sub => sub.user_id) || []);
      
      // Only include doctors with active subscriptions
      const subscribedDoctors = doctorProfiles.filter(doctor => 
        subscribedUserIds.has(doctor.user_id)
      );

      // Convert Set to Array for Supabase queries
      const subscribedUserIdsArray = Array.from(subscribedUserIds);
      
      // Get all profiles for subscribed doctors only
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', subscribedUserIdsArray);

      // Get all ratings for subscribed doctors only
      const { data: allRatings } = await supabase
        .from('ratings')
        .select('doctor_user_id, rating')
        .in('doctor_user_id', subscribedUserIdsArray);

      // Get all availability for subscribed doctors only
      const { data: allAvailability } = await supabase
        .from('doctor_availability')
        .select('doctor_user_id, is_available')
        .in('doctor_user_id', subscribedUserIdsArray)
        .eq('is_available', true);

      // Process only subscribed doctors
      const doctorsWithDetails = subscribedDoctors.map((doctor) => {
        // Find profile for this doctor
        const profile = allProfiles?.find(p => p.user_id === doctor.user_id);

        // Calculate ratings for this doctor
        const doctorRatings = allRatings?.filter(r => r.doctor_user_id === doctor.user_id) || [];
        const average_rating = doctorRatings.length > 0
          ? doctorRatings.reduce((sum, r) => sum + r.rating, 0) / doctorRatings.length
          : 0;

        // Check availability for this doctor
        const hasAvailability = allAvailability?.some(a => a.doctor_user_id === doctor.user_id) || false;

        return {
          ...doctor,
          profile: profile ? { full_name: profile.full_name } : null,
          average_rating: Math.round(average_rating * 10) / 10,
          total_ratings: doctorRatings.length,
          is_available: hasAvailability
        };
      });

      setDoctors(doctorsWithDetails);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los doctores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortDoctors = () => {
    let filtered = doctors;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doctor => 
        doctor.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by specialty
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(doctor => doctor.specialty === selectedSpecialty);
    }

    // Sort doctors
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.average_rating - a.average_rating;
        case 'experience':
          return (b.years_experience || 0) - (a.years_experience || 0);
        case 'price_low':
          return (a.consultation_fee || 0) - (b.consultation_fee || 0);
        case 'price_high':
          return (b.consultation_fee || 0) - (a.consultation_fee || 0);
        case 'name':
          return (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '');
        default:
          return 0;
      }
    });

    setFilteredDoctors(filtered);
  };

  const handleDoctorClick = (doctor: Doctor) => {
    if (!user) {
      setSelectedDoctor(doctor);
      setShowAuthPrompt(true);
    } else {
      navigate(`/doctor/${doctor.user_id}`);
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

  if (showAuthPrompt && selectedDoctor) {
    return (
      <AuthPrompt 
        doctorName={selectedDoctor.profile?.full_name || 'Doctor'} 
        redirectPath={`/doctor/${selectedDoctor.user_id}`}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Back to Home Button */}
      <div className="absolute top-4 left-4 z-10">
        <BackToHomeButton />
      </div>
      
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Encuentra tu Doctor</h1>
            <p className="text-xl text-muted-foreground">
              Doctores verificados listos para atenderte
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Buscar por nombre del doctor o especialidad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11"
                />
              </div>

              {/* Specialty Filter */}
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="w-full lg:w-64">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Especialidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las especialidades</SelectItem>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort Options */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Mejor calificados</SelectItem>
                  <SelectItem value="experience">Más experiencia</SelectItem>
                  <SelectItem value="price_low">Precio menor</SelectItem>
                  <SelectItem value="price_high">Precio mayor</SelectItem>
                  <SelectItem value="name">Nombre A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 'es' : ''} encontrado{filteredDoctors.length !== 1 ? 's' : ''}
            {selectedSpecialty !== 'all' && ` en ${selectedSpecialty}`}
          </p>
        </div>

        {/* Doctors Grid */}
        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="hover:shadow-lg transition-all duration-300 hover-scale">
                <CardContent className="p-0 overflow-hidden">
                  <div className="flex flex-col">
                    {/* Large Doctor Photo at Top */}
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={doctor.profile_image_url || `https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=300&fit=crop&crop=face`} 
                        alt={doctor.profile?.full_name || 'Doctor'} 
                        className="w-full h-full object-cover"
                      />
                      {/* Availability Badge Overlay */}
                      <div className="absolute top-3 right-3">
                        {doctor.is_available ? (
                          <Badge className="bg-green-500 text-white">
                            Disponible
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-500 text-white">
                            No disponible
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content Below Photo */}
                    <div className="p-4 space-y-3">
                      {/* Doctor Name and Specialty */}
                      <div className="text-center">
                        <h3 className="font-semibold text-lg truncate">
                          Dr. {doctor.profile?.full_name || 'Nombre no disponible'}
                        </h3>
                        <p className="text-muted-foreground text-sm">{doctor.specialty}</p>
                        
                        {/* Experience */}
                        {doctor.years_experience && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {doctor.years_experience} años de experiencia
                          </p>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex">
                          {renderStars(doctor.average_rating)}
                        </div>
                        <span className="text-sm font-medium">
                          {doctor.average_rating > 0 ? doctor.average_rating.toFixed(1) : 'Sin calificar'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({doctor.total_ratings})
                        </span>
                      </div>

                      {/* Consultation Fee */}
                      {doctor.consultation_fee && (
                        <div className="text-center">
                          <div className="text-lg font-semibold text-primary">
                            ${doctor.consultation_fee.toLocaleString()}
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button 
                        className="w-full"
                        onClick={() => handleDoctorClick(doctor)}
                      >
                        Ver Perfil
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Search className="h-16 w-16 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">No se encontraron doctores</h3>
                <p className="text-muted-foreground">
                  Intenta modificar los filtros de búsqueda o busca por otra especialidad.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedSpecialty('all');
                    setSortBy('rating');
                  }}
                >
                  Limpiar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}