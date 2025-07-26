import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get token and type from URL params
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (!token || type !== 'email') {
          setStatus('error');
          setMessage('Enlace de confirmación inválido o expirado.');
          return;
        }

        // Verify the email with Supabase
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email'
        });

        if (error) {
          setStatus('error');
          setMessage('Error al confirmar el email. El enlace puede haber expirado.');
          console.error('Email confirmation error:', error);
        } else {
          setStatus('success');
          setMessage('¡Tu email ha sido confirmado exitosamente! Ya puedes iniciar sesión en tu cuenta.');
        }
      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage('Ocurrió un error inesperado. Por favor intenta de nuevo.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams]);

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
                {status === 'loading' && 'Confirmando email...'}
                {status === 'success' && '¡Email confirmado!'}
                {status === 'error' && 'Error de confirmación'}
              </CardTitle>
              <CardDescription className="text-center mt-2">
                {message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status !== 'loading' && (
                <div className="flex flex-col gap-3">
                  <Link to="/auth">
                    <Button className="w-full" variant={status === 'success' ? 'default' : 'outline'}>
                      {status === 'success' ? 'Iniciar sesión' : 'Ir a inicio de sesión'}
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button variant="outline" className="w-full">
                      Volver al inicio
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}