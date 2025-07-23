import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PatientAppointment {
  id: string;
  doctor_user_id: string;
  doctor_name: string;
  specialty: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number | null;
  notes: string | null;
  clinic_name?: string;
  clinic_address?: string;
}

interface AppointmentDetail {
  id: string;
  doctor_user_id: string;
  doctor_name: string;
  specialty: string;
  starts_at: string;
  ends_at: string;
  status: string;
  consultation_status: string;
  price: number | null;
  notes: string | null;
  prescription?: string;
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
}

export const usePatientAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getPatientAppointments = async (patientUserId: string): Promise<PatientAppointment[]> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('patient_get_appointments', {
        p_patient_user_id: patientUserId
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

  const getAppointmentDetail = async (patientUserId: string, appointmentId: string): Promise<AppointmentDetail | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('patient_get_appointment_detail', {
        p_patient_user_id: patientUserId,
        p_appointment_id: appointmentId
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar el detalle de la cita',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getPatientAppointments,
    getAppointmentDetail
  };
};