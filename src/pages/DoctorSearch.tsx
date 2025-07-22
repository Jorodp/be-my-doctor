import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
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
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Buscar Doctores</h1>
        <p className="text-muted-foreground mt-2">
          Encuentra doctores verificados y disponibles
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doctor) => (
          <Card
            key={doctor.doctor_profile_id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleDoctorClick(doctor.doctor_profile_id)}
          >
            <CardHeader className="flex items-center gap-4">
              {doctor.profile_image_url ? (
                <img
                  src={doctor.profile_image_url}
                  alt={doctor.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200" />
              )}
              <div>
                <CardTitle className="text-lg">{doctor.full_name}</CardTitle>
                <p className="text-muted-foreground">{doctor.specialty}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex">{renderStars(doctor.rating_avg || 0)}</div>
                <span className="text-sm text-muted-foreground">
                  ({doctor.rating_avg?.toFixed(1) || "0.0"})
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DoctorSearch;