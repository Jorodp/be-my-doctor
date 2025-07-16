import { useState, useEffect } from 'react';
import { DoctorImage } from '@/components/DoctorImage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  DollarSign,
  Edit
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EditDoctorProfile } from './EditDoctorProfile';

interface Doctor {
  id: string;
  user_id: string;
  professional_license: string;
  specialty: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  profile_image_url: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  office_address: string | null;
  office_phone: string | null;
  practice_locations: string[] | null;
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
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchDoctors();
    
    // Set up polling to check for new doctors every 30 seconds
    const interval = setInterval(() => {
      fetchDoctors();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [doctors, statusFilter]);

  const filterDoctors = () => {
    if (statusFilter === 'all') {
      setFilteredDoctors(doctors);
    } else {
      setFilteredDoctors(doctors.filter(doctor => doctor.verification_status === statusFilter));
    }
  };

  const fetchDoctors = async () => {
    try {
      // Fetch all doctors
      const { data: doctorsData, error: doctorsError } = await supabase
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
          office_address,
          office_phone,
          practice_locations,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (doctorsError) throw doctorsError;

      if (!doctorsData || doctorsData.length === 0) {
        setDoctors([]);
        return;
      }

      // Get user profiles and auth users for email
      const userIds = doctorsData.map(d => d.user_id);
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      // Fetch auth users to get email
      let authUsers: any = null;
      try {
        const response = await supabase.auth.admin.listUsers();
        authUsers = response.data;
      } catch (authError) {
        console.warn('Could not fetch auth users:', authError);
      }
      
      const doctorsWithProfiles = doctorsData.map(doctor => {
        const profile = profiles?.find(p => p.user_id === doctor.user_id);
        const authUser = authUsers?.users?.find((u: any) => u.id === doctor.user_id);
        
        return {
          ...doctor,
          profile: profile ? {
            ...profile,
            email: authUser?.email || 'Email no disponible'
          } : {
            full_name: null,
            phone: null,
            email: authUser?.email || 'Email no disponible'
          }
        };
      });

      setDoctors(doctorsWithProfiles);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      
      // Fallback without email if auth admin fails
      try {
        const { data: doctorsData, error: doctorsError } = await supabase
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
            office_address,
            office_phone,
            practice_locations,
            created_at
          `)
          .order('created_at', { ascending: false });

        if (doctorsError) throw doctorsError;

        const userIds = doctorsData?.map(d => d.user_id) || [];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);

        const doctorsWithProfiles = doctorsData?.map(doctor => {
          const profile = profiles?.find(p => p.user_id === doctor.user_id);
          return {
            ...doctor,
            profile: profile ? {
              ...profile,
              email: 'Email no disponible'
            } : {
              full_name: null,
              phone: null,
              email: 'Email no disponible'
            }
          };
        }) || [];

        setDoctors(doctorsWithProfiles);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        toast({
          title: "Error",
          description: "No se pudieron cargar los médicos",
          variant: "destructive"
        });
      }
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
      fetchDoctors();
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

  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDoctor(null);
  };

  const handleProfileUpdated = () => {
    fetchDoctors(); // Refresh the list
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Gestión de Médicos ({filteredDoctors.length})
          </CardTitle>
          <CardDescription>
            Administra todos los médicos de la plataforma - verificar, editar perfiles y gestionar información
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Filtrar por estado:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los médicos</SelectItem>
                  <SelectItem value="pending">Pendientes ({doctors.filter(d => d.verification_status === 'pending').length})</SelectItem>
                  <SelectItem value="verified">Verificados ({doctors.filter(d => d.verification_status === 'verified').length})</SelectItem>
                  <SelectItem value="rejected">Rechazados ({doctors.filter(d => d.verification_status === 'rejected').length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredDoctors.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === 'pending' ? '¡Excelente trabajo!' : 'No hay médicos'}
              </h3>
              <p className="text-muted-foreground">
                {statusFilter === 'pending' 
                  ? 'No hay médicos pendientes de verificación en este momento.'
                  : `No hay médicos ${statusFilter === 'all' ? 'registrados' : statusFilter === 'verified' ? 'verificados' : 'rechazados'} en este momento.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDoctors.map((doctor) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'verified': return 'border-l-green-500 bg-green-50';
                    case 'pending': return 'border-l-orange-400 bg-orange-50';
                    case 'rejected': return 'border-l-red-500 bg-red-50';
                    default: return 'border-l-gray-400';
                  }
                };

                const getStatusBadge = (status: string) => {
                  switch (status) {
                    case 'verified': 
                      return (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      );
                    case 'pending':
                      return (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      );
                    case 'rejected':
                      return (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rechazado
                        </Badge>
                      );
                    default: return null;
                  }
                };

                return (
                  <Card key={doctor.id} className={`border-l-4 ${getStatusColor(doctor.verification_status)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Doctor Avatar and Basic Info */}
                        <DoctorImage 
                          profileImageUrl={doctor.profile_image_url}
                          doctorName={doctor.profile?.full_name}
                          size="md"
                        />
                        
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
                            {getStatusBadge(doctor.verification_status)}
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
                                  <span className="text-muted-foreground">${doctor.consultation_fee} MXN por consulta</span>
                                </div>
                              )}
                              {doctor.office_address && (
                                <div className="text-sm">
                                  <span className="font-medium">Consultorio:</span>{' '}
                                  <span className="text-muted-foreground">{doctor.office_address}</span>
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
                              {doctor.practice_locations && doctor.practice_locations.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium">Lugares de atención:</span>
                                  <ul className="text-muted-foreground text-xs mt-1 space-y-1">
                                    {doctor.practice_locations.map((location, index) => (
                                      <li key={index}>• {location}</li>
                                    ))}
                                  </ul>
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
                                    Revisa toda la información del médico
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
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditDoctor(doctor)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>

                            {doctor.verification_status === 'pending' && (
                              <>
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
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Doctor Modal */}
      {editingDoctor && (
        <EditDoctorProfile
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          doctorProfile={{
            id: editingDoctor.id,
            user_id: editingDoctor.user_id,
            specialty: editingDoctor.specialty,
            professional_license: editingDoctor.professional_license,
            biography: editingDoctor.biography,
            years_experience: editingDoctor.years_experience,
            consultation_fee: editingDoctor.consultation_fee,
            profile_image_url: editingDoctor.profile_image_url,
            office_address: editingDoctor.office_address,
            office_phone: editingDoctor.office_phone,
            practice_locations: editingDoctor.practice_locations,
            verification_status: editingDoctor.verification_status
          }}
          profile={{
            user_id: editingDoctor.user_id,
            full_name: editingDoctor.profile?.full_name || null,
            phone: editingDoctor.profile?.phone || null,
            email: editingDoctor.profile?.email || null
          }}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </div>
  );
};