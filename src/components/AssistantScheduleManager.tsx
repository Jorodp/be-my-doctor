import React, { useState, useEffect } from "react";
import { UnifiedScheduleManager } from "@/components/UnifiedScheduleManager";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAssistantClinics } from "@/hooks/useAssistantClinics";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Building } from "lucide-react";

interface AssistantScheduleManagerProps {
  doctorId?: string;
}

export function AssistantScheduleManager({ doctorId }: AssistantScheduleManagerProps) {
  const { user } = useAuth();
  const [assistantDoctorId, setAssistantDoctorId] = useState<string | null>(null);
  const { data: clinics = [], isLoading: clinicsLoading } = useAssistantClinics();

  // Función para obtener el doctor asignado al asistente
  const fetchAssignedDoctorId = async () => {
    if (!user) return;

    try {
      // Primero intentar desde clinic_assistants
      const { data: clinicAssignments } = await supabase
        .from('clinic_assistants')
        .select(`
          clinic_id,
          clinics!inner (
            doctor_id,
            profiles!inner (
              user_id
            )
          )
        `)
        .eq('assistant_id', user.id)
        .limit(1);

      if (clinicAssignments && clinicAssignments.length > 0) {
        const doctorUserId = (clinicAssignments[0] as any).clinics.profiles.user_id;
        setAssistantDoctorId(doctorUserId);
        return;
      }

      // Si no encontramos en clinic_assistants, intentar desde el perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('assigned_doctor_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.assigned_doctor_id) {
        setAssistantDoctorId(profile.assigned_doctor_id);
        return;
      }

      // Si no encontramos, intentar desde doctor_assistants
      const { data: doctorAssignment } = await supabase
        .from('doctor_assistants')
        .select('doctor_id')
        .eq('assistant_id', user.id)
        .limit(1);

      if (doctorAssignment && doctorAssignment.length > 0) {
        setAssistantDoctorId(doctorAssignment[0].doctor_id);
      }
    } catch (error) {
      console.error('Error fetching assigned doctor:', error);
    }
  };

  // Cargar el doctor asignado al montar el componente
  useEffect(() => {
    fetchAssignedDoctorId();
  }, [user]);

  if (clinicsLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-semibold mb-2">Sin consultorios asignados</p>
          <p className="text-muted-foreground">
            No tienes consultorios asignados para gestionar.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Usar el doctorId pasado como prop o el asignado al asistente
  const finalDoctorId = doctorId || assistantDoctorId;

  if (!finalDoctorId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-semibold mb-2">Doctor no asignado</p>
          <p className="text-muted-foreground">
            No se ha encontrado un doctor asignado para gestionar la agenda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <UnifiedScheduleManager
      doctorId={finalDoctorId}
      title="Gestión de Agenda del Doctor"
      description="Administra los horarios de consulta. Los cambios se sincronizan automáticamente con el doctor y son visibles para los pacientes."
      readOnly={false}
    />
  );
}