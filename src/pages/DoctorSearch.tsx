// /src/pages/DoctorSearch.tsx

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

interface Doctor {
  [key: string]: any;
  doctor_user_id: string;
  full_name: string;
  specialty: string;
  profile_image_url: string | null;
  rating_avg: number;
  rating_count: number;
  experience_years?: number;
  city?: string;
}

export default function DoctorSearch() {
  const [filters, setFilters] = useState({
    name: "",
    specialty: "",
    location: "",
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Helper para extraer el ID correcto:
  const getDoctorId = (doc: Doctor) => doc.doctor_user_id || "";

  const fetchDoctors = async () => {
    setLoading(true);
    
    // Primero obtener los doctores básicos
    const { data: doctorProfilesData, error: doctorError } = await supabase
      .from("doctor_profiles")
      .select(`
        user_id,
        specialty,
        profile_image_url,
        rating_avg,
        rating_count,
        experience_years
      `)
      .eq("verification_status", "verified")
      .eq("subscription_status", "active")
      .eq("profile_complete", true)
      .limit(50);

    if (doctorError) {
      console.error("Error al buscar doctores:", doctorError);
      setLoading(false);
      return;
    }

    if (!doctorProfilesData || doctorProfilesData.length === 0) {
      console.log("No se encontraron doctores");
      setDoctors([]);
      setLoading(false);
      return;
    }

    console.log("Doctor profiles encontrados:", doctorProfilesData);

    // Obtener los IDs de usuario para buscar perfiles
    const userIds = doctorProfilesData.map(d => d.user_id);

    // Obtener información de perfiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    // Obtener información de clínicas (opcional)
    const { data: clinicsData, error: clinicsError } = await supabase
      .from("clinics")
      .select("doctor_id, city")
      .in("doctor_id", userIds.map(id => 
        doctorProfilesData.find(d => d.user_id === id)?.user_id
      ).filter(Boolean));

    console.log("Profiles data:", profilesData);
    console.log("Clinics data:", clinicsData);

    // Crear mapa de nombres de perfiles
    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);
    
    // Crear mapa de ciudades (tomar la primera ciudad de cada doctor)
    const clinicsMap = new Map();
    clinicsData?.forEach(clinic => {
      if (!clinicsMap.has(clinic.doctor_id)) {
        clinicsMap.set(clinic.doctor_id, clinic.city);
      }
    });

    // Transformar datos para mantener compatibilidad
    const transformedDoctors = doctorProfilesData.map(doctor => ({
      doctor_user_id: doctor.user_id,
      full_name: profilesMap.get(doctor.user_id) || 'Doctor',
      specialty: doctor.specialty,
      profile_image_url: doctor.profile_image_url,
      rating_avg: doctor.rating_avg,
      rating_count: doctor.rating_count,
      experience_years: doctor.experience_years,
      city: clinicsMap.get(doctor.user_id) || ''
    }));

    console.log("Transformed doctors:", transformedDoctors);

    // Aplicar filtros si existen
    let filteredDoctors = transformedDoctors;
    
    if (filters.name) {
      filteredDoctors = filteredDoctors.filter(doctor => 
        doctor.full_name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }
    if (filters.specialty) {
      filteredDoctors = filteredDoctors.filter(doctor => 
        doctor.specialty.toLowerCase().includes(filters.specialty.toLowerCase())
      );
    }
    if (filters.location) {
      filteredDoctors = filteredDoctors.filter(doctor => 
        doctor.city.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    setDoctors(filteredDoctors);
    setLoading(false);
  };

  const handleDoctorClick = (doctorId: string) => {
    const path = `/doctor/${doctorId}`;
    if (user) {
      navigate(path);
    } else {
      navigate("/auth", { state: { from: { pathname: path } } });
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <BackToHomeButton />
          <h1 className="text-3xl font-bold text-primary">Buscar Doctores</h1>
          <div className="w-[120px]" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Nombre */}
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
                  onChange={(e) =>
                    setFilters({ ...filters, name: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Especialidad */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Especialidad
              </label>
              <Input
                placeholder="Cardiología, Pediatría..."
                value={filters.specialty}
                onChange={(e) =>
                  setFilters({ ...filters, specialty: e.target.value })
                }
              />
            </div>
            {/* Ubicación */}
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
                  onChange={(e) =>
                    setFilters({ ...filters, location: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Botón Buscar */}
            <Button
              onClick={fetchDoctors}
              className="w-full bg-search-button hover:bg-search-button/90 text-primary-foreground"
              disabled={loading}
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
          </CardContent>
        </Card>


        {/* Resultados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground">Buscando doctores...</p>
          </div>
        ) : doctors.length > 0 ? (
          <>
            <div className="mb-6">
              <p className="text-muted-foreground">
                Se encontraron {doctors.length} doctores
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => {
                const id = getDoctorId(doc);
                return (
                  <Card
                    key={id}
                    className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] border-0 shadow-md bg-gradient-to-br from-background to-background/80"
                    onClick={() => handleDoctorClick(id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        {/* Foto */}
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
                         </div>

                        {/* Info */}
                        <div className="space-y-2 w-full">
                          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                            {doc.full_name.startsWith('Dr.') ? doc.full_name : `Dr. ${doc.full_name}`}
                          </h3>
                          {doc.specialty && (
                            <Badge variant="secondary" className="text-xs">
                              {doc.specialty}
                            </Badge>
                          )}
                          {doc.city && (
                            <div className="flex items-center justify-center text-sm text-muted-foreground">
                              <MapPin className="mr-1 h-3 w-3" />
                              <span className="truncate">{doc.city}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-center space-x-4 text-sm">
                            {doc.rating_avg && (
                              <div className="flex items-center text-yellow-500">
                                <Star className="mr-1 h-3 w-3 fill-current" />
                                <span className="font-medium">
                                  {Number(doc.rating_avg).toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                           {doc.experience_years && (
                             <p className="text-xs text-muted-foreground">
                               {doc.experience_years} años de experiencia
                             </p>
                           )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No se encontraron doctores
            </h3>
            <p className="text-muted-foreground">
              Intenta ajustar tus filtros de búsqueda para más resultados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
