import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  UserMinus, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Trash2
} from 'lucide-react';

interface AssistantInfo {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  assigned_doctor_id: string;
}

interface AssistantManagerProps {
  doctorUserId: string;
}

export const AssistantManager = ({ doctorUserId }: AssistantManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentAssistant, setCurrentAssistant] = useState<AssistantInfo | null>(null);
  const [newAssistantEmail, setNewAssistantEmail] = useState('');
  const [fetchingAssistant, setFetchingAssistant] = useState(true);

  useEffect(() => {
    fetchCurrentAssistant();
  }, [doctorUserId]);

  const fetchCurrentAssistant = async () => {
    try {
      setFetchingAssistant(true);
      
      // Get current assistant profile
      const { data: assistantProfile, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, assigned_doctor_id')
        .eq('assigned_doctor_id', doctorUserId)
        .eq('role', 'assistant')
        .maybeSingle();

      if (error) {
        console.error('Error fetching assistant:', error);
        return;
      }

      if (assistantProfile) {
        // Get the email from auth users
        const { data: userAuth } = await supabase.auth.admin.getUserById(assistantProfile.user_id);
        
        setCurrentAssistant({
          ...assistantProfile,
          email: userAuth.user?.email || ''
        });
      } else {
        setCurrentAssistant(null);
      }
    } catch (error) {
      console.error('Error in fetchCurrentAssistant:', error);
    } finally {
      setFetchingAssistant(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const assignAssistant = async () => {
    if (!newAssistantEmail.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un correo electrónico",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(newAssistantEmail)) {
      toast({
        title: "Error",
        description: "Por favor ingresa un correo electrónico válido",
        variant: "destructive",
      });
      return;
    }

    // If there's already an assistant, confirm replacement
    if (currentAssistant) {
      const confirmed = window.confirm(
        `¿Estás seguro de que quieres reemplazar a tu asistente actual (${currentAssistant.email}) con ${newAssistantEmail}?\n\nEl asistente anterior perderá acceso inmediatamente.`
      );
      
      if (!confirmed) {
        return;
      }
    }

    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast({
          title: "Error de autenticación",
          description: "Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        });
        return;
      }

      console.log('Assigning assistant:', newAssistantEmail);
      
      const { data, error } = await supabase.functions.invoke('assign-assistant-by-email', {
        body: { assistantEmail: newAssistantEmail.toLowerCase().trim() },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw new Error(error.message || 'Error al asignar el asistente');
      }

      console.log('Assignment response:', data);

      toast({
        title: "¡Éxito!",
        description: data.message,
        duration: 5000,
      });

      // Clear the input and refresh the current assistant
      setNewAssistantEmail('');
      await fetchCurrentAssistant();

    } catch (error: any) {
      console.error('Error assigning assistant:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el asistente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeAssistant = async () => {
    if (!currentAssistant) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres remover a ${currentAssistant.email} como tu asistente?\n\nEsta acción no se puede deshacer y el asistente perderá acceso inmediatamente.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      // Remove assistant assignment
      const { error } = await supabase
        .from('profiles')
        .update({ assigned_doctor_id: null })
        .eq('user_id', currentAssistant.user_id);

      if (error) {
        throw error;
      }

      toast({
        title: "Asistente removido",
        description: "El asistente ha sido removido correctamente",
      });

      await fetchCurrentAssistant();
    } catch (error: any) {
      console.error('Error removing assistant:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el asistente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingAssistant) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Assistant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mi Asistente
          </CardTitle>
          <CardDescription>
            Gestiona tu asistente médico asignado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentAssistant ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {currentAssistant.full_name || 'Asistente'}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {currentAssistant.email}
                    </p>
                    {currentAssistant.phone && (
                      <p className="text-sm text-muted-foreground">
                        Tel: {currentAssistant.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeAssistant}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tu asistente actual puede gestionar tus citas y acceder al historial de tus pacientes.
                  Si asignas un nuevo asistente, el anterior perderá acceso inmediatamente.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No tienes un asistente asignado actualmente. Puedes asignar uno usando su correo electrónico.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Assign New Assistant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {currentAssistant ? 'Cambiar Asistente' : 'Asignar Asistente'}
          </CardTitle>
          <CardDescription>
            Ingresa el correo electrónico del asistente que deseas asignar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assistant-email">Correo Electrónico del Asistente</Label>
            <Input
              id="assistant-email"
              type="email"
              placeholder="asistente@ejemplo.com"
              value={newAssistantEmail}
              onChange={(e) => setNewAssistantEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>¿Qué sucede al asignar un asistente?</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Si el correo ya existe como asistente, se asigna inmediatamente</li>
                  <li>• Si es un correo nuevo, se crea la cuenta y se envía una invitación</li>
                  <li>• El asistente podrá gestionar tus citas y ver el historial de tus pacientes</li>
                  <li>• Solo puedes tener un asistente activo a la vez</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={assignAssistant}
              disabled={loading || !newAssistantEmail.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Procesando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {currentAssistant ? 'Cambiar Asistente' : 'Asignar Asistente'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};