import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    console.log('ResetPassword mounted');
    console.log('Token:', token);
    console.log('Type:', type);
    console.log('Search params:', searchParams.toString());
    console.log('Full URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    
    // Parse hash fragment for Supabase tokens
    const parseHashParams = () => {
      const hash = window.location.hash.substring(1); // Remove the #
      const params = new URLSearchParams(hash);
      return {
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token'),
        type: params.get('type'),
        error: params.get('error'),
        error_description: params.get('error_description')
      };
    };

    const handlePasswordReset = async () => {
      try {
        // First check if we have tokens in the hash (from email link)
        const hashParams = parseHashParams();
        console.log('Hash params:', hashParams);
        
        if (hashParams.error) {
          console.error('Auth error from hash:', hashParams.error, hashParams.error_description);
          toast({
            variant: "destructive",
            title: "Error de autenticación",
            description: hashParams.error_description || "Error en el enlace de recuperación."
          });
          navigate('/auth');
          return;
        }

        if (hashParams.access_token && hashParams.type === 'recovery') {
          console.log('Recovery tokens found in hash, setting session');
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: hashParams.access_token,
            refresh_token: hashParams.refresh_token || ''
          });
          
          if (error) {
            console.error('Error setting session:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "No se pudo validar el enlace de recuperación."
            });
            navigate('/auth');
            return;
          }
          
          console.log('Session set successfully:', data.session);
          // Clean the URL hash after successful session setup
          window.history.replaceState(null, '', '/reset-password');
          return;
        }

        // Check if we already have a valid session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Current session:', session);
        
        if (session) {
          console.log('User is authenticated, ready to reset password');
          return;
        }

        // If no session and no valid tokens in URL
        if (!hashParams.access_token && !token && !type) {
          console.log('No valid recovery data found');
          toast({
            variant: "destructive",
            title: "Enlace inválido",
            description: "Este enlace de recuperación no es válido o ha expirado."
          });
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error in password reset flow:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Hubo un problema al procesar el enlace de recuperación."
        });
        navigate('/auth');
      }
    };

    handlePasswordReset();
  }, [token, type, navigate, toast, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas no coinciden."
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres."
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido restablecida exitosamente."
      });

      // Redirigir después de 3 segundos
      setTimeout(() => {
        navigate('/auth');
      }, 3000);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo restablecer la contraseña. Intenta de nuevo."
      });
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Navigation Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="font-medium">Volver al inicio</span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <img src="/lovable-uploads/2176a5eb-dd8e-4ff9-8a38-3cfe98feb63a.png" alt="Be My Doctor" className="h-8 w-auto" />
                <span className="font-bold text-lg text-primary">Be My Doctor</span>
              </div>
            </div>
          </div>
        </header>

        {/* Success Content */}
        <div className="flex-1 flex items-center justify-center bg-gradient-section px-4 py-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-600">¡Contraseña actualizada!</CardTitle>
              <CardDescription>
                Tu contraseña ha sido restablecida exitosamente. Serás redirigido al inicio de sesión en unos segundos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Ir al inicio de sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Volver al inicio</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <img src="/lovable-uploads/2176a5eb-dd8e-4ff9-8a38-3cfe98feb63a.png" alt="Be My Doctor" className="h-8 w-auto" />
              <span className="font-bold text-lg text-primary">Be My Doctor</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Reset Password Content */}
      <div className="flex-1 flex items-center justify-center bg-gradient-section px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/lovable-uploads/2176a5eb-dd8e-4ff9-8a38-3cfe98feb63a.png" alt="Be My Doctor" className="h-8 w-auto" />
              <CardTitle className="text-2xl text-center">Restablecer contraseña</CardTitle>
            </div>
            <CardDescription className="text-center">
              Ingresa tu nueva contraseña para completar el proceso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
              
              <div className="text-center">
                <Link 
                  to="/auth" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}