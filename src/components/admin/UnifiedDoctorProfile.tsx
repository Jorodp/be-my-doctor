import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  FileText, 
  CreditCard, 
  Star, 
  Calendar, 
  MapPin,
  Phone,
  Mail,
  Award,
  Clock,
  Check,
  X,
  Eye,
  Edit,
  Download,
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAdminProfileAPI } from '@/hooks/useAdminProfileAPI';
import { format } from 'date-fns';
import { formatDateTimeInMexicoTZ } from '@/utils/dateUtils';
import { es } from 'date-fns/locale';

import { EditDoctorProfile } from './EditDoctorProfile';
import { DoctorDocumentManager } from './DoctorDocumentManager';
import { SubscriptionManager } from './SubscriptionManager';
import { DoctorBadgeManager } from './DoctorBadgeManager';
import { DoctorBadges } from '../DoctorBadges';

interface Doctor {
  doctor_user_id: string;
  full_name: string;
  specialty: string;
  verification_status: string;
  subscription_status: string;
  profile_complete: boolean;
  experience_years?: number;
  rating_avg?: number;
  rating_count?: number;
}

interface UnifiedDoctorProfileProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  onDoctorUpdated: () => void;
}

interface DoctorProfileData {
  profile: any;
  doctorProfile: any;
  appointments: any[];
  subscriptionHistory: any[];
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    canceledAppointments: number;
    uniquePatients: number;
    avgRating: number;
    totalRevenue: number;
  };
}

export const UnifiedDoctorProfile = ({ 
  isOpen, 
  onClose, 
  doctor, 
  onDoctorUpdated 
}: UnifiedDoctorProfileProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DoctorProfileData | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);

  const { 
    getDoctorProfile, 
    getDoctorAppointments, 
    getSubscriptionHistory,
    updateSubscriptionStatus,
    verifyDoctorDocuments 
  } = useAdminProfileAPI();

  useEffect(() => {
    if (isOpen && doctor) {
      fetchDoctorData();
    }
  }, [isOpen, doctor]);

  const fetchDoctorData = async () => {
    if (!doctor) return;

    setLoading(true);
    try {
      // Fetch all doctor data in parallel
      const [profileData, appointments, subscriptionHistory] = await Promise.all([
        getDoctorProfile(doctor.doctor_user_id),
        getDoctorAppointments(doctor.doctor_user_id),
        getSubscriptionHistory(doctor.doctor_user_id).catch(() => [])
      ]);

      // Calculate stats
      const stats = calculateStats(appointments);

      setData({
        profile: profileData.profile,
        doctorProfile: profileData.doctorProfile,
        appointments,
        subscriptionHistory,
        stats
      });
    } catch (error) {
      console.error('Error fetching doctor data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del médico',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (appointments: any[]) => {
    const completed = appointments.filter(apt => apt.status === 'completed');
    const canceled = appointments.filter(apt => apt.status === 'cancelled');
    const uniquePatients = new Set(appointments.map(apt => apt.patient_user_id)).size;
    const totalRevenue = completed.reduce((sum, apt) => sum + (apt.price || 0), 0);

    return {
      totalAppointments: appointments.length,
      completedAppointments: completed.length,
      canceledAppointments: canceled.length,
      uniquePatients,
      avgRating: doctor?.rating_avg || 0,
      totalRevenue
    };
  };

  const handleSubscriptionUpdate = async (status: string, expiresAt?: string) => {
    if (!doctor || !data) return;

    try {
      await updateSubscriptionStatus(data.doctorProfile.id, status, expiresAt);
      await fetchDoctorData();
      onDoctorUpdated();
      toast({
        title: 'Éxito',
        description: 'Suscripción actualizada correctamente'
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const handleVerifyDocuments = async () => {
    if (!doctor || !data) return;

    try {
      await verifyDoctorDocuments(data.doctorProfile.id, doctor.doctor_user_id);
      await fetchDoctorData();
      onDoctorUpdated();
    } catch (error) {
      console.error('Error verifying documents:', error);
    }
  };

  const getStatusBadge = (status: string, type: 'verification' | 'subscription') => {
    if (type === 'verification') {
      switch (status) {
        case 'verified':
          return <Badge className="bg-green-100 text-green-800">Verificado</Badge>;
        case 'pending':
          return <Badge variant="secondary">Pendiente</Badge>;
        case 'rejected':
          return <Badge variant="destructive">Rechazado</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    } else {
      switch (status) {
        case 'active':
          return <Badge className="bg-blue-100 text-blue-800">Activa</Badge>;
        case 'inactive':
          return <Badge variant="secondary">Inactiva</Badge>;
        case 'expired':
          return <Badge variant="destructive">Expirada</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data || !doctor) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-12">
            <p>No se pudieron cargar los datos del médico</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={data.doctorProfile.profile_image_url} />
              <AvatarFallback>
                <User className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">Dr. {data.profile.full_name}</h2>
              <p className="text-muted-foreground">{data.doctorProfile.specialty}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {getStatusBadge(doctor.verification_status, 'verification')}
              {getStatusBadge(doctor.subscription_status, 'subscription')}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Quick Stats Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Citas Totales</p>
                  <p className="text-xl font-bold">{data.stats.totalAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Pacientes</p>
                  <p className="text-xl font-bold">{data.stats.uniquePatients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Calificación</p>
                  <p className="text-xl font-bold">{data.stats.avgRating.toFixed(1)} ⭐</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Ingresos</p>
                  <p className="text-xl font-bold">${data.stats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1" style={{ width: '100%', overflowX: 'auto' }}>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="subscription">Suscripción</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="badges">Insignias</TabsTrigger>
            <TabsTrigger value="activity">Actividad</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Información Personal
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditMode(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nombre Completo</p>
                      <p className="font-medium">{data.profile.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <p className="font-medium">{data.profile.phone || 'No disponible'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{data.profile.email || 'No disponible'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                      <p className="font-medium">
                        {formatDateTimeInMexicoTZ(data.profile.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Información Profesional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Especialidad</p>
                      <p className="font-medium">{data.doctorProfile.specialty}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Años de Experiencia</p>
                      <p className="font-medium">{data.doctorProfile.years_experience || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cédula Profesional</p>
                      <p className="font-medium">{data.doctorProfile.professional_license}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Precio por Consulta</p>
                      <p className="font-medium">
                        ${data.doctorProfile.consultation_fee?.toLocaleString() || 'No especificado'}
                      </p>
                    </div>
                  </div>
                  
                  {data.doctorProfile.biography && (
                    <div>
                      <p className="text-sm text-muted-foreground">Biografía</p>
                      <p className="text-sm">{data.doctorProfile.biography}</p>
                    </div>
                  )}

                  {data.doctorProfile.practice_locations?.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Consultorios</p>
                      <div className="space-y-1">
                        {data.doctorProfile.practice_locations.map((location: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{location}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="mt-6">
            <SubscriptionManager
              doctor={doctor}
              doctorProfile={data.doctorProfile}
              subscriptionHistory={data.subscriptionHistory}
              onSubscriptionUpdate={() => fetchDoctorData()}
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <DoctorDocumentManager
              doctorProfile={data.doctorProfile}
              onProfileUpdate={fetchDoctorData}
              isAdminView={true}
            />
          </TabsContent>

          <TabsContent value="badges" className="mt-6">
            <DoctorBadgeManager
              doctorUserId={doctor.doctor_user_id}
              doctorName={data.profile.full_name}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <div className="space-y-6">
              {/* Recent Appointments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Citas Recientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.appointments.slice(0, 5).map((appointment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            {formatDateTimeInMexicoTZ(appointment.starts_at)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Paciente: {appointment.patient_user_id.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            appointment.status === 'completed' ? 'default' : 
                            appointment.status === 'cancelled' ? 'destructive' : 'secondary'
                          }>
                            {appointment.status === 'completed' ? 'Completada' : 
                             appointment.status === 'cancelled' ? 'Cancelada' : 
                             appointment.status === 'scheduled' ? 'Programada' : appointment.status}
                          </Badge>
                          {appointment.price && (
                            <span className="text-sm font-medium">${appointment.price}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {data.appointments.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No hay citas registradas
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tasa de Completado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.stats.totalAppointments > 0 
                        ? Math.round((data.stats.completedAppointments / data.stats.totalAppointments) * 100)
                        : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {data.stats.completedAppointments} de {data.stats.totalAppointments} citas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tasa de Cancelación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.stats.totalAppointments > 0 
                        ? Math.round((data.stats.canceledAppointments / data.stats.totalAppointments) * 100)
                        : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {data.stats.canceledAppointments} citas canceladas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Promedio por Cita</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${data.stats.completedAppointments > 0 
                        ? Math.round(data.stats.totalRevenue / data.stats.completedAppointments)
                        : 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ingreso promedio por consulta
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="flex gap-2">
            {doctor.verification_status === 'pending' && (
              <Button onClick={handleVerifyDocuments}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Verificar Médico
              </Button>
            )}
          </div>
          
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        {/* Edit Profile Modal */}
        {editMode && (
          <EditDoctorProfile
            isOpen={editMode}
            onClose={() => setEditMode(false)}
            doctorProfile={data.doctorProfile}
            profile={data.profile}
            onProfileUpdated={() => {
              fetchDoctorData();
              onDoctorUpdated();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};