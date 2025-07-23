import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAdminProfileAPI } from '@/hooks/useAdminProfileAPI';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Appointment {
  appointment_id: string;
  patient_user_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number | null;
  notes: string | null;
}

interface DoctorAppointmentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  doctorUserId: string;
  doctorName: string;
}

export const DoctorAppointmentsDrawer = ({
  isOpen,
  onClose,
  doctorUserId,
  doctorName
}: DoctorAppointmentsDrawerProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { getDoctorAppointments } = useAdminProfileAPI();

  const loadAppointments = async () => {
    if (!doctorUserId) return;
    
    try {
      setLoading(true);
      const appointmentsData = await getDoctorAppointments(doctorUserId);
      setAppointments(appointmentsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las citas del doctor',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && doctorUserId) {
      loadAppointments();
    }
  }, [isOpen, doctorUserId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Programada</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'no_show':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">No asistió</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return 'No definido';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Citas de {doctorName}</DrawerTitle>
          <DrawerDescription>
            Historial completo de citas del doctor
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <>
              {appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID de Cita</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Fecha y Hora</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment) => (
                        <TableRow key={appointment.appointment_id}>
                          <TableCell className="font-mono text-sm">
                            {appointment.appointment_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {appointment.patient_user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {formatDateTime(appointment.starts_at)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(appointment.status)}
                          </TableCell>
                          <TableCell>
                            {formatPrice(appointment.price)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {appointment.notes || 'Sin notas'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Este doctor no tiene citas registradas
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};