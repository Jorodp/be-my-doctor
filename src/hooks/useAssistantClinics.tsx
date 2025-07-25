import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AssistantClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  consultation_fee?: number;
}

export function useAssistantClinics() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["assistant-clinics", user?.id],
    queryFn: async (): Promise<AssistantClinic[]> => {
      if (!user?.id) return [];

      // Get assistant's profile to get internal ID
      const { data: assistantProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Get clinics assigned to this assistant through clinic_assistants
      const { data: clinicAssignments, error: clinicsError } = await supabase
        .from('clinic_assistants')
        .select(`
          clinic_id,
          clinics!inner (
            id,
            name,
            address,
            city,
            state,
            country,
            consultation_fee
          )
        `)
        .eq('assistant_id', assistantProfile.id);

      if (clinicsError) throw clinicsError;

      // Extract clinic data from the join
      const clinicData: AssistantClinic[] = clinicAssignments?.map((item: any) => ({
        id: item.clinics.id,
        name: item.clinics.name,
        address: item.clinics.address,
        city: item.clinics.city,
        state: item.clinics.state,
        country: item.clinics.country,
        consultation_fee: item.clinics.consultation_fee
      })) || [];
      
      return clinicData.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user?.id,
  });
}