// src/pages/DoctorProfile.tsx

import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MapPin, DollarSign, Star, Calendar, User, Phone, FileText, Clock, Award, ArrowLeft } from "lucide-react";
import { DoctorCalendarView } from "@/components/DoctorCalendarView";

interface DoctorProfileData {
  user_id: string;
  full_name: string;
  phone: string;
  specialty: string;
  biography: string | null;
  professional_license: string;
  practice_locations: string[];
  consultation_fee: number | null;
  profile_image_url: string | null;
  experience_years?: number;
  rating_avg?: number;
  rating_count?: number;
  documents: {
    label: string;
    url: string;
  }[];
}

export default function DoctorProfile() {
  const { user, loading: authLoading } = useAuth();
  const { id: doctorId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  if (authLoading) return <LoadingSpinner size="lg" />;
  if (!user) {
    // Guardar la ruta actual para redirigir después del login
    const currentPath = `/doctor/${doctorId}`;
    return <Navigate to="/auth" state={{ from: currentPath }} replace />;
  }

  useEffect(() => {
    async function fetchDoctor() {
      setLoading(true);
      console.log('🔍 doctorId from URL:', doctorId);
      
      const { data: dp, error: dpErr, status: dpStatus } = await supabase
        .from("doctor_profiles")
        .select(
          `
            user_id,
            specialty,
            biography,
            professional_license,
            professional_license_document_url,
            university_degree_document_url,
            experience_years,
            practice_locations,
            consultation_fee,
            profile_image_url,
            rating_avg,
            rating_count
          `
        )
        .eq("user_id", doctorId)
        .limit(1)
        .maybeSingle();

      console.log('📊 doctor_profiles response:', { dp, dpErr, dpStatus });

      if (!dp) {
        setLoading(false);
        return;
      }

      console.log('📡 Fetching profiles for', dp.user_id);
      const { data: pr, error: prErr, status: prStatus } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", dp.user_id)
        .limit(1)
        .maybeSingle();

      console.log('📊 profiles response:', { pr, prErr, prStatus });

      // documents stored in doctor_profiles or separate table
      const documents = [];
      if (dp?.professional_license_document_url) {
        documents.push({ label: "Cédula Profesional", url: dp.professional_license_document_url });
      }
      if (dp?.university_degree_document_url) {
        documents.push({ label: "Título Universitario", url: dp.university_degree_document_url });
      }

      if (dp && pr) {
        setDoctor({
          ...dp,
          ...pr,
          documents,
        } as any);
      }
      setLoading(false);
    }

    if (doctorId) fetchDoctor();
  }, [doctorId]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!doctor) return <p>Doctor no encontrado</p>;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/search')}
          className="mb-6 gap-2 hover:bg-primary/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la búsqueda
        </Button>

        {/* Header Section - Hero Style */}
        <Card className="mb-8 overflow-hidden shadow-medium border-0" style={{ backgroundColor: '#00a0df' }}>
          <CardContent className="p-0">
            <div className="relative h-48" style={{ backgroundColor: '#00a0df' }}>
              <div className="absolute inset-0"></div>
            </div>
            
            {/* Profile Section */}
            <div className="relative px-6 pb-6">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
                {/* Profile Image - Centro de atención */}
                <div className="relative z-10">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-xl ring-4 ring-white/20">
                    {doctor.profile_image_url && (
                      <AvatarImage 
                        src={doctor.profile_image_url} 
                        alt={doctor.full_name}
                        className="object-cover w-full h-full"
                        onLoad={() => console.log('✅ Image loaded successfully:', doctor.profile_image_url)}
                        onError={(e) => {
                          console.log('❌ Error loading image:', doctor.profile_image_url);
                          console.log('Error event:', e);
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-accent w-8 h-8 rounded-full border-4 border-white flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Doctor Info */}
                <div className="flex-1 text-center md:text-left text-primary-foreground">
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{doctor.full_name}</h1>
                  <p className="text-xl text-primary-foreground/80 mb-3">{doctor.specialty}</p>
                  
                  {/* Rating */}
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                    <div className="flex">
                      {renderStars(doctor.rating_avg || 0)}
                    </div>
                    <span className="text-primary-foreground/80">
                      {doctor.rating_avg?.toFixed(1) || '0.0'} ({doctor.rating_count || 0} reseñas)
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                    <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                      <Award className="w-4 h-4 mr-1" />
                      {doctor.experience_years || 0} años de experiencia
                    </Badge>
                    <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                      <MapPin className="w-4 h-4 mr-1" />
                      {doctor.practice_locations?.length || 0} consultorios
                    </Badge>
                  </div>
                </div>

                {/* Price and Action */}
                <div className="text-center">
                  <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-lg p-4 mb-4">
                    <div className="text-3xl font-bold text-primary-foreground mb-1">
                      ${doctor.consultation_fee || 0}
                    </div>
                    <div className="text-primary-foreground/80 text-sm">por consulta</div>
                  </div>
                  <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold px-8">
                    <Calendar className="w-5 h-5 mr-2" />
                    Agendar Cita
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Doctor Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* About */}
            <Card className="shadow-soft animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Sobre el Doctor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor.biography && (
                  <p className="text-muted-foreground leading-relaxed">{doctor.biography}</p>
                )}
                
                <div className="space-y-3">
                  {doctor.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="text-sm">{doctor.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm">Disponible para consultas</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Locations */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Consultorios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {doctor.practice_locations?.map((location, index) => (
                    <div key={index} className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <div className="font-medium text-sm">{location}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {doctor.documents.map((doc, index) => (
                    <a
                      key={index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{doc.label}</span>
                    </a>
                  ))}
                  {!doctor.documents.length && (
                    <p className="text-muted-foreground text-sm">No hay documentos disponibles.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Calendar */}
          <div className="lg:col-span-2">
            <Card className="shadow-soft h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Horarios Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DoctorCalendarView doctorId={doctorId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
