import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DoctorProfile = () => {
  const router = useRouter();
  const { doctorId } = router.query;

  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    if (doctorId) {
      fetchDoctor();
    }
  }, [doctorId]);

  const fetchDoctor = async () => {
    const { data, error } = await supabase
      .from("public_doctors_public")
      .select("*")
      .eq("doctor_profile_id", doctorId)
      .single();

    if (error) {
      console.error("Error fetching doctor", error);
    } else {
      setDoctor(data);
    }
  };

  if (!doctor) {
    return <p className="p-4">Cargando...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{doctor.full_name}</h1>
      <p className="text-muted-foreground">{doctor.specialty}</p>
      {doctor.profile_image_url && (
        <img
          src={doctor.profile_image_url}
          alt={doctor.full_name}
          className="w-32 h-32 rounded-full mt-4"
        />
      )}
      <p className="mt-4">Rating: {Number(doctor.rating_avg).toFixed(1)}</p>
    </div>
  );
};

export default DoctorProfile;
