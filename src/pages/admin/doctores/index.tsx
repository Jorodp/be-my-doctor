import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAdminProfileAPI } from '@/hooks/useAdminProfileAPI';
import { SubscriptionHistoryModal } from '@/components/admin/SubscriptionHistoryModal';
import { DoctorAppointmentsDrawer } from '@/components/admin/DoctorAppointmentsDrawer';
import { CreateDoctorModal } from '@/components/admin/CreateDoctorModal';
import { UnifiedDoctorProfile } from '@/components/admin/UnifiedDoctorProfile';
import { Eye, Calendar, CreditCard, Edit, ArrowLeft, Plus, Users, Activity, CheckCircle, Award } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DoctorBadgeManager } from '@/components/admin/DoctorBadgeManager';
interface DoctorListItem {
  doctor_user_id: string;
  full_name: string;
  specialty: string;
  verification_status: string;
  subscription_status: string;
  profile_complete: boolean;
  cita_count: number;
  rating_avg?: number;
  rating_count?: number;
  experience_years?: number;
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showSubscriptionHistory, setShowSubscriptionHistory] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDoctorProfile, setShowDoctorProfile] = useState(false);
  const [showBadgeManager, setShowBadgeManager] = useState(false);
  
  const { toast } = useToast();
  const { listDoctors, loading: apiLoading } = useAdminProfileAPI();

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const doctorsData = await listDoctors();
      setDoctors(doctorsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los doctores',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleViewProfile = (doctor: DoctorListItem) => {
    setSelectedDoctor(doctor);
    setShowDoctorProfile(true);
  };

  const handleViewAppointments = (doctor: DoctorListItem) => {
    setSelectedDoctor(doctor);
    setShowAppointments(true);
  };

  const handleViewSubscriptions = (doctor: DoctorListItem) => {
    setSelectedDoctor(doctor);
    setShowSubscriptionHistory(true);
  };

  const handleCreateDoctor = () => {
    setShowCreateModal(true);
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verificado
        </Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Activity className="w-3 h-3 mr-1" />
          Pendiente
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">No verificado</Badge>;
    }
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Activa</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactiva</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirada</Badge>;
      default:
        return <Badge variant="outline">Sin suscripción</Badge>;
    }
  };

  // Calcular estadísticas
  const stats = {
    total: doctors.length,
    verified: doctors.filter(d => d.verification_status === 'verified').length,
    active: doctors.filter(d => d.subscription_status === 'active').length,
    complete: doctors.filter(d => d.profile_complete).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Botón de volver */}
      <Link to="/dashboard">
        <Button variant="ghost" className="mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Button>
      </Link>
      
      {/* Header con estadísticas */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Doctores</h1>
            <p className="text-muted-foreground mt-1">
              Administra los perfiles, verificaciones y suscripciones de los doctores
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={loadDoctors} disabled={apiLoading} variant="outline">
              Actualizar
            </Button>
            <Button onClick={handleCreateDoctor} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Crear Doctor
            </Button>
          </div>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Doctores</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Verificados</p>
                  <p className="text-2xl font-bold">{stats.verified}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suscripciones Activas</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Perfiles Completos</p>
                  <p className="text-2xl font-bold">{stats.complete}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabla de doctores */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Doctores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Suscripción</TableHead>
                  <TableHead>Experiencia</TableHead>
                  <TableHead>Calificación</TableHead>
                  <TableHead># Citas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((doctor) => (
                  <TableRow key={doctor.doctor_user_id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium">
                        {doctor.full_name || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {doctor.doctor_user_id.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>{doctor.specialty || 'Sin especialidad'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getVerificationBadge(doctor.verification_status)}
                        <div>
                          <Badge variant={doctor.profile_complete ? "default" : "outline"} className="text-xs">
                            {doctor.profile_complete ? "Completo" : "Incompleto"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSubscriptionBadge(doctor.subscription_status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {doctor.experience_years ? `${doctor.experience_years} años` : 'No especificado'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">
                          {doctor.rating_avg ? doctor.rating_avg.toFixed(1) : '0.0'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({doctor.rating_count || 0})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{doctor.cita_count || 0}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewProfile(doctor)}
                                className="h-8 px-2"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver perfil</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link to={`/admin/doctores/${doctor.doctor_user_id}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewAppointments(doctor)}
                                className="h-8 px-2"
                              >
                                <Calendar className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver citas</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedDoctor(doctor); setShowBadgeManager(true); }}
                                className="h-8 px-2"
                              >
                                <Award className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Insignias</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {doctors.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No se encontraron doctores</p>
              <p className="text-sm text-muted-foreground mb-4">Crea el primer doctor para comenzar</p>
              <Button onClick={handleCreateDoctor}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Doctor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <CreateDoctorModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onDoctorCreated={loadDoctors}
      />

      <UnifiedDoctorProfile
        isOpen={showDoctorProfile}
        onClose={() => {
          setShowDoctorProfile(false);
          setSelectedDoctor(null);
        }}
        doctor={selectedDoctor}
        onDoctorUpdated={loadDoctors}
      />

      <SubscriptionHistoryModal
        isOpen={showSubscriptionHistory}
        onClose={() => {
          setShowSubscriptionHistory(false);
          setSelectedDoctor(null);
        }}
        doctorProfileId={selectedDoctor?.id}
        doctorName={selectedDoctor?.full_name}
      />

      <DoctorAppointmentsDrawer
        isOpen={showAppointments}
        onClose={() => {
          setShowAppointments(false);
          setSelectedDoctor(null);
        }}
        doctorUserId={selectedDoctor?.doctor_user_id}
        doctorName={selectedDoctor?.full_name}
      />

      <Dialog open={showBadgeManager} onOpenChange={setShowBadgeManager}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Insignias de {selectedDoctor?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <DoctorBadgeManager 
              doctorUserId={selectedDoctor.doctor_user_id} 
              doctorName={selectedDoctor.full_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}