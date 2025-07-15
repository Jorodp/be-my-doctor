import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  UserCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  User,
  Stethoscope,
  Award,
  Phone,
  Calendar,
  DollarSign
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingDoctor {
  id: string;
  user_id: string;
  professional_license: string;
  specialty: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  profile_image_url: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  profile: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

export const DoctorVerificationList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingDoctors();
    
    // Set up polling to check for new pending doctors every 30 seconds
    const interval = setInterval(() => {
      fetchPendingDoctors();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPendingDoctors = async () => {
    try {
      // Fetch pending doctors
      const { data: doctors, error: doctorsError } = await supabase
        .from('doctor_profiles')
        .select(`
          id,
          user_id,
          professional_license,
          specialty,
          biography,
          years_experience,
          consultation_fee,
          profile_image_url,
          verification_status,
          created_at
        `)
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true });

      if (doctorsError) throw doctorsError;

      if (!doctors || doctors.length === 0) {
        setPendingDoctors([]);
        return;
      }

      // Get user profiles and auth users
      const userIds = doctors.map(d => d.user_id);
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      // Simplify - just use profiles for now
      const doctorsWithProfiles = doctors.map(doctor => {
        const profile = profiles?.find(p => p.user_id === doctor.user_id);
        
        return {
          ...doctor,
          profile: profile ? {
            ...profile,
            email: null // We'll get this from user context if needed
          } : null
        };
      });

      setPendingDoctors(doctorsWithProfiles);
    } catch (error) {
      console.error('Error fetching pending doctors:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los médicos pendientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (doctorId: string, approved: boolean) => {
    if (!user) return;
    
    setProcessingId(doctorId);
    
    try {
      const updateData = approved 
        ? {
            verification_status: 'verified' as const,
            verified_at: new Date().toISOString(),
            verified_by: user.id
          }
        : {
            verification_status: 'rejected' as const,
            verified_by: user.id
          };

      const { error } = await supabase
        .from('doctor_profiles')
        .update(updateData)
        .eq('id', doctorId);

      if (error) throw error;

      toast({
        title: approved ? "Médico Aprobado" : "Médico Rechazado",
        description: approved 
          ? "El médico ha sido verificado y puede comenzar a ofrecer consultas"
          : "La solicitud ha sido rechazada",
      });

      // Refresh the list
      fetchPendingDoctors();
    } catch (error) {
      console.error('Error processing doctor:', error);
      toast({
        title: "Error",
        description: `No se pudo ${approved ? 'aprobar' : 'rechazar'} el médico`,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Verificación de Médicos ({pendingDoctors.length})
        </CardTitle>
        <CardDescription>
          Médicos pendientes de verificación para comenzar a ofrecer consultas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingDoctors.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">¡Excelente trabajo!</h3>
            <p className="text-muted-foreground">
              No hay médicos pendientes de verificación en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDoctors.map((doctor) => (
              <Card key={doctor.id} className="border-l-4 border-l-orange-400">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Doctor Avatar and Basic Info */}
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={doctor.profile_image_url || undefined} 
                        alt={doctor.profile?.full_name || 'Doctor'} 
                      />
                      <AvatarFallback className="bg-orange-100 text-orange-700">
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            Dr. {doctor.profile?.full_name || 'Nombre no disponible'}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Stethoscope className="h-4 w-4" />
                            <span>{doctor.specialty}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      </div>

                      {/* Key Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Cédula:</span>{' '}
                            <span className="text-muted-foreground">{doctor.professional_license}</span>
                          </div>
                          {doctor.profile?.email && (
                            <div className="text-sm">
                              <span className="font-medium">Email:</span>{' '}
                              <span className="text-muted-foreground">{doctor.profile.email}</span>
                            </div>
                          )}
                          {doctor.profile?.phone && (
                            <div className="text-sm flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="text-muted-foreground">{doctor.profile.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          {doctor.years_experience && (
                            <div className="text-sm flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              <span className="text-muted-foreground">{doctor.years_experience} años de experiencia</span>
                            </div>
                          )}
                          {doctor.consultation_fee && (
                            <div className="text-sm flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span className="text-muted-foreground">${doctor.consultation_fee} por consulta</span>
                            </div>
                          )}
                          <div className="text-sm flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-muted-foreground">
                              Registrado: {format(new Date(doctor.created_at), 'dd/MM/yyyy', { locale: es })}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {doctor.biography && (
                            <div className="text-sm">
                              <span className="font-medium">Biografía:</span>
                              <p className="text-muted-foreground text-xs line-clamp-3 mt-1">
                                {doctor.biography}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalles
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Perfil Completo - Dr. {doctor.profile?.full_name}</DialogTitle>
                              <DialogDescription>
                                Revisa toda la información antes de aprobar o rechazar
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Complete profile view */}
                              <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                  <AvatarImage src={doctor.profile_image_url || undefined} />
                                  <AvatarFallback>
                                    <User className="h-10 w-10" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="text-xl font-semibold">
                                    Dr. {doctor.profile?.full_name}
                                  </h3>
                                  <p className="text-muted-foreground">{doctor.specialty}</p>
                                  <p className="text-sm text-muted-foreground">{doctor.profile?.email}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Información Profesional</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><strong>Cédula:</strong> {doctor.professional_license}</div>
                                    <div><strong>Especialidad:</strong> {doctor.specialty}</div>
                                    {doctor.years_experience && (
                                      <div><strong>Experiencia:</strong> {doctor.years_experience} años</div>
                                    )}
                                    {doctor.consultation_fee && (
                                      <div><strong>Tarifa:</strong> ${doctor.consultation_fee}</div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Información de Contacto</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><strong>Email:</strong> {doctor.profile?.email}</div>
                                    {doctor.profile?.phone && (
                                      <div><strong>Teléfono:</strong> {doctor.profile.phone}</div>
                                    )}
                                    <div><strong>Registrado:</strong> {format(new Date(doctor.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
                                  </div>
                                </div>
                              </div>

                              {doctor.biography && (
                                <div>
                                  <h4 className="font-semibold mb-2">Biografía Profesional</h4>
                                  <p className="text-sm text-muted-foreground">{doctor.biography}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          onClick={() => handleApproval(doctor.id, true)}
                          disabled={processingId === doctor.id}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          {processingId === doctor.id ? (
                            <LoadingSpinner className="h-4 w-4 mr-1" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Aprobar
                        </Button>

                        <Button 
                          onClick={() => handleApproval(doctor.id, false)}
                          disabled={processingId === doctor.id}
                          variant="destructive"
                          size="sm"
                        >
                          {processingId === doctor.id ? (
                            <LoadingSpinner className="h-4 w-4 mr-1" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};