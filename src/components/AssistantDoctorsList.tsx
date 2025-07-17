import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Stethoscope, 
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface DoctorAssignment {
  id: string;
  doctor_id: string;
  assigned_at: string;
  doctor_profile: {
    user_id: string;
    full_name: string | null;
    phone: string | null;
    profile_image_url: string | null;
    specialty: string;
    consultation_fee: number | null;
    office_address: string | null;
    verification_status: string;
  };
  doctor_email?: string;
}

export const AssistantDoctorsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [assignments, setAssignments] = useState<DoctorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDoctorAssignments();
    }
  }, [user]);

  const fetchDoctorAssignments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Obtener doctores asignados a este asistente
      const { data: doctorAssignments, error } = await supabase
        .from('doctor_assistants')
        .select(`
          id,
          doctor_id,
          assigned_at,
          profiles:doctor_id (
            user_id,
            full_name,
            phone,
            profile_image_url
          )
        `)
        .eq('assistant_id', user.id);

      if (error) throw error;

      // Obtener perfiles de doctor y emails para cada asignación
      const assignmentsWithDetails = await Promise.all(
        (doctorAssignments || []).map(async (assignment: any) => {
          const doctorProfile = assignment.profiles;
          if (!doctorProfile) return null;

          try {
            // Obtener perfil de doctor
            const { data: doctorDetails, error: doctorError } = await supabase
              .from('doctor_profiles')
              .select(`
                specialty,
                consultation_fee,
                office_address,
                verification_status
              `)
              .eq('user_id', doctorProfile.user_id)
              .single();

            // Obtener email del doctor
            const { data: userInfo, error: userError } = await supabase.functions.invoke(
              'get-assistant-info',
              { body: { user_id: doctorProfile.user_id } }
            );

            return {
              ...assignment,
              doctor_profile: {
                ...doctorProfile,
                ...(doctorDetails || {}),
              },
              doctor_email: userInfo?.email || 'Email no disponible'
            };
          } catch (error) {
            console.error('Error fetching doctor details:', error);
            return {
              ...assignment,
              doctor_profile: doctorProfile,
              doctor_email: 'Email no disponible'
            };
          }
        })
      );

      // Filtrar valores nulos
      const validAssignments = assignmentsWithDetails.filter(Boolean);
      setAssignments(validAssignments);
    } catch (error) {
      console.error('Error fetching doctor assignments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los doctores asignados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Doctores Asignados
          </CardTitle>
          <CardDescription>
            Doctores para los cuales puedes gestionar citas y pacientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4" />
              <p>No tienes doctores asignados</p>
              <p className="text-sm mt-1">Contacta al administrador para que te asignen a un doctor</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <Card 
                  key={assignment.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedDoctor === assignment.doctor_id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedDoctor(assignment.doctor_id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={assignment.doctor_profile.profile_image_url || ''} />
                        <AvatarFallback>
                          <Stethoscope className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {assignment.doctor_profile.full_name || 'Nombre no disponible'}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {assignment.doctor_profile.specialty || 'Especialidad no especificada'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {assignment.doctor_email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{assignment.doctor_email}</span>
                        </div>
                      )}
                      
                      {assignment.doctor_profile.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{assignment.doctor_profile.phone}</span>
                        </div>
                      )}
                      
                      {assignment.doctor_profile.office_address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{assignment.doctor_profile.office_address}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>Asignado el {new Date(assignment.assigned_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <Badge 
                        variant={assignment.doctor_profile.verification_status === 'verified' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {assignment.doctor_profile.verification_status === 'verified' ? 'Verificado' : 'Pendiente'}
                      </Badge>
                      
                      {assignment.doctor_profile.consultation_fee && (
                        <span className="text-sm font-medium text-primary">
                          ${assignment.doctor_profile.consultation_fee} MXN
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Navegar a la agenda del doctor
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Ver Agenda
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};