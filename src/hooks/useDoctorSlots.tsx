import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parse, addHours, startOfDay } from "date-fns";
import { 
  dayjs, 
  convertUTCToMexicoTZ, 
  convertMexicoTZToUTC, 
  createMexicoTZDate,
  MEXICO_TIMEZONE 
} from "@/utils/dayjsConfig";

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
      // Usar dayjs para manejar correctamente la zona horaria
      const selectedDateMX = dayjs.tz(selectedDate, MEXICO_TIMEZONE);
      const jsDay = selectedDateMX.day();
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
      // Usar dayjs para formatear la fecha en zona horaria de México
      const dateStr = selectedDateMX.format('YYYY-MM-DD');

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

      // Check existing appointments for each clinic usando zona horaria México
      const startOfDayMX = selectedDateMX.startOf('day');
      const endOfDayMX = selectedDateMX.endOf('day');

      // Fetch appointments to mark occupied slots. If the table doesn't exist or access is denied,
      // we gracefully continue without blocking (so patients still see available hours).
      let appointments: { starts_at: string; clinic_id: string }[] = [];
      try {
        const { data: appts, error: apptError } = await supabase
          .schema('appointments')
          .from('appointments')
          .select('starts_at, clinic_id')
          .eq('doctor_user_id', doctorUserId)
          .gte('starts_at', startOfDayMX.utc().toISOString())
          .lt('starts_at', endOfDayMX.utc().toISOString())
          .in('status', ['scheduled', 'completed']);

        if (apptError) {
          // Ignore if relation doesn't exist (42P01) or any RLS/permission error
          // to avoid blocking slot visibility.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const code = (apptError as any)?.code;
          if (code !== '42P01') {
            // Log non-table-missing errors securely
            // We import logger dynamically to avoid circular deps if any
            try {
              const { default: logger } = await import('@/lib/logger');
              logger.warn('Appointments fetch error (non-fatal)', { code, message: apptError.message });
            } catch {}
          }
        } else {
          appointments = appts || [];
        }
      } catch (e: any) {
        try {
          const { default: logger } = await import('@/lib/logger');
          logger.warn('Appointments fetch failed (ignored)', { message: e?.message });
        } catch {}
      }

      // Mark occupied slots per clinic usando zona horaria correcta
      const occupiedSlots = new Set(
        appointments?.map(apt => {
          // Convertir la fecha UTC a zona horaria de México
          const appointmentTimeMX = convertUTCToMexicoTZ(apt.starts_at);
          return `${apt.clinic_id}-${appointmentTimeMX.format('HH:mm:ss')}`;
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
      // Normalizar hora de inicio
      const normalizedStartTime = startTime.includes(':00:00') ? startTime.substring(0, 5) : 
                                  startTime.length === 5 ? startTime : `${startTime}:00`;
      
      // Construir fecha/hora en zona MX y convertir a UTC
      const localDateTimeMX = createMexicoTZDate(date, normalizedStartTime);
      const slotStartUTC = localDateTimeMX.utc().toISOString();

      console.log('Booking via RPC book_slot_v2()', {
        date,
        startTime,
        normalizedStartTime,
        localDateTimeMX: localDateTimeMX.format(),
        slotStartUTC,
        clinicId,
        doctorUserId,
      });

      // Obtener ID interno del doctor (profiles.id) requerido por la función
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', doctorUserId)
        .single();

      if (profileError) throw profileError;

      // Reservar usando RPC con seguridad en el backend (evita depender de la tabla pública)
      const { data: booked, error: rpcError } = await supabase
        .rpc('book_slot_v2', {
          p_doctor_internal_id: doctorProfile.id,
          p_clinic_id: clinicId,
          p_slot_start: slotStartUTC,
          p_patient_user_id: patientUserId,
          p_created_by: patientUserId,
          p_notes: notes ?? null,
        })
        .maybeSingle();

      if (rpcError) throw rpcError;
      if (!booked) throw new Error('No se pudo crear la cita.');

      return { success: true, appointment_id: (booked as any).out_appointment_id };
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ["doctor-slots", variables.doctorUserId] 
      });
    },
  });
}