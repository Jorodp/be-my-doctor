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
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAdminProfileAPI } from '@/hooks/useAdminProfileAPI';
import { SubscriptionHistoryModal } from '@/components/admin/SubscriptionHistoryModal';
import { DoctorAppointmentsDrawer } from '@/components/admin/DoctorAppointmentsDrawer';
import { Eye, Calendar, CreditCard, Edit } from 'lucide-react';

interface DoctorListItem {
  doctor_user_id: string;
  full_name: string;
  specialty: string;
  verification_status: string;
  subscription_status: string;
  profile_complete: boolean;
  cita_count: number;
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showSubscriptionHistory, setShowSubscriptionHistory] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  
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

  const handleViewAppointments = (doctor: DoctorListItem) => {
    setSelectedDoctor(doctor);
    setShowAppointments(true);
  };

  const handleViewSubscriptions = (doctor: DoctorListItem) => {
    setSelectedDoctor(doctor);
    setShowSubscriptionHistory(true);
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800">Verificado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">No verificado</Badge>;
    }
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Activa</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactiva</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirada</Badge>;
      default:
        return <Badge variant="outline">Sin suscripción</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Doctores</h1>
          <p className="text-muted-foreground">
            Administra los perfiles, verificaciones y suscripciones de los doctores
          </p>
        </div>
        <Button onClick={loadDoctors} disabled={apiLoading}>
          Actualizar
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Verificado</TableHead>
                <TableHead>Suscripción</TableHead>
                <TableHead>Perfil completo</TableHead>
                <TableHead># Citas</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.doctor_user_id}>
                  <TableCell className="font-medium">
                    {doctor.full_name || 'Sin nombre'}
                  </TableCell>
                  <TableCell>{doctor.specialty || 'Sin especialidad'}</TableCell>
                  <TableCell>
                    {getVerificationBadge(doctor.verification_status)}
                  </TableCell>
                  <TableCell>
                    {getSubscriptionBadge(doctor.subscription_status)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={doctor.profile_complete ? "default" : "outline"}>
                      {doctor.profile_complete ? "Completo" : "Incompleto"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {doctor.cita_count || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link to={`/admin/doctores/${doctor.doctor_user_id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewAppointments(doctor)}
                        className="flex items-center gap-1"
                      >
                        <Calendar className="h-4 w-4" />
                        Citas
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSubscriptions(doctor)}
                        className="flex items-center gap-1"
                      >
                        <CreditCard className="h-4 w-4" />
                        Suscripciones
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {doctors.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron doctores</p>
          </div>
        )}
      </Card>

      {/* Subscription History Modal */}
      <SubscriptionHistoryModal
        isOpen={showSubscriptionHistory}
        onClose={() => {
          setShowSubscriptionHistory(false);
          setSelectedDoctor(null);
        }}
        doctorProfileId={selectedDoctor?.id}
        doctorName={selectedDoctor?.full_name}
      />

      {/* Appointments Drawer */}
      <DoctorAppointmentsDrawer
        isOpen={showAppointments}
        onClose={() => {
          setShowAppointments(false);
          setSelectedDoctor(null);
        }}
        doctorUserId={selectedDoctor?.doctor_user_id}
        doctorName={selectedDoctor?.full_name}
      />
    </div>
  );
}