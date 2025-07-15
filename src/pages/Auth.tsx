import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Sign In form
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
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
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-section px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">MediConnect</CardTitle>
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
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </form>
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
                  <Input
                    id="signup-password"
                    type="password"
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
  );
}