import { useState } from 'react';
import { Navigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { BackToHomeButton } from '@/components/ui/BackToHomeButton';
import { Home, ArrowLeft, Search, UserCircle } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';


type UserRole = Database['public']['Enums']['user_role'];

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Sign In form
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  
  // Sign Up form
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  
  // Doctor specific fields
  const [professionalLicense, setProfessionalLicense] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [biography, setBiography] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [consultationFee, setConsultationFee] = useState('');

  // Redirect if already authenticated
  if (user) {
    const redirectTo = searchParams.get('redirect') || 
                      location.state?.from?.pathname || 
                      '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(signInEmail, signInPassword);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: error.message === 'Invalid login credentials' 
          ? 'Credenciales inválidas. Verifica tu email y contraseña.' 
          : error.message
      });
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const additionalData: any = {
      first_name: firstName,
      last_name: lastName,
      phone: phone
    };

    if (role === 'doctor') {
      additionalData.professional_license = professionalLicense;
      additionalData.specialty = specialty;
      additionalData.biography = biography;
      additionalData.years_experience = yearsExperience ? parseInt(yearsExperience) : null;
      additionalData.consultation_fee = consultationFee ? parseFloat(consultationFee) : null;
    }

    const { error } = await signUp(signUpEmail, signUpPassword, role, additionalData);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: error.message === 'User already registered' 
          ? 'Este email ya está registrado. Intenta iniciar sesión.' 
          : error.message
      });
    } else {
      toast({
        title: "Registro exitoso",
        description: role === 'doctor' 
          ? 'Te has registrado como médico. Tu cuenta está pendiente de verificación por un administrador.'
          : 'Te has registrado exitosamente. Revisa tu email para confirmar tu cuenta.'
      });
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } else {
      toast({
        title: "Email enviado",
        description: "Revisa tu correo electrónico para restablecer tu contraseña."
      });
      setIsResetMode(false);
      setResetEmail('');
    }

    setLoading(false);
  };

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
            <div className="flex items-center gap-4">
              <Link to="/search" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Search className="h-5 w-5" />
                <span>Buscar médicos</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Auth Content */}
      <div className="flex-1 flex items-center justify-center bg-gradient-section px-4 py-8">
      
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/lovable-uploads/2176a5eb-dd8e-4ff9-8a38-3cfe98feb63a.png" alt="Be My Doctor" className="h-8 w-auto" />
            <CardTitle className="text-2xl text-center">Be My Doctor</CardTitle>
          </div>
          <CardDescription className="text-center">
            Plataforma médica integral
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              {!isResetMode ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Contraseña</Label>
                    <PasswordInput
                      id="signin-password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsResetMode(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Ingresa tu email para restablecer tu contraseña"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setResetEmail('');
                      }}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      ← Volver al inicio de sesión
                    </button>
                  </div>
                </form>
              )}
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">Nombre</Label>
                    <Input
                      id="first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Apellido</Label>
                    <Input
                      id="last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de usuario</Label>
                  <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Paciente</SelectItem>
                      <SelectItem value="doctor">Médico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {role === 'doctor' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="license">Cédula Profesional</Label>
                      <Input
                        id="license"
                        value={professionalLicense}
                        onChange={(e) => setProfessionalLicense(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Especialidad</Label>
                      <Input
                        id="specialty"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="biography">Biografía</Label>
                      <Textarea
                        id="biography"
                        value={biography}
                        onChange={(e) => setBiography(e.target.value)}
                        placeholder="Cuéntanos sobre tu experiencia profesional..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="experience">Años de experiencia</Label>
                        <Input
                          id="experience"
                          type="number"
                          value={yearsExperience}
                          onChange={(e) => setYearsExperience(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fee">Consulta (USD)</Label>
                        <Input
                          id="fee"
                          type="number"
                          step="0.01"
                          value={consultationFee}
                          onChange={(e) => setConsultationFee(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <PasswordInput
                    id="signup-password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Registrando...' : 'Registrarse'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}