// src/pages/DoctorProfile.tsx

import { useParams, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DoctorProfileData {
  user_id: string;
  full_name: string;
  phone: string | null;
  specialty: string;
  biography: string | null;
  professional_license: string;
  experience_years: number;
  practice_locations: string[];
  consultation_fee: number | null;
  profile_image_url: string | null;
}

const DoctorProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const { id: doctorId } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("🔍 authLoading:", authLoading, "user:", user);
  console.log("🔍 doctorId from URL:", doctorId);

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (!user) {
    console.log("⛔ No hay usuario, redirigiendo a /auth");
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    const fetchDoctor = async () => {
      setLoading(true);
      try {
        console.log("📡 Fetching doctor_profiles for", doctorId);
        const { data: dp, error: dpErr, status: dpStatus } = await supabase
          .from("doctor_profiles")
          .select(`
            user_id,
            specialty,
            biography,
            professional_license,
            experience_years,
            practice_locations,
            consultation_fee,
            profile_image_url
          `)
          .eq("id", doctorId)
          .limit(1)
          .maybeSingle();
        console.log("📊 doctor_profiles response:", { dp, dpErr, dpStatus });
        if (dpErr) throw dpErr;
        if (!dp) throw new Error("Doctor no encontrado en doctor_profiles");

        console.log("📡 Fetching profiles for", dp.user_id);
        const { data: pr, error: prErr, status: prStatus } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", dp.user_id)
          .limit(1)
          .maybeSingle();
        console.log("📊 profiles response:", { pr, prErr, prStatus });
        if (prErr) throw prErr;
        if (!pr) throw new Error("Usuario no encontrado en profiles");

        setDoctor({ ...dp, ...pr });
      } catch (err: any) {
        console.error("❌ Error fetching doctor profile:", err);
        setError(err.message || "Error al cargar el perfil");
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) {
      fetchDoctor();
    } else {
      console.warn("⚠️ No se recibió doctorId en params");
      setError("ID de doctor inválido");
      setLoading(false);
    }
  }, [doctorId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  if (!doctor) {
    return (
      <div className="p-4 text-center">
        <p>Doctor no encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-4">
            {doctor.profile_image_url && (
              <img
                src={doctor.profile_image_url}
                alt={doctor.full_name}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{doctor.full_name}</h1>
              <p className="text-sm text-gray-500">{doctor.specialty}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            <strong>Cédula profesional:</strong> {doctor.professional_license}
          </p>
          <p>
            <strong>Años de experiencia:</strong> {doctor.experience_years}
          </p>
          {doctor.biography && <p>{doctor.biography}</p>}
          {doctor.practice_locations.length > 0 && (
            <div>
              <strong>Consultorios:</strong>
              <ul className="list-disc list-inside">
                {doctor.practice_locations.map((loc, idx) => (
                  <li key={idx}>{loc}</li>
                ))}
              </ul>
            </div>
          )}
          {doctor.consultation_fee != null && (
            <p>
              <strong>Honorarios:</strong> ${doctor.consultation_fee}
            </p>
          )}
          {doctor.phone && (
            <div className="space-y-1">
              <p>
                <strong>Teléfono:</strong> {doctor.phone}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorProfile;
