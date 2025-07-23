import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  Calendar, 
  CreditCard,
  User,
  Stethoscope,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAdminProfileAPI } from '@/hooks/useAdminProfileAPI';
import { UnifiedDoctorProfile } from './UnifiedDoctorProfile';
import { SubscriptionHistoryModal } from './SubscriptionHistoryModal';
import { DoctorAppointmentsDrawer } from './DoctorAppointmentsDrawer';
import { Link } from 'react-router-dom';

interface DoctorListItem {
  doctor_user_id: string;
  full_name: string;
  specialty: string;
  verification_status: string;
  subscription_status: string;
  profile_complete: boolean;
  experience_years?: number;
  rating_avg?: number;
  rating_count?: number;
  cita_count: number;
}

interface DoctorListComponentProps {
  title?: string;
  showFilters?: boolean;
  limit?: number;
  showActions?: boolean;
  compact?: boolean;
}

export const DoctorListComponent: React.FC<DoctorListComponentProps> = ({
  title = "Lista de Médicos",
  showFilters = true,
  limit,
  showActions = true,
  compact = false
}) => {
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  
  // Modal states
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [unifiedProfileOpen, setUnifiedProfileOpen] = useState(false);
  const [showSubscriptionHistory, setShowSubscriptionHistory] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);

  const { toast } = useToast();
  const { listDoctors } = useAdminProfileAPI();

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [doctors, searchQuery, statusFilter, subscriptionFilter]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const data = await listDoctors();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los médicos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDoctors = () => {
    let filtered = [...doctors];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(doctor =>
        doctor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doctor => doctor.verification_status === statusFilter);
    }

    // Subscription filter
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(doctor => doctor.subscription_status === subscriptionFilter);
    }

    // Apply limit if specified
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    setFilteredDoctors(filtered);
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verificado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Activa
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Inactiva
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Expirada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewProfile = (doctor: DoctorListItem) => {
    setSelectedDoctor(doctor);
    setUnifiedProfileOpen(true);
  };

  const handleViewAppointments = (doctor: DoctorListItem) => {
    setSelectedDoctor(doctor);
    setShowAppointments(true);
  };

  const handleViewSubscriptions = (doctor: DoctorListItem) => {
    setSelectedDoctor(doctor);
    setShowSubscriptionHistory(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Stethoscope className="h-6 w-6" />
              {title}
            </span>
            <Badge variant="outline">
              {filteredDoctors.length} médicos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por nombre o especialidad..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="verified">Verificado</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Suscripción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las suscripciones</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Compact view for overview */}
          {compact ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doctor) => (
                <Card key={doctor.doctor_user_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-sm">{doctor.full_name}</h3>
                        <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {getVerificationBadge(doctor.verification_status)}
                        {getSubscriptionBadge(doctor.subscription_status)}
                      </div>
                    </div>
                    {showActions && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewProfile(doctor)}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Link to={`/admin/doctores/${doctor.doctor_user_id}`}>
                          <Button size="sm" className="flex-1">
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Full table view */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Médico</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Verificación</TableHead>
                    <TableHead>Suscripción</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Citas</TableHead>
                    {showActions && <TableHead>Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map((doctor) => (
                    <TableRow key={doctor.doctor_user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{doctor.full_name}</div>
                          {doctor.rating_avg && (
                            <div className="text-sm text-muted-foreground">
                              ⭐ {doctor.rating_avg.toFixed(1)} ({doctor.rating_count} reseñas)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{doctor.specialty}</TableCell>
                      <TableCell>{getVerificationBadge(doctor.verification_status)}</TableCell>
                      <TableCell>{getSubscriptionBadge(doctor.subscription_status)}</TableCell>
                      <TableCell>
                        <Badge variant={doctor.profile_complete ? "default" : "secondary"}>
                          {doctor.profile_complete ? "Completo" : "Incompleto"}
                        </Badge>
                      </TableCell>
                      <TableCell>{doctor.cita_count || 0}</TableCell>
                      {showActions && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewProfile(doctor)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Link to={`/admin/doctores/${doctor.doctor_user_id}`}>
                              <Button size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewAppointments(doctor)}
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewSubscriptions(doctor)}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredDoctors.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se encontraron médicos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <UnifiedDoctorProfile
        isOpen={unifiedProfileOpen}
        onClose={() => setUnifiedProfileOpen(false)}
        doctor={selectedDoctor}
        onDoctorUpdated={fetchDoctors}
      />

      {selectedDoctor && (
        <SubscriptionHistoryModal
          isOpen={showSubscriptionHistory}
          onClose={() => setShowSubscriptionHistory(false)}
          doctorProfileId={selectedDoctor.doctor_user_id}
          doctorName={selectedDoctor.full_name}
        />
      )}

      {selectedDoctor && (
        <DoctorAppointmentsDrawer
          isOpen={showAppointments}
          onClose={() => setShowAppointments(false)}
          doctorUserId={selectedDoctor.doctor_user_id}
          doctorName={selectedDoctor.full_name}
        />
      )}
    </div>
  );
};