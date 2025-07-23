// src/pages/DoctorProfile.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DoctorProfileData {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  specialty: string;
  biography: string | null;
  professional_license: string;
  experience_years: number;
  practice_locations: string[];
  consultation_fee: number | null;
  profile_image_url: string | null;
  // eliminamos profile_complete porque ya no lo usamos para ocultar el perfil
}

const DoctorProfile = () => {
  const { id: doctorId } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;

    (async () => {
      setLoading(true);
      try {
        // 1) Traer doctor_profiles
        const { data: dp, error: dpErr } = await supabase
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
          .eq("user_id", doctorId)
          .limit(1)
          .maybeSingle();
        if (dpErr) throw dpErr;
        if (!dp) throw new Error("Doctor no encontrado");

        // 2) Traer profiles (nombre y contacto)
        const { data: pr, error: prErr } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("user_id", doctorId)
          .limit(1)
          .maybeSingle();
        if (prErr) throw prErr;
        if (!pr) throw new Error("Perfil de usuario no encontrado");

        setDoctor({ ...dp, ...pr });
      } catch (err: any) {
        console.error("Error fetching doctor profile:", err);
        setError(err.message || "Error al cargar el perfil");
      } finally {
        setLoading(false);
      }
    })();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-500 p-4">{error}</p>;
  }

  if (!doctor) {
    return <p className="text-center p-4">Doctor no encontrado</p>;
  }

  // Renderizamos siempre el perfil, incluso si está incompleto
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
          <div className="space-y-1">
            <p>
              <strong>Email:</strong> {doctor.email}
            </p>
            <p>
              <strong>Teléfono:</strong> {doctor.phone}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorProfile;

