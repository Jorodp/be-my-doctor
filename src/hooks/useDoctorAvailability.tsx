import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDoctorAvailability(doctorUserId: string) {
  return useQuery({
    queryKey: ["doctor-availability", doctorUserId],
    queryFn: async (): Promise<{ [key: number]: boolean }> => {
      if (!doctorUserId) return {};

      // Get doctor's profile to get internal ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', doctorUserId)
        .single();

      if (profileError) throw profileError;

      // Get all clinics for this doctor
      const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id')
        .eq('doctor_id', doctorProfile.id);

      if (clinicsError) throw clinicsError;

      if (!clinics || clinics.length === 0) {
        return {};
      }

      const clinicIds = clinics.map(c => c.id);

      // Get all availabilities for this doctor's clinics
      const { data: availabilities, error: availError } = await supabase
        .from('availabilities')
        .select('weekday')
        .in('clinic_id', clinicIds)
        .eq('is_active', true);

      if (availError) throw availError;

      // Create a map of weekdays that have availability
      const availabilityMap: { [key: number]: boolean } = {};
      availabilities?.forEach(avail => {
        availabilityMap[avail.weekday] = true;
      });

      return availabilityMap;
    },
    enabled: !!doctorUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}