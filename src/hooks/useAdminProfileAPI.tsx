import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DoctorListItem {
  id: string;
  user_id: string;
  full_name: string;
  specialty: string;
  verification_status: string;
  subscription_status: string;
  upcoming_appointments: number;
  past_appointments: number;
}

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  professional_license: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  office_address: string | null;
  office_phone: string | null;
  practice_locations: string[] | null;
  consultorios: any[] | null;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
}

interface Appointment {
  appointment_id: string;
  patient_user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number | null;
  notes: string | null;
}

interface SubscriptionHistory {
  doctor_profile_id: string;
  status: string;
  expires_at: string;
  admin_id: string;
  changed_at: string;
}

export const useAdminProfileAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callAdminAPI = async (action: string, payload: any = {}) => {
    const { data, error } = await supabase.functions.invoke('admin-profile-management', {
      body: { action, ...payload },
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });

    if (error) {
      throw new Error(error.message || 'Error en la API de administración');
    }

    if (!data.success) {
      throw new Error(data.error || 'Error desconocido');
    }

    return data;
  };

  const listDoctors = async (): Promise<DoctorListItem[]> => {
    try {
      setLoading(true);
      const response = await callAdminAPI('list-doctors');
      return response.doctors || [];
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar los doctores',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getDoctorProfile = async (userId: string): Promise<{ profile: UserProfile; doctorProfile: DoctorProfile }> => {
    try {
      setLoading(true);
      const response = await callAdminAPI('get-profile', { userId });
      return {
        profile: response.profile,
        doctorProfile: response.doctorProfile
      };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar el perfil del doctor',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateDoctorProfile = async (userId: string, profileData: any): Promise<void> => {
    try {
      setLoading(true);
      await callAdminAPI('update-doctor-profile', { userId, profileData });
      toast({
        title: 'Éxito',
        description: 'Perfil de doctor actualizado correctamente'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el perfil',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (userId: string, profileData: any): Promise<void> => {
    try {
      setLoading(true);
      await callAdminAPI('update-profile', { userId, profileData });
      toast({
        title: 'Éxito',
        description: 'Perfil de usuario actualizado correctamente'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el perfil',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getDoctorAppointments = async (doctorUserId: string): Promise<Appointment[]> => {
    try {
      setLoading(true);
      const response = await callAdminAPI('get-doctor-appointments', { doctorUserId });
      return response.appointments || [];
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

  const getSubscriptionHistory = async (doctorProfileId: string): Promise<SubscriptionHistory[]> => {
    try {
      setLoading(true);
      const response = await callAdminAPI('get-subscription-history', { doctorProfileId });
      return response.history || [];
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar el historial de suscripción',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (doctorProfileId: string, status: string, expiresAt?: string): Promise<void> => {
    try {
      setLoading(true);
      await callAdminAPI('update-subscription-status', { 
        doctorProfileId, 
        status, 
        expiresAt 
      });
      toast({
        title: 'Éxito',
        description: 'Estado de suscripción actualizado correctamente'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la suscripción',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyDoctorDocuments = async (doctorId: string, adminId: string): Promise<void> => {
    try {
      setLoading(true);
      await callAdminAPI('verify-documents', { doctorId, adminId });
      toast({
        title: 'Éxito',
        description: 'Documentos del doctor verificados correctamente'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron verificar los documentos',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    listDoctors,
    getDoctorProfile,
    updateDoctorProfile,
    updateUserProfile,
    getDoctorAppointments,
    getSubscriptionHistory,
    updateSubscriptionStatus,
    verifyDoctorDocuments
  };
};