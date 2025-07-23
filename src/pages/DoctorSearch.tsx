import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { BackToHomeButton } from "@/components/ui/BackToHomeButton";
import { Search, MapPin, Star, DollarSign, User } from "lucide-react";

export default function DoctorSearch() {
  const [filters, setFilters] = useState({
    name: "",
    specialty: "",
    location: "",
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchDoctors = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("public_search_doctors", {
      p_name: filters.name || null,
      p_specialty: filters.specialty || null,
      p_location: filters.location || null,
      p_limit: 50,
    });

    if (error) {
      console.error("Error al buscar doctores:", error);
    } else {
      setDoctors(data);
    }

    setLoading(false);
  };

  const handleDoctorClick = (doctorId: string) => {
    if (user) {
      navigate(`/doctor/${doctorId}`);
    } else {
      navigate('/auth');
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header con botón de regreso */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <BackToHomeButton />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Buscar Doctores
            </h1>
            <div className="w-[120px]" /> {/* Spacer para centrar el título */}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filtros de búsqueda */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Nombre del doctor
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Dr. Juan Pérez"
                    className="pl-10"
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Especialidad
                </label>
                <Input
                  placeholder="Cardiología, Pediatría..."
                  value={filters.specialty}
                  onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Ubicación
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Ciudad, Estado"
                    className="pl-10"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  />
                </div>
              </div>
              
              <Button 
                onClick={fetchDoctors}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                disabled={loading}
              >
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground">Buscando doctores...</p>
          </div>
        ) : (
          <>
            {doctors.length > 0 && (
              <div className="mb-6">
                <p className="text-muted-foreground">
                  Se encontraron {doctors.length} doctores
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => (
                <Card
                  key={doc.doctor_id}
                  className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] border-0 shadow-md bg-gradient-to-br from-background to-background/80"
                  onClick={() => handleDoctorClick(doc.doctor_profile_id)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      {/* Foto del doctor */}
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                          {doc.profile_image_url ? (
                            <img
                              src={doc.profile_image_url}
                              alt={`Dr. ${doc.full_name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder-doctor.png";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                              <User className="h-8 w-8 text-primary" />
                            </div>
                          )}
                        </div>
                        {doc.verification_status === 'verified' && (
                          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Información del doctor */}
                      <div className="space-y-2 w-full">
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          Dr. {doc.full_name}
                        </h3>
                        
                        {doc.specialty && (
                          <Badge variant="secondary" className="text-xs">
                            {doc.specialty}
                          </Badge>
                        )}

                        {/* Ubicación */}
                        {doc.practice_locations?.length > 0 && (
                          <div className="flex items-center justify-center text-sm text-muted-foreground">
                            <MapPin className="mr-1 h-3 w-3" />
                            <span className="truncate">
                              {doc.practice_locations.slice(0, 2).join(", ")}
                              {doc.practice_locations.length > 2 && "..."}
                            </span>
                          </div>
                        )}

                        {/* Rating */}
                        <div className="flex items-center justify-center space-x-4 text-sm">
                          {doc.rating_avg && (
                            <div className="flex items-center text-yellow-500">
                              <Star className="mr-1 h-3 w-3 fill-current" />
                              <span className="font-medium">
                                {Number(doc.rating_avg).toFixed(1)}
                              </span>
                            </div>
                          )}
                          
                          {/* Precio */}
                          {doc.consultation_fee && (
                            <div className="flex items-center text-green-600">
                              <DollarSign className="mr-1 h-3 w-3" />
                              <span className="font-medium">
                                ${doc.consultation_fee}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Experiencia */}
                        {doc.years_experience && (
                          <p className="text-xs text-muted-foreground">
                            {doc.years_experience} años de experiencia
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {doctors.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No se encontraron doctores</h3>
                <p className="text-muted-foreground">
                  Intenta ajustar tus filtros de búsqueda para encontrar más resultados.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
