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
    
    let query = supabase
      .from("public_doctors_public")
      .select("doctor_user_id,full_name,specialty,profile_image_url,rating_avg,rating_count,experience_years,city")
      .limit(50);

    // Aplicar filtros si existen
    if (filters.name) {
      query = query.ilike("full_name", `%${filters.name}%`);
    }
    if (filters.specialty) {
      query = query.ilike("specialty", `%${filters.specialty}%`);
    }
    if (filters.location) {
      query = query.ilike("city", `%${filters.location}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error("Error al buscar doctores:", error);
    } else {
      console.log("DOCTORS DATA (mira en consola la forma):", data);
      // Eliminar duplicados basados en doctor_user_id
      const uniqueDoctors = data?.filter((doctor, index, self) => 
        index === self.findIndex(d => d.doctor_user_id === doctor.doctor_user_id)
      ) || [];
      setDoctors(uniqueDoctors as Doctor[]);
    }
    setLoading(false);
  };

  const handleDoctorClick = (doctorId: string) => {
    const path = `/doctor/${doctorId}`;
    if (user) {
      navigate(path);
    } else {
      navigate("/auth", { state: { from: path } });
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

        {/* Disclaimer de registro */}
        {!user && (
          <Card className="mb-6 border-l-4 border-l-primary bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    🔒 Plataforma Médica Segura
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Para garantizar la seguridad de nuestros pacientes y doctores, necesitas <strong>registrarte o iniciar sesión</strong> para ver el perfil completo de cada médico, sus horarios disponibles y poder agendar citas.
                  </p>
                  <Button 
                    onClick={() => navigate("/auth")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 py-2"
                  >
                    Registrarse / Iniciar Sesión
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
