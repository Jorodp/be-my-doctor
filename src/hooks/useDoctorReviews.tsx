import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DoctorReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name: string;
  edited: boolean;
}

interface DoctorReviewsData {
  reviews: DoctorReview[];
  rating_avg: number;
  rating_count: number;
}

export function useDoctorReviews(doctorUserId: string, page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ["doctor-reviews", doctorUserId, page, limit],
    queryFn: async (): Promise<DoctorReviewsData> => {
      // Obtener estadísticas del doctor
      const { data: doctorProfile, error: profileError } = await supabase
        .from("doctor_profiles")
        .select("rating_avg, rating_count")
        .eq("user_id", doctorUserId)
        .single();

      if (profileError) throw profileError;

      // Obtener reseñas paginadas
      const offset = (page - 1) * limit;
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("doctor_ratings")
        .select(`
          id,
          rating,
          comment,
          created_at,
          edited,
          patient_user_id
        `)
        .eq("doctor_user_id", doctorUserId)
        .eq("visible", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (ratingsError) throw ratingsError;

      // Obtener nombres de pacientes
      const patientIds = ratingsData?.map(r => r.patient_user_id) || [];
      const { data: patientsData, error: patientsError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);

      if (patientsError) throw patientsError;

      // Mapear datos
      const patientsMap = new Map(patientsData?.map(p => [p.user_id, p.full_name]) || []);
      
      const reviews: DoctorReview[] = ratingsData?.map(rating => ({
        id: rating.id,
        rating: rating.rating,
        comment: rating.comment,
        created_at: rating.created_at,
        patient_name: patientsMap.get(rating.patient_user_id) || "Usuario anónimo",
        edited: rating.edited
      })) || [];

      return {
        reviews,
        rating_avg: doctorProfile?.rating_avg || 0,
        rating_count: doctorProfile?.rating_count || 0
      };
    },
    enabled: !!doctorUserId,
  });
}