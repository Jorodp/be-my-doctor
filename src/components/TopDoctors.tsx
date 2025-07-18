import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface TopDoctor {
  id: string;
  user_id: string;
  specialty: string;
  consultation_fee: number;
  years_experience: number;
  profile_image_url: string | null;
  profile: {
    full_name: string;
  };
  average_rating: number;
  total_ratings: number;
  practice_locations: string[];
}

const TopDoctors = () => {
  const [topDoctors, setTopDoctors] = useState<TopDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTopDoctors();
  }, []);

  const fetchTopDoctors = async () => {
    try {
      // Get doctors with ratings and active subscriptions
      const { data: doctorsData, error } = await supabase
        .from('doctor_profiles')
        .select(`
          id,
          user_id,
          specialty,
          consultation_fee,
          years_experience,
          profile_image_url,
          practice_locations
        `)
        .eq('verification_status', 'verified')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (!doctorsData) {
        setTopDoctors([]);
        return;
      }

      // Check for active subscriptions
      const doctorIds = doctorsData.map(d => d.user_id);
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('user_id')
        .in('user_id', doctorIds)
        .eq('status', 'active')
        .gte('ends_at', new Date().toISOString());

      const activeDoctorIds = subscriptions?.map(s => s.user_id) || [];
      const activeDoctors = doctorsData.filter(d => activeDoctorIds.includes(d.user_id));

      // Get ratings and profiles for each doctor
      const doctorsWithRatings = await Promise.all(
        activeDoctors.map(async (doctor) => {
          // Get ratings
          const { data: ratings } = await supabase
            .from('ratings')
            .select('rating')
            .eq('doctor_user_id', doctor.user_id);

          // Get profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', doctor.user_id)
            .single();

          const totalRatings = ratings?.length || 0;
          const averageRating = totalRatings > 0 
            ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
            : 0;

          return {
            ...doctor,
            average_rating: averageRating,
            total_ratings: totalRatings,
            profile: profile || { full_name: 'Doctor' }
          };
        })
      );

      // Sort by average rating and limit to top 3
      const sortedDoctors = doctorsWithRatings
        .filter(d => d.total_ratings > 0) // Only show doctors with ratings
        .sort((a, b) => b.average_rating - a.average_rating)
        .slice(0, 3);

      setTopDoctors(sortedDoctors);
    } catch (error) {
      console.error('Error fetching top doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  const handleDoctorClick = (doctorId: string) => {
    navigate(`/doctors/${doctorId}`);
  };

  const handleViewAll = () => {
    navigate('/doctors');
  };

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Nuestros mejores doctores
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-4"></div>
                  <div className="h-3 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (topDoctors.length === 0) {
    return null; // Don't show section if no doctors available
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Nuestros mejores doctores
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Conoce a los médicos mejor calificados de nuestra plataforma, 
            seleccionados por la excelencia en su atención y resultados.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {topDoctors.map((doctor, index) => (
            <Card
              key={doctor.id}
              className="group cursor-pointer hover:shadow-medium transition-all duration-300 hover:scale-105 border border-border animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => handleDoctorClick(doctor.user_id)}
            >
              <CardContent className="p-6 text-center">
                <div className="relative mb-4">
                  <div className="w-20 h-20 bg-gradient-primary rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold">
                    {doctor.profile?.full_name?.charAt(0) || 'D'}
                  </div>
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    #{index + 1}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {doctor.profile?.full_name}
                </h3>

                <p className="text-primary font-semibold mb-2">
                  {doctor.specialty}
                </p>

                <div className="flex items-center justify-center gap-1 mb-3">
                  {renderStars(doctor.average_rating)}
                  <span className="text-sm text-muted-foreground ml-1">
                    {doctor.average_rating.toFixed(1)} ({doctor.total_ratings})
                  </span>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{doctor.years_experience} años de experiencia</span>
                  </div>
                  
                  {doctor.practice_locations && doctor.practice_locations.length > 0 && (
                    <div className="flex items-center justify-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{doctor.practice_locations[0]}</span>
                    </div>
                  )}

                  <div className="text-lg font-bold text-primary">
                    ${doctor.consultation_fee?.toLocaleString()} MXN
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button 
            onClick={handleViewAll}
            variant="outline" 
            size="lg" 
            className="group"
          >
            Ver todos los doctores
            <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TopDoctors;