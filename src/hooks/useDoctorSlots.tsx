import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parse, addHours, startOfDay } from "date-fns";

export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface DoctorSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  clinic_id: string;
  clinic_name: string;
}

function generateHourlySlots(startTime: string, endTime: string): TimeSlot[] {
  try {
    const start = parse(startTime, 'HH:mm:ss', new Date());
    const end = parse(endTime, 'HH:mm:ss', new Date());
    const slots: TimeSlot[] = [];
    
    let current = start;
    while (current < end) {
      const next = addHours(current, 1);
      if (next <= end) {
        slots.push({
          start_time: format(current, 'HH:mm:ss'),
          end_time: format(next, 'HH:mm:ss'),
          is_available: true
        });
      }
      current = next;
    }
    
    return slots;
  } catch (error) {
    console.error('Error generating hourly slots:', error);
    return [];
  }
}

export function useDoctorSlots(doctorUserId: string, selectedDate: Date | undefined, clinicId?: string) {
  return useQuery({
    queryKey: ["doctor-slots", doctorUserId, selectedDate?.toISOString(), clinicId],
    queryFn: async (): Promise<DoctorSlot[]> => {
      if (!selectedDate) return [];

      // Convertir de JavaScript weekday (0=domingo, 6=sábado) a formato interno (0=lunes, 6=domingo)
      const jsDay = selectedDate.getDay();
      const internalWeekday = jsDay === 0 ? 6 : jsDay - 1;
      
      // First, get doctor's profile to get internal ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', doctorUserId)
        .single();

      if (profileError) throw profileError;

      // Get clinics for this doctor
      let clinicsQuery = supabase
        .from('clinics')
        .select('id, name, address')
        .eq('doctor_id', doctorProfile.id);

      if (clinicId) {
        clinicsQuery = clinicsQuery.eq('id', clinicId);
      }

      const { data: clinics, error: clinicsError } = await clinicsQuery;
      if (clinicsError) throw clinicsError;

      if (!clinics || clinics.length === 0) {
        return [];
      }

      const slots: DoctorSlot[] = [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // For each clinic, get availability and generate slots
      for (const clinic of clinics) {
        const { data: availability, error: availError } = await supabase
          .from('availabilities')
          .select('start_time, end_time, slot_duration_minutes')
          .eq('clinic_id', clinic.id)
          .eq('weekday', internalWeekday)
          .eq('is_active', true);

        if (availError) throw availError;

        if (availability && availability.length > 0) {
          for (const avail of availability) {
            const slotDuration = avail.slot_duration_minutes || 60;
            const hourlySlots = generateHourlySlots(avail.start_time, avail.end_time);
            
            for (const slot of hourlySlots) {
              slots.push({
                date: dateStr,
                start_time: slot.start_time,
                end_time: slot.end_time,
                available: true,
                clinic_id: clinic.id,
                clinic_name: clinic.name
              });
            }
          }
        }
      }

      // Check existing appointments for each clinic
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('starts_at, clinic_id')
        .eq('doctor_user_id', doctorUserId)
        .gte('starts_at', startOfDay(selectedDate).toISOString())
        .lt('starts_at', startOfDay(addHours(selectedDate, 24)).toISOString())
        .in('status', ['scheduled', 'completed']);

      if (apptError) throw apptError;

      // Mark occupied slots per clinic
      const occupiedSlots = new Set(
        appointments?.map(apt => {
          const time = new Date(apt.starts_at);
          return `${apt.clinic_id}-${format(time, 'HH:mm:ss')}`;
        }) || []
      );

      return slots.map(slot => ({
        ...slot,
        available: !occupiedSlots.has(`${slot.clinic_id}-${slot.start_time}`)
      }));
    },
    enabled: !!doctorUserId && !!selectedDate,
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      doctorUserId, 
      clinicId,
      date, 
      startTime, 
      patientUserId,
      notes 
    }: {
      doctorUserId: string;
      clinicId: string;
      date: string;
      startTime: string;
      patientUserId: string;
      notes?: string;
    }) => {
      // Check for conflicts first
      // Validar y asegurar formato correcto
      const normalizedStartTime = startTime.includes(':00:00') ? startTime.substring(0, 5) : 
                                  startTime.length === 5 ? startTime : `${startTime}:00`;
      
      // Crear fecha en zona horaria local (México) y convertir a UTC para guardar
      const localDate = new Date(`${date}T${normalizedStartTime}:00`);
      const appointmentDateTime = localDate.toISOString();
      
      console.log('Creating appointment with:', { date, startTime, normalizedStartTime, localDate, appointmentDateTime });
      
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_user_id', doctorUserId)
        .eq('clinic_id', clinicId)
        .eq('starts_at', appointmentDateTime)
        .in('status', ['scheduled', 'completed']);

      if (checkError) throw checkError;

      if (existingAppointments && existingAppointments.length > 0) {
        throw new Error('Este horario ya está ocupado en este consultorio');
      }

      // Create the appointment
      // Usar la fecha ya creada en zona local
      const endDateTime = new Date(localDate.getTime() + 60 * 60000); // 1 hour

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          doctor_user_id: doctorUserId,
          patient_user_id: patientUserId,
          clinic_id: clinicId,
          starts_at: localDate.toISOString(),
          ends_at: endDateTime.toISOString(),
          status: 'scheduled',
          notes: notes || null
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, appointment_id: data.id };
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ["doctor-slots", variables.doctorUserId] 
      });
    },
  });
}