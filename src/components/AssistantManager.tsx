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
  Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Assistant {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  profile_image_url: string | null;
  email?: string;
  created_at: string;
}

export const AssistantManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAssistants();
    }
  }, [user]);

  const fetchAssistants = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Obtener asistentes asignados usando la nueva estructura
      const { data: assistantAssignments, error } = await supabase
        .from('doctor_assistants')
        .select(`
          assistant_id,
          assigned_at,
          profiles!doctor_assistants_assistant_id_fkey(
            id,
            user_id,
            full_name,
            phone,
            profile_image_url,
            created_at
          )
        `)
        .eq('doctor_id', user.id);

      if (error) throw error;

      // Obtener emails de auth.users para cada asistente
      const assistantsWithEmails = await Promise.all(
        (assistantAssignments || []).map(async (assignment: any) => {
          const assistant = assignment.profiles;
          if (!assistant) return null;
          
          try {
            // Usar edge function para obtener información del usuario
            const { data: userInfo, error: userError } = await supabase.functions.invoke(
              'get-assistant-info',
              { body: { user_id: assistant.user_id } }
            );
            
            return {
              ...assistant,
              email: userInfo?.email || 'Email no disponible'
            };
          } catch (error) {
            console.error('Error fetching user email:', error);
            return {
              ...assistant,
              email: 'Email no disponible'
            };
          }
        })
      );

      // Filtrar valores nulos
      const validAssistants = assistantsWithEmails.filter(Boolean);
      setAssistants(validAssistants);
    } catch (error) {
      console.error('Error fetching assistants:', error);
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

    if (!user) return;

    try {
      setInviting(true);
      
      const { data, error } = await supabase.functions.invoke('assign-assistant-by-email', {
        body: { 
          email: inviteEmail.trim(),
          doctor_id: user.id // Este es el user_id del doctor autenticado
        }
      });

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: data.message || "Asistente asignado correctamente",
        variant: "default"
      });

      setInviteEmail('');
      fetchAssistants(); // Recargar la lista de asistentes
      
    } catch (error: any) {
      console.error('Error inviting assistant:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        context: error.context
      });
      
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el asistente",
        variant: "destructive"
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveAssistant = async (assistantId: string) => {
    if (!user) return;

    try {
      // Remover la asignación del asistente desde doctor_assistants
      const { error } = await supabase
        .from('doctor_assistants')
        .delete()
        .eq('doctor_id', user.id)
        .eq('assistant_id', assistantId);

      if (error) throw error;

      toast({
        title: "Asistente removido",
        description: "El asistente ha sido removido exitosamente",
        variant: "default"
      });

      fetchAssistants(); // Recargar la lista
    } catch (error) {
      console.error('Error removing assistant:', error);
      toast({
        title: "Error", 
        description: "No se pudo remover el asistente",
        variant: "destructive"
      });
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
      {/* Formulario para agregar asistente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Asignar Nuevo Asistente
          </CardTitle>
          <CardDescription>
            Ingresa el email del asistente. Si no tiene cuenta, se creará automáticamente.
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
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Asignar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de asistentes */}
      <Card>
        <CardHeader>
          <CardTitle>Asistentes Asignados</CardTitle>
          <CardDescription>
            {assistants.length} asistente(s) asignado(s) a tu consulta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assistants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4" />
              <p>No tienes asistentes asignados</p>
              <p className="text-sm mt-1">Usa el formulario de arriba para asignar un asistente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assistants.map((assistant, index) => (
                <div key={assistant.id}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={assistant.profile_image_url || ''} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h4 className="font-medium">
                          {assistant.full_name || 'Nombre no disponible'}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{assistant.email}</span>
                        </div>
                        {assistant.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{assistant.phone}</span>
                          </div>
                        )}
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
                        onClick={() => handleRemoveAssistant(assistant.user_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {index < assistants.length - 1 && <Separator className="my-4" />}
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
                <li>• Si el email ya existe en el sistema, se asignará inmediatamente como tu asistente</li>
                <li>• Si no existe, se creará una cuenta automáticamente con rol de asistente</li>
                <li>• Los asistentes pueden gestionar citas y pacientes asignados a ti</li>
                <li>• Pueden acceder al dashboard desde el panel de asistentes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};