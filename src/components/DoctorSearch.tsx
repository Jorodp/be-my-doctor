import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, MapPin } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Doctor {
  doctor_user_id: string;
  full_name: string;
  specialty: string;
  rating_avg: number;
  consultation_fee: number;
  practice_locations: string;
  profile_image_url: string | null;
}

const DoctorSearch = () => {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase.rpc('public_search_doctors', {
        p_name: name || null,
        p_specialty: specialty || null,
        p_location: location || null,
        p_limit: 20
      });

      if (error) {
        console.error("Error searching doctors:", error);
        setDoctors([]);
      } else {
        setDoctors(data || []);
      }
    } catch (error) {
      console.error("Error searching doctors:", error);
      setDoctors([]);
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

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            Buscar Doctores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre del Doctor
              </label>
              <Input
                placeholder="Buscar por nombre..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Especialidad
              </label>
              <Input
                placeholder="Ej: Cardiología, Dermatología..."
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Ubicación
              </label>
              <Input
                placeholder="Ciudad, estado..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-2 bg-primary hover:bg-primary-dark text-white font-semibold"
            >
              {loading ? <LoadingSpinner /> : "Buscar Doctores"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">
            Resultados de Búsqueda ({doctors.length} doctores encontrados)
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No se encontraron doctores con los criterios especificados
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {doctors.map((doctor) => (
                <Card
                  key={doctor.doctor_user_id}
                  className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer bg-card/50 backdrop-blur-sm border-2 hover:border-primary/20"
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
                  
                  <CardContent className="p-6 space-y-3">
                    <div className="text-center space-y-2">
                      <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {doctor.full_name}
                      </CardTitle>
                      <p className="text-primary font-medium bg-primary/10 px-3 py-1 rounded-full text-sm">
                        {doctor.specialty}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex">{renderStars(doctor.rating_avg || 0)}</div>
                      <span className="text-sm font-semibold text-foreground">
                        {doctor.rating_avg?.toFixed(1) || "0.0"}
                      </span>
                    </div>

                    {doctor.consultation_fee && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">
                          ${doctor.consultation_fee.toLocaleString()} MXN
                        </p>
                        <p className="text-xs text-muted-foreground">Consulta</p>
                      </div>
                    )}

                    {doctor.practice_locations && (
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{doctor.practice_locations}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorSearch;