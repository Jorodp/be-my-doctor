import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Edit, Calendar, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminProfileAPI } from '@/hooks/useAdminProfileAPI';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EditDoctorProfile } from './EditDoctorProfile';

interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  specialty: string;
  verification_status: string;
  subscription_status: string;
  upcoming_appointments: number;
  past_appointments: number;
}

interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  professional_license: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  office_address: string | null;
  office_phone: string | null;
  practice_locations: string[] | null;
  consultorios: any[] | null;
  profile_image_url: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  email: string | null;
}

interface Appointment {
  appointment_id: string;
  patient_user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number | null;
  notes: string | null;
}

export const DoctorsList = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<DoctorProfile | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAppointments, setShowAppointments] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  
  const { toast } = useToast();
  const { 
    loading, 
    listDoctors, 
    getDoctorProfile, 
    updateDoctorProfile,
    updateUserProfile,
    getDoctorAppointments 
  } = useAdminProfileAPI();

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [doctors, searchTerm, statusFilter]);

  const fetchDoctors = async () => {
    try {
      const doctorsData = await listDoctors();
      setDoctors(doctorsData);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const filterDoctors = () => {
    let filtered = doctors;

    if (searchTerm) {
      filtered = filtered.filter(doctor => 
        doctor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(doctor => doctor.verification_status === statusFilter);
    }

    setFilteredDoctors(filtered);
  };

  const handleViewProfile = async (doctor: Doctor) => {
    try {
      setSelectedDoctor(doctor);
      const { profile, doctorProfile } = await getDoctorProfile(doctor.user_id);
      
      // Asegurar que tenemos todos los campos requeridos con casting seguro
      const completeProfile: UserProfile = {
        ...profile,
        email: (profile as any).email || null
      };
      
      const completeDoctorProfile: DoctorProfile = {
        ...doctorProfile,
        profile_image_url: (doctorProfile as any).profile_image_url || null,
        verification_status: ((doctorProfile as any).verification_status as 'pending' | 'verified' | 'rejected') || 'pending'
      };
      
      setSelectedUserProfile(completeProfile);
      setSelectedDoctorProfile(completeDoctorProfile);
      setEditProfileOpen(true);
    } catch (error) {
      console.error('Error loading doctor profile:', error);
    }
  };

  const handleViewAppointments = async (doctor: Doctor) => {
    try {
      setSelectedDoctor(doctor);
      const appointmentsData = await getDoctorAppointments(doctor.user_id);
      setAppointments(appointmentsData);
      setShowAppointments(true);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const handleUpdateProfile = async (userData: any, doctorData: any) => {
    if (!selectedDoctor) return;
    
    try {
      await updateUserProfile(selectedDoctor.user_id, userData);
      await updateDoctorProfile(selectedDoctor.user_id, doctorData);
      setEditProfileOpen(false);
      fetchDoctors();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const getStatusBadge = (status: string) => {
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
  };

  const getSubscriptionBadge = (status: string) => {
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
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Doctores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o especialidad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="verified">Verificados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="rejected">Rechazados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Doctors Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Verificación</TableHead>
                  <TableHead>Suscripción</TableHead>
                  <TableHead>Citas Próximas</TableHead>
                  <TableHead>Citas Pasadas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">
                      Dr. {doctor.full_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell>{doctor.specialty}</TableCell>
                    <TableCell>
                      {getStatusBadge(doctor.verification_status)}
                    </TableCell>
                    <TableCell>
                      {getSubscriptionBadge(doctor.subscription_status)}
                    </TableCell>
                    <TableCell>{doctor.upcoming_appointments}</TableCell>
                    <TableCell>{doctor.past_appointments}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewProfile(doctor)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Perfil
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewAppointments(doctor)}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Ver Citas
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredDoctors.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron doctores con los filtros aplicados
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Doctor Profile Dialog */}
      {editProfileOpen && selectedDoctorProfile && selectedUserProfile && (
        <EditDoctorProfile
          isOpen={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          doctorProfile={selectedDoctorProfile}
          profile={selectedUserProfile}
          onProfileUpdated={fetchDoctors}
        />
      )}

      {/* Appointments Dialog */}
      <Dialog open={showAppointments} onOpenChange={setShowAppointments}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Citas de Dr. {selectedDoctor?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.appointment_id}>
                    <TableCell className="font-mono text-xs">
                      {appointment.appointment_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {appointment.patient_user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {new Date(appointment.starts_at).toLocaleString('es-ES')}
                    </TableCell>
                    <TableCell>
                      {new Date(appointment.ends_at).toLocaleString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                        {appointment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {appointment.price ? `$${appointment.price}` : 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {appointment.notes || 'Sin notas'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {appointments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron citas para este doctor
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};