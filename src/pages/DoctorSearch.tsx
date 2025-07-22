import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { BackToHomeButton } from "@/components/ui/BackToHomeButton";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Doctor {
  doctor_profile_id: string;
  doctor_user_id: string;
  full_name: string;
  profile_image_url: string | null;
  specialty: string;
  rating_avg: number;
}

const DoctorSearch = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from("public_doctors_directory")
        .select("*");

      if (error) throw error;

      setDoctors(data as Doctor[]);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground" />
      );
    }

    return stars;
  };

  const handleDoctorClick = (doctorId: string) => {
    navigate(`/doctor/${doctorId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto p-6">
        <BackToHomeButton />
        
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            Buscar Doctores
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Encuentra doctores verificados y disponibles para tu consulta médica
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {doctors.map((doctor) => (
            <Card
              key={doctor.doctor_profile_id}
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer bg-card/50 backdrop-blur-sm border-2 hover:border-primary/20"
              onClick={() => handleDoctorClick(doctor.doctor_profile_id)}
            >
              <div className="relative">
                {doctor.profile_image_url ? (
                  <img
                    src={doctor.profile_image_url}
                    alt={doctor.full_name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-primary/30 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-primary">
                        {doctor.full_name.charAt(0)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              
              <CardContent className="p-6">
                <div className="text-center space-y-3">
                  <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {doctor.full_name}
                  </CardTitle>
                  <p className="text-primary font-medium bg-primary/10 px-3 py-1 rounded-full text-sm">
                    {doctor.specialty}
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <div className="flex">{renderStars(doctor.rating_avg || 0)}</div>
                    <span className="text-sm font-semibold text-foreground">
                      {doctor.rating_avg?.toFixed(1) || "0.0"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {doctors.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No se encontraron doctores disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorSearch;