import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  patient_user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  consultation_status?: string;
  price: number | null;
  notes: string | null;
  patient_name?: string;
}

interface PatientSummary {
  patient_user_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  address?: string;
  recent_appointments_count: number;
  last_appointment_date?: string;
}

export const useDoctorAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getDoctorAppointments = async (doctorUserId: string, date?: string): Promise<Appointment[]> => {
    try {
      setLoading(true);
      
      // Usar RPC para obtener citas del doctor
      const { data, error } = await supabase.rpc('admin_get_doctor_appointments', {
        doctor_user_id: doctorUserId,
        target_date: date || new Date().toISOString().split('T')[0]
      });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las citas',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPatientSummary = async (patientUserId: string): Promise<PatientSummary | null> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_patient_summary', {
        p_patient_user_id: patientUserId
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar el resumen del paciente',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addConsultationNote = async (appointmentId: string, notes: string, price?: number): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('add_consultation_note', {
        appointment_id: appointmentId,
        notes: notes,
        price: price || null
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Éxito',
        description: 'Nota de consulta agregada correctamente'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar la nota de consulta',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeAppointment = async (appointmentId: string): Promise<void> => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          consultation_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Éxito',
        description: 'Cita marcada como completada'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo completar la cita',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Obtener citas para múltiples fechas (para calendario)
  const getAppointmentsByDateRange = async (
    doctorUserId: string, 
    startDate: string, 
    endDate: string
  ): Promise<{ [date: string]: Appointment[] }> => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_user_id,
          starts_at,
          ends_at,
          status,
          consultation_status,
          price,
          notes
        `)
        .eq('doctor_user_id', doctorUserId)
        .gte('starts_at', startDate)
        .lte('starts_at', endDate)
        .order('starts_at');

      if (error) {
        throw new Error(error.message);
      }

      // Agrupar por fecha
      const appointmentsByDate: { [date: string]: Appointment[] } = {};
      
      data?.forEach((appointment) => {
        const date = new Date(appointment.starts_at).toISOString().split('T')[0];
        if (!appointmentsByDate[date]) {
          appointmentsByDate[date] = [];
        }
        appointmentsByDate[date].push(appointment);
      });

      return appointmentsByDate;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar las citas del calendario',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getDoctorAppointments,
    getPatientSummary,
    addConsultationNote,
    completeAppointment,
    getAppointmentsByDateRange
  };
};