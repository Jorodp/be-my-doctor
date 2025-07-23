// src/pages/DoctorProfile.tsx

import { useParams, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MapPin, DollarSign, FileText, Calendar, User } from "lucide-react";

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
  documents: {
    label: string;
    url: string;
  }[];
}

export default function DoctorProfile() {
  const { user, loading: authLoading } = useAuth();
  const { id: doctorId } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  if (authLoading) return <LoadingSpinner size="lg" />;
  if (!user) return <Navigate to="/auth" replace />;

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
            experience_years,
            practice_locations,
            consultation_fee,
            profile_image_url
          `
        )
        .eq("id", doctorId)
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
      if (dp?.professional_license) {
        documents.push({ label: "Cédula Profesional", url: dp.professional_license });
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

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-6">
            <Avatar className="w-24 h-24">
              {doctor.profile_image_url ? (
                <AvatarImage src={doctor.profile_image_url} alt={doctor.full_name} />
              ) : (
                <AvatarFallback>
                  <User className="w-10 h-10" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-3xl">{doctor.full_name}</CardTitle>
              <CardDescription className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{doctor.practice_locations.join(", ")}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-medium text-lg">
                  Honorarios: ${doctor.consultation_fee}
                </span>
              </div>
              <div>
                <h4 className="font-semibold">Especialidad</h4>
                <p>{doctor.specialty}</p>
              </div>
              <div>
                <h4 className="font-semibold">Biografía</h4>
                <p>{doctor.biography}</p>
              </div>
            </div>
            <div>
              <Tabs defaultValue="about">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="about">Sobre mí</TabsTrigger>
                  <TabsTrigger value="locations">Consultorios</TabsTrigger>
                  <TabsTrigger value="documents">Documentos</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="pt-4">
                  <p className="text-sm">Teléfono: {doctor.phone}</p>
                </TabsContent>

                <TabsContent value="locations" className="pt-4">
                  <ul className="list-disc list-inside">
                    {doctor.practice_locations.map((loc, i) => (
                      <li key={i}>{loc}</li>
                    ))}
                  </ul>
                </TabsContent>

                <TabsContent value="documents" className="pt-4 space-y-2">
                  {doctor.documents.map((doc, i) => (
                    <a
                      key={i}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-blue-600 hover:underline"
                    >
                      <FileText className="w-5 h-5" />
                      <span>{doc.label}</span>
                    </a>
                  ))}
                  {!doctor.documents.length && <p>No hay documentos disponibles.</p>}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
