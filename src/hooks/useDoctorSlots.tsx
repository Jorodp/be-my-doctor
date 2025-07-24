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

export function useDoctorSlots(doctorUserId: string, selectedDate: Date | undefined) {
  return useQuery({
    queryKey: ["doctor-slots", doctorUserId, selectedDate?.toISOString()],
    queryFn: async (): Promise<DoctorSlot[]> => {
      if (!selectedDate) return [];

      const dayOfWeek = selectedDate.getDay();
      
      // Obtener disponibilidad base del doctor
      const { data: availability, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_user_id', doctorUserId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (error) throw error;

      if (!availability || availability.length === 0) {
        return [];
      }

      // Generar slots de 1 hora para cada período de disponibilidad
      const slots: DoctorSlot[] = [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      for (const avail of availability) {
        const hourlySlots = generateHourlySlots(avail.start_time, avail.end_time);
        
        for (const slot of hourlySlots) {
          slots.push({
            date: dateStr,
            start_time: slot.start_time,
            end_time: slot.end_time,
            available: true
          });
        }
      }

      // Verificar citas existentes para marcar slots como no disponibles
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('starts_at')
        .eq('doctor_user_id', doctorUserId)
        .gte('starts_at', startOfDay(selectedDate).toISOString())
        .lt('starts_at', startOfDay(addHours(selectedDate, 24)).toISOString())
        .in('status', ['scheduled', 'completed']);

      if (apptError) throw apptError;

      // Marcar slots ocupados
      const occupiedTimes = new Set(
        appointments?.map(apt => {
          const time = new Date(apt.starts_at);
          return format(time, 'HH:mm:ss');
        }) || []
      );

      return slots.map(slot => ({
        ...slot,
        available: !occupiedTimes.has(slot.start_time)
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
      date, 
      startTime, 
      patientUserId,
      notes 
    }: {
      doctorUserId: string;
      date: string;
      startTime: string;
      patientUserId: string;
      notes?: string;
    }) => {
      // Aquí iría la lógica para crear la cita
      // Por ahora solo simulo la creación
      const appointmentData = {
        doctor_user_id: doctorUserId,
        patient_user_id: patientUserId,
        starts_at: `${date}T${startTime}`,
        status: 'scheduled',
        notes: notes || ''
      };

      console.log('Booking appointment:', appointmentData);
      
      // Simulamos una respuesta exitosa
      return { success: true, appointment_id: 'temp-id' };
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ["doctor-slots", variables.doctorUserId] 
      });
    },
  });
}