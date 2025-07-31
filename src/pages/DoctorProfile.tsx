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
import { DoctorReviewsSection } from "@/components/DoctorReviewsSection";
import { DoctorClinicsDisplay } from "@/components/DoctorClinicsDisplay";
import { DoctorImage } from "@/components/DoctorImage";

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
        <Card className="mb-8 overflow-hidden shadow-medium border-0">
          <CardContent className="p-0">
            <div className="relative bg-gradient-to-br from-primary/20 to-primary/40 pt-8 pb-20">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"></div>
            </div>
            
            {/* Profile Section */}
            <div className="relative px-6 pb-6">
              <div className="flex flex-col items-center -mt-20">
                {/* Profile Image - Prominente */}
                <DoctorImage 
                  profileImageUrl={doctor.profile_image_url}
                  doctorName={doctor.full_name}
                  size="xl"
                  className="relative z-10 mb-6"
                />

                {/* Doctor Info - Centrado */}
                <div className="text-center space-y-4">
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-2 text-foreground">{doctor.full_name}</h1>
                    <p className="text-xl text-muted-foreground mb-4">{doctor.specialty}</p>
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex">
                      {renderStars(doctor.rating_avg || 0)}
                    </div>
                    <span className="text-muted-foreground font-medium">
                      {doctor.rating_avg?.toFixed(1) || '0.0'} ({doctor.rating_count || 0} reseñas)
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap justify-center gap-4 text-sm">
                    <Badge variant="secondary" className="px-4 py-2">
                      <Award className="w-4 h-4 mr-2" />
                      {doctor.experience_years || 0} años de experiencia
                    </Badge>
                    <Badge variant="secondary" className="px-4 py-2">
                      <MapPin className="w-4 h-4 mr-2" />
                      Múltiples consultorios
                    </Badge>
                  </div>
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

            {/* Consultorios */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Consultorios Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DoctorClinicsDisplay doctorUserId={doctorId || ''} />
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

            {/* Reviews Section */}
            <DoctorReviewsSection doctorUserId={doctorId || ''} />
          </div>

          {/* Right Column - Calendar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendar Section */}
            <Card className="shadow-soft h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calendar className="w-6 h-6 text-primary" />
                  Agenda tu Cita
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Selecciona la fecha y hora que mejor se adapte a tu agenda
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <DoctorCalendarView doctorId={doctorId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
