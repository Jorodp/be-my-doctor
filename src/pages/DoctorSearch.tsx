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
  // No definimos aquí el id, lo manejamos dinámicamente
  [key: string]: any;
  full_name: string;
  specialty: string;
  practice_locations: string[];
  profile_image_url: string | null;
  rating_avg: number;
  consultation_fee: number;
  years_experience?: number;
  verification_status?: string;
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
  const getDoctorId = (doc: Doctor) =>
    doc.doctor_user_id ??
    doc.doctor_profile_id ??
    doc.doctor_id ??
    doc.id ??
    "";

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
      console.log("DOCTORS DATA (mira en consola la forma):", data);
      setDoctors(data as Doctor[]);
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
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
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
                          {doc.verification_status === "verified" && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="space-y-2 w-full">
                          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                            Dr. {doc.full_name}
                          </h3>
                          {doc.specialty && (
                            <Badge variant="secondary" className="text-xs">
                              {doc.specialty}
                            </Badge>
                          )}
                          {doc.practice_locations?.length > 0 && (
                            <div className="flex items-center justify-center text-sm text-muted-foreground">
                              <MapPin className="mr-1 h-3 w-3" />
                              <span className="truncate">
                                {doc.practice_locations
                                  .slice(0, 2)
                                  .join(", ")}
                                {doc.practice_locations.length > 2 && "..."}
                              </span>
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
                            {doc.consultation_fee && (
                              <div className="flex items-center text-green-600">
                                <DollarSign className="mr-1 h-3 w-3" />
                                <span className="font-medium">
                                  ${doc.consultation_fee}
                                </span>
                              </div>
                            )}
                          </div>
                          {doc.years_experience && (
                            <p className="text-xs text-muted-foreground">
                              {doc.years_experience} años de experiencia
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
