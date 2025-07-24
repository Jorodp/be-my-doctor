import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  UserPlus, 
  Mail, 
  User, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Phone,
  Building
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useDoctorClinics, DoctorClinic } from '@/hooks/useDoctorClinics';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Assistant {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  profile_image_url: string | null;
  email?: string;
  created_at: string;
  clinic_name?: string;
}

interface ClinicAssistant {
  id: string;
  clinic_id: string;
  assistant_id: string;
  clinic_name: string;
  assistant: Assistant;
}

export const AssistantManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [clinicAssistants, setClinicAssistants] = useState<ClinicAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [inviting, setInviting] = useState(false);
  
  // Obtener clínicas del doctor
  const { data: clinics = [], isLoading: clinicsLoading } = useDoctorClinics(user?.id || '');

  useEffect(() => {
    if (clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id);
    }
  }, [clinics, selectedClinic]);

  useEffect(() => {
    if (user) {
      fetchClinicAssistants();
    }
  }, [user]);

  const fetchClinicAssistants = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Obtener asistentes por consultorio
      const { data: clinicAssignments, error } = await supabase
        .from('clinic_assistants')
        .select(`
          id,
          clinic_id,
          assistant_id,
          clinics!inner(name),
          profiles!clinic_assistants_assistant_id_fkey(
            id,
            user_id,
            full_name,
            phone,
            profile_image_url,
            created_at
          )
        `)
        .eq('clinics.doctor_id', user.id);

      if (error) throw error;

      // Obtener emails de auth.users para cada asistente
      const assistantsWithEmails = await Promise.all(
        (clinicAssignments || []).map(async (assignment: any) => {
          const assistant = assignment.profiles;
          if (!assistant || !assignment.clinics) return null;
          
          try {
            // Usar edge function para obtener información del usuario
            const { data: userInfo, error: userError } = await supabase.functions.invoke(
              'get-assistant-info',
              { body: { user_id: assistant.user_id } }
            );
            
            return {
              id: assignment.id,
              clinic_id: assignment.clinic_id,
              assistant_id: assignment.assistant_id,
              clinic_name: assignment.clinics.name,
              assistant: {
                ...assistant,
                email: userInfo?.email || 'Email no disponible'
              }
            };
          } catch (error) {
            console.error('Error fetching user email:', error);
            return {
              id: assignment.id,
              clinic_id: assignment.clinic_id,
              assistant_id: assignment.assistant_id,
              clinic_name: assignment.clinics.name,
              assistant: {
                ...assistant,
                email: 'Email no disponible'
              }
            };
          }
        })
      );

      // Filtrar valores nulos
      const validAssistants = assistantsWithEmails.filter(Boolean);
      setClinicAssistants(validAssistants);
    } catch (error) {
      console.error('Error fetching clinic assistants:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los asistentes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAssistant = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un email válido",
        variant: "destructive"
      });
      return;
    }

    if (!selectedClinic) {
      toast({
        title: "Error",
        description: "Por favor selecciona un consultorio",
        variant: "destructive"
      });
      return;
    }

    if (!user) return;

    try {
      setInviting(true);
      
      // Primero crear/asignar el asistente al doctor
      const { data, error } = await supabase.functions.invoke('assign-assistant-by-email', {
        body: { 
          email: inviteEmail.trim(),
          doctor_id: user.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Error de conexión con el servidor');
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Error desconocido del servidor');
      }

      // Luego asignar al consultorio específico
      const { error: clinicAssignError } = await supabase
        .from('clinic_assistants')
        .insert({
          clinic_id: selectedClinic,
          assistant_id: data.assistant_profile_id
        });

      if (clinicAssignError) {
        console.error('Error assigning to clinic:', clinicAssignError);
        // Si el asistente ya está asignado a este consultorio, está bien
        if (!clinicAssignError.message.includes('duplicate') && !clinicAssignError.message.includes('unique')) {
          throw clinicAssignError;
        }
      }

      toast({
        title: "¡Éxito!",
        description: `Asistente asignado al consultorio ${clinics.find(c => c.id === selectedClinic)?.name}`,
        variant: "default"
      });

      setInviteEmail('');
      fetchClinicAssistants();
      
    } catch (error: any) {
      console.error('Error inviting assistant:', error);
      
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el asistente",
        variant: "destructive"
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveAssistant = async (clinicAssistantId: string, clinicName: string) => {
    if (!user) return;

    try {
      // Remover la asignación del asistente desde clinic_assistants
      const { error } = await supabase
        .from('clinic_assistants')
        .delete()
        .eq('id', clinicAssistantId);

      if (error) throw error;

      toast({
        title: "Asistente removido",
        description: `El asistente ha sido removido del consultorio ${clinicName}`,
        variant: "default"
      });

      fetchClinicAssistants(); // Recargar la lista
    } catch (error) {
      console.error('Error removing assistant:', error);
      toast({
        title: "Error", 
        description: "No se pudo remover el asistente",
        variant: "destructive"
      });
    }
  };

  const handleUpdateExistingAssistant = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('update-assistant-assignment', {
        body: { 
          assistant_user_id: '04199ccf-106f-4cfa-a246-06ae065f77e6', // El ID del asistente que creamos
          doctor_id: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Perfil del asistente actualizado correctamente",
        variant: "default"
      });

      fetchClinicAssistants();
      
    } catch (error: any) {
      console.error('Error updating assistant:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el asistente",
        variant: "destructive"
      });
    }
  };

  if (loading || clinicsLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-semibold mb-2">No tienes consultorios registrados</p>
          <p className="text-muted-foreground">
            Necesitas tener al menos un consultorio para asignar asistentes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de consultorio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Seleccionar Consultorio
          </CardTitle>
          <CardDescription>
            Cada consultorio puede tener sus propios asistentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClinic} onValueChange={setSelectedClinic}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un consultorio" />
            </SelectTrigger>
            <SelectContent>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{clinic.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {clinic.address}, {clinic.city}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Formulario para agregar asistente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Asignar Nuevo Asistente
            {selectedClinic && clinics.find(c => c.id === selectedClinic) && (
              <Badge variant="outline" className="ml-2">
                {clinics.find(c => c.id === selectedClinic)?.name}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Ingresa el email del asistente para el consultorio seleccionado. Si no tiene cuenta, se creará automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleInviteAssistant}
              disabled={inviting || !inviteEmail.trim() || !selectedClinic}
            >
              {inviting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {!selectedClinic ? 'Selecciona consultorio' : 'Asignar'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de asistentes por consultorio */}
      <Card>
        <CardHeader>
          <CardTitle>Asistentes por Consultorio</CardTitle>
          <CardDescription>
            {clinicAssistants.length} asistente(s) asignado(s) a tus consultorios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clinicAssistants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4" />
              <p>No tienes asistentes asignados</p>
              <p className="text-sm mt-1">Usa el formulario de arriba para asignar un asistente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clinicAssistants.map((clinicAssistant, index) => (
                <div key={clinicAssistant.id}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={clinicAssistant.assistant.profile_image_url || ''} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h4 className="font-medium">
                          {clinicAssistant.assistant.full_name || 'Nombre no disponible'}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{clinicAssistant.assistant.email}</span>
                        </div>
                        {clinicAssistant.assistant.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{clinicAssistant.assistant.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Building className="h-3 w-3" />
                          <span>{clinicAssistant.clinic_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activo
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAssistant(clinicAssistant.id, clinicAssistant.clinic_name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {index < clinicAssistants.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">¿Cómo funciona?</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Cada consultorio puede tener sus propios asistentes independientes</li>
                <li>• Si el email ya existe en el sistema, se asignará inmediatamente al consultorio seleccionado</li>
                <li>• Si no existe, se creará una cuenta automáticamente con rol de asistente</li>
                <li>• Los asistentes pueden gestionar citas y pacientes del consultorio asignado</li>
                <li>• Pueden acceder al dashboard desde el panel de asistentes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};