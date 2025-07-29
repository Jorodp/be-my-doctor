import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UnifiedAvailability {
  id: string;
  clinic_id: string;
  clinic_name: string;
  clinic_address: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  slot_duration_minutes: number;
}

export interface UnifiedTimeSlot {
  clinic_id: string;
  clinic_name: string;
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  is_today: boolean;
}

// Hook unificado para obtener disponibilidad de un doctor (funciona para doctores, asistentes y pacientes)
export function useUnifiedDoctorAvailability(doctorUserId: string) {
  return useQuery({
    queryKey: ["unified-doctor-availability", doctorUserId],
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

      // Create a map of weekdays that have availability (JavaScript format: 0=domingo, 6=sábado)
      const availabilityMap: { [key: number]: boolean } = {};
      availabilities?.forEach(avail => {
        // Convertir de formato interno (0=lunes, 6=domingo) a JavaScript (0=domingo, 6=sábado)
        const jsWeekday = avail.weekday === 6 ? 0 : avail.weekday + 1;
        availabilityMap[jsWeekday] = true;
      });

      return availabilityMap;
    },
    enabled: !!doctorUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook unificado para gestionar horarios de un doctor específico
export function useUnifiedScheduleManagement(doctorUserId: string, selectedClinic?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const availabilityQuery = useQuery({
    queryKey: ["unified-schedule", doctorUserId, selectedClinic],
    queryFn: async (): Promise<UnifiedAvailability[]> => {
      if (!doctorUserId) return [];

      // Get doctor's profile to get internal ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', doctorUserId)
        .single();

      if (profileError) throw profileError;

      // Build query for clinics
      let clinicsQuery = supabase
        .from('clinics')
        .select('id, name, address')
        .eq('doctor_id', doctorProfile.id);

      if (selectedClinic) {
        clinicsQuery = clinicsQuery.eq('id', selectedClinic);
      }

      const { data: clinics, error: clinicsError } = await clinicsQuery;
      if (clinicsError) throw clinicsError;

      if (!clinics || clinics.length === 0) return [];

      const clinicIds = clinics.map(c => c.id);

      // Get availabilities for selected clinics
      const { data: availabilities, error: availError } = await supabase
        .from('availabilities')
        .select('*')
        .in('clinic_id', clinicIds)
        .order('weekday')
        .order('start_time');

      if (availError) throw availError;

      // Combine data
      return (availabilities || []).map(avail => {
        const clinic = clinics.find(c => c.id === avail.clinic_id);
        return {
          ...avail,
          clinic_name: clinic?.name || 'Consultorio',
          clinic_address: clinic?.address || '',
          slot_duration_minutes: avail.slot_duration_minutes || 60
        };
      });
    },
    enabled: !!doctorUserId,
  });

  const addAvailabilityMutation = useMutation({
    mutationFn: async ({ 
      clinicId, 
      weekday, 
      startTime, 
      endTime 
    }: {
      clinicId: string;
      weekday: number;
      startTime: string;
      endTime: string;
    }) => {
      const { data, error } = await supabase
        .from('availabilities')
        .insert({
          clinic_id: clinicId,
          weekday,
          start_time: startTime,
          end_time: endTime,
          is_active: true,
          slot_duration_minutes: 60
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["unified-schedule", doctorUserId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["unified-doctor-availability", doctorUserId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["doctor-slots", doctorUserId] 
      });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ availabilityId, isActive }: { availabilityId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('availabilities')
        .update({ is_active: !isActive })
        .eq('id', availabilityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["unified-schedule", doctorUserId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["unified-doctor-availability", doctorUserId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["doctor-slots", doctorUserId] 
      });
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (availabilityId: string) => {
      const { error } = await supabase
        .from('availabilities')
        .delete()
        .eq('id', availabilityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["unified-schedule", doctorUserId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["unified-doctor-availability", doctorUserId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["doctor-slots", doctorUserId] 
      });
    },
  });

  return {
    availabilities: availabilityQuery.data || [],
    isLoading: availabilityQuery.isLoading,
    error: availabilityQuery.error,
    addAvailability: addAvailabilityMutation.mutateAsync,
    toggleAvailability: toggleAvailabilityMutation.mutateAsync,
    deleteAvailability: deleteAvailabilityMutation.mutateAsync,
    isAddingAvailability: addAvailabilityMutation.isPending,
    isTogglingAvailability: toggleAvailabilityMutation.isPending,
    isDeletingAvailability: deleteAvailabilityMutation.isPending,
  };
}

// Hook unificado para obtener slots disponibles (reemplaza useDoctorSlots)
export function useUnifiedDoctorSlots(doctorUserId: string, selectedDate?: Date, clinicId?: string) {
  return useQuery({
    queryKey: ["unified-doctor-slots", doctorUserId, selectedDate?.toISOString(), clinicId],
    queryFn: async (): Promise<UnifiedTimeSlot[]> => {
      if (!selectedDate || !doctorUserId) return [];

      // Use the new Supabase function for generating slots
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Get doctor's internal ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', doctorUserId)
        .single();

      if (profileError) throw profileError;

      // Call the database function to get slots
      const { data: slots, error } = await supabase
        .rpc('get_public_doctor_slots', {
          p_doctor_internal_id: doctorProfile.id,
          p_from: dateStr,
          p_to: dateStr,
          p_timezone: 'America/Mexico_City'
        });

      if (error) throw error;

      // Get clinic information
      const clinicIds = [...new Set(slots?.map((s: any) => s.out_clinic_id) || [])];
      const { data: clinics } = await supabase
        .from('clinics')
        .select('id, name')
        .in('id', clinicIds);

      const clinicMap = new Map(clinics?.map(c => [c.id, c.name]) || []);

      const today = new Date().toISOString().split('T')[0];
      const isToday = dateStr === today;

      // Format slots for frontend
      const formattedSlots: UnifiedTimeSlot[] = (slots || [])
        .filter((slot: any) => !clinicId || slot.out_clinic_id === clinicId)
        .map((slot: any) => ({
          clinic_id: slot.out_clinic_id,
          clinic_name: clinicMap.get(slot.out_clinic_id) || 'Consultorio',
          date: dateStr,
          start_time: slot.out_slot_start_local.split(' ')[1].substring(0, 5), // Extract HH:mm
          end_time: slot.out_slot_end_local.split(' ')[1].substring(0, 5), // Extract HH:mm
          available: true, // The function already filters available slots
          is_today: isToday
        }));

      return formattedSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    },
    enabled: !!doctorUserId && !!selectedDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}