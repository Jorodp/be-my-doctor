import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, User, Stethoscope, FileText, CreditCard, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DoctorImage } from '@/components/DoctorImage';
import { DoctorImageUpload } from '@/components/admin/DoctorImageUpload';
import { DoctorClinicsManager } from '@/components/admin/DoctorClinicsManager';
import { DoctorProfileForm } from '@/components/admin/DoctorProfileForm';
import { DoctorDocumentManager } from '@/components/admin/DoctorDocumentManager';
import { SubscriptionManager } from '@/components/admin/SubscriptionManager';
import { useDoctorClinics } from '@/hooks/useDoctorClinics';

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  biography?: string;
  consultation_fee?: number;
  subscription_status: string;
  verification_status: string;
  experience_years?: number;
  professional_license?: string;
  profile_image_url?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  profile_image_url?: string;
}

export default function AdminDoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const { toast } = useToast();
  const { data: clinics } = useDoctorClinics(id!);

  useEffect(() => {
    if (id) {
      loadDoctorData();
    }
  }, [id]);

  const loadDoctorData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Cargar perfil del doctor y usuario en paralelo
      const [doctorResponse, userResponse] = await Promise.all([
        supabase
          .from('doctor_profiles')
          .select('*')
          .eq('user_id', id)
          .single(),
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', id)
          .single()
      ]);

      if (doctorResponse.error) throw doctorResponse.error;
      if (userResponse.error) throw userResponse.error;

      setDoctorProfile(doctorResponse.data);
      setUserProfile(userResponse.data);

    } catch (error) {
      console.error('Error loading doctor data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del doctor',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpdated = () => {
    // Recargar datos cuando se actualice la imagen
    loadDoctorData();
    toast({
      title: 'Éxito',
      description: 'Imagen actualizada correctamente',
    });
  };

  if (!id) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Error</h1>
          <p className="text-muted-foreground">ID de doctor no encontrado</p>
          <Link to="/admin/doctores">
            <Button className="mt-4">Volver al listado</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!doctorProfile || !userProfile) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Error</h1>
          <p className="text-muted-foreground">No se encontró la información del doctor</p>
          <Link to="/admin/doctores">
            <Button className="mt-4">Volver al listado</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/doctores">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Editar Doctor</h1>
          <p className="text-muted-foreground">
            Modifica la información del perfil del doctor
          </p>
        </div>
      </div>

      {/* Doctor Header Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-4">
              <DoctorImage 
                profileImageUrl={doctorProfile.profile_image_url || userProfile.profile_image_url}
                doctorName={userProfile.full_name || 'Doctor'}
                size="xl"
              />
              <DoctorImageUpload 
                doctorId={id}
                currentImageUrl={doctorProfile.profile_image_url || userProfile.profile_image_url}
                onImageUpdated={handleImageUpdated}
              />
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{userProfile.full_name}</h2>
              <p className="text-lg text-muted-foreground mb-3">{doctorProfile.specialty}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Estado</div>
                  <div className="font-medium capitalize">{doctorProfile.verification_status}</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Suscripción</div>
                  <div className="font-medium capitalize">{doctorProfile.subscription_status}</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Experiencia</div>
                  <div className="font-medium">{doctorProfile.experience_years || 0} años</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Precio</div>
                  <div className="font-medium">
                    {clinics && clinics.length > 0 
                      ? `$${clinics[0].consultation_fee?.toLocaleString() || doctorProfile.consultation_fee?.toLocaleString() || 'No definido'}`
                      : `$${doctorProfile.consultation_fee?.toLocaleString() || 'No definido'}`
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="clinics" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Consultorios
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Suscripción
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <DoctorProfileForm 
            doctorProfile={doctorProfile}
            userProfile={userProfile}
            onUpdate={loadDoctorData}
          />
        </TabsContent>

        <TabsContent value="clinics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Gestión de Consultorios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DoctorClinicsManager 
                doctorUserId={id}
                onClinicsChange={loadDoctorData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Gestión de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DoctorDocumentManager
                doctorProfile={doctorProfile}
                onProfileUpdate={loadDoctorData}
                isAdminView={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <div className="space-y-6">
            {/* Estado y Configuración */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Estado y Configuración
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado de verificación</label>
                    <select 
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={doctorProfile.verification_status}
                      onChange={async (e) => {
                        try {
                          await supabase
                            .from('doctor_profiles')
                            .update({ verification_status: e.target.value })
                            .eq('user_id', id);
                          loadDoctorData();
                          toast({ title: 'Estado actualizado', description: 'El estado de verificación se actualizó correctamente' });
                        } catch (error) {
                          toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
                        }
                      }}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="verified">Verificado</option>
                      <option value="rejected">Rechazado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado de suscripción</label>
                    <select 
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={doctorProfile.subscription_status}
                      onChange={async (e) => {
                        try {
                          await supabase
                            .from('doctor_profiles')
                            .update({ subscription_status: e.target.value })
                            .eq('user_id', id);
                          loadDoctorData();
                          toast({ title: 'Estado actualizado', description: 'El estado de suscripción se actualizó correctamente' });
                        } catch (error) {
                          toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
                        }
                      }}
                    >
                      <option value="active">Activa</option>
                      <option value="inactive">Inactiva</option>
                      <option value="paused">Pausada</option>
                      <option value="expired">Expirada</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gestión de Suscripción */}
            <SubscriptionManager
              doctor={{
                doctor_user_id: id,
                full_name: userProfile.full_name || '',
                specialty: doctorProfile.specialty,
                verification_status: doctorProfile.verification_status,
                subscription_status: doctorProfile.subscription_status,
                profile_complete: true
              }}
              doctorProfile={doctorProfile}
              subscriptionHistory={[]}
              onSubscriptionUpdate={loadDoctorData}
            />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Configuración Avanzada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Configuraciones adicionales del doctor estarán disponibles próximamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}