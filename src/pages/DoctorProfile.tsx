import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DoctorProfileData {
  user_id: string;
  full_name: string;
  specialty: string;
  biography: string | null;
  professional_title?: string;
  license_number?: string;
  practice_locations: string[];
  consultation_fee: number | null;
  profile_image_url: string | null;
  email: string;
  phone: string;
}

const DoctorProfile = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    const fetchDoctor = async () => {
      setLoading(true);
      try {
        // Intentar obtener un único registro de la vista
        const { data, error: fetchError } = await supabase
          .from('public_doctors_public')
          .select('*')
          .eq('doctor_user_id', doctorId)
          .maybeSingle();  // Usa maybeSingle para evitar 406 si no hay PK en la vista

        console.log('Doctor raw data:', data, 'error:', fetchError);
        if (fetchError) throw fetchError;
        if (!data) throw new Error('Doctor no encontrado');

        // Fetch user profile
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('email, phone')
          .eq('user_id', doctorId)
          .single();
        if (userError) throw userError;

        setDoctor({ ...data, ...userProfile });
      } catch (err: any) {
        console.error('Error fetching doctor', err);
        setError(err.message || 'Error al cargar el perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }
  if (!doctor) {
    return <div className="text-center p-4">Doctor no encontrado</div>;
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
          {doctor.professional_title && (
            <p><strong>Título profesional:</strong> {doctor.professional_title}</p>
          )}
          {doctor.license_number && (
            <p><strong>Cédula:</strong> {doctor.license_number}</p>
          )}
          {doctor.biography && <p className="mt-2">{doctor.biography}</p>}
          {doctor.practice_locations.length > 0 && (
            <div className="mt-4">
              <p><strong>Consultorios:</strong></p>
              <ul className="list-disc list-inside">
                {doctor.practice_locations.map((loc, idx) => (
                  <li key={idx}>{loc}</li>
                ))}
              </ul>
            </div>
          )}
          {doctor.consultation_fee != null && (
            <p><strong>Honorarios:</strong> ${doctor.consultation_fee}</p>
          )}
          <div className="mt-4 space-y-1">
            <p><strong>Email:</strong> {doctor.email}</p>
            <p><strong>Teléfono:</strong> {doctor.phone}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorProfile;
