import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu cuenta...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if the URL contains session information from Supabase
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage('Error al verificar tu cuenta. El enlace puede haber expirado o ser inválido.');
          return;
        }

        // If we get here, the email verification was successful
        // Wait a moment for auth state to update
        setTimeout(() => {
          setStatus('success');
          setMessage('¡Tu cuenta ha sido verificada exitosamente!');
        }, 1000);

      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        setStatus('error');
        setMessage('Ocurrió un error inesperado. Por favor intenta de nuevo.');
      }
    };

    handleAuthCallback();
  }, []);

  // Auto-redirect when authenticated
  useEffect(() => {
    if (!authLoading && user && status === 'success') {
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    }
  }, [user, authLoading, status, navigate]);

  const handleGoToDashboard = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src="/lovable-uploads/2176a5eb-dd8e-4ff9-8a38-3cfe98feb63a.png" alt="Be My Doctor" className="h-8 w-auto" />
              <span className="font-bold text-lg text-primary">Be My Doctor</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center bg-gradient-section px-4 py-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {status === 'loading' && (
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                )}
                {status === 'success' && (
                  <CheckCircle className="h-12 w-12 text-green-500" />
                )}
                {status === 'error' && (
                  <XCircle className="h-12 w-12 text-red-500" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {status === 'loading' && 'Verificando cuenta...'}
                {status === 'success' && '¡Cuenta verificada!'}
                {status === 'error' && 'Error de verificación'}
              </CardTitle>
              <CardDescription className="text-center mt-2">
                {message}
                {status === 'success' && user && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Redirigiendo al dashboard en 2 segundos...
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status !== 'loading' && (
                <div className="flex flex-col gap-3">
                  <Button 
                    className="w-full" 
                    onClick={handleGoToDashboard}
                    variant={status === 'success' ? 'default' : 'outline'}
                  >
                    {user ? 'Ir al Dashboard' : 'Ir a iniciar sesión'}
                  </Button>
                  {status === 'error' && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/')}
                    >
                      Volver al inicio
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}