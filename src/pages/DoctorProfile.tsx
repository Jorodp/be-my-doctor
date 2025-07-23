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
  professional_title?: string;
  license_number?: string;
  practice_locations: string[];
  consultation_fee: number | null;
  profile_image_url: string | null;
  profile_complete: boolean;
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
        // 1) Fetch doctor_profiles
        const { data: dp, error: dpErr } = await supabase
          .from("doctor_profiles")
          .select(
            `
              user_id,
              specialty,
              biography,
              professional_title,
              license_number,
              practice_locations,
              consultation_fee,
              profile_image_url,
              profile_complete
            `
          )
          .eq("user_id", doctorId)
          .single();
        if (dpErr) throw dpErr;
        if (!dp) throw new Error("Doctor no encontrado");

        // 2) Fetch profiles (for name & contact)
        const { data: pr, error: prErr } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("user_id", doctorId)
          .single();
        if (prErr) throw prErr;

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

  // Si el doctor no completó su perfil, mostramos mensaje
  if (!doctor.profile_complete) {
    return (
      <div className="p-6 text-center">
        <p className="text-xl font-medium">
          El doctor aún no ha completado su perfil.
        </p>
      </div>
    );
  }

  // Perfil completo
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
          {doctor.professional_title && (
            <p>
              <strong>Título profesional:</strong> {doctor.professional_title}
            </p>
          )}
          {doctor.license_number && (
            <p>
              <strong>Cédula:</strong> {doctor.license_number}
            </p>
          )}
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
