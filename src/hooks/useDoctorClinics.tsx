import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DoctorClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

export function useDoctorClinics(doctorUserId: string) {
  return useQuery({
    queryKey: ["doctor-clinics", doctorUserId],
    queryFn: async (): Promise<DoctorClinic[]> => {
      if (!doctorUserId) return [];

      // First, get doctor's profile to get internal ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', doctorUserId)
        .single();

      if (profileError) throw profileError;

      // Get clinics for this doctor
      const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name, address, city, state, country')
        .eq('doctor_id', doctorProfile.id)
        .order('name');

      if (clinicsError) throw clinicsError;

      return clinics || [];
    },
    enabled: !!doctorUserId,
  });
}