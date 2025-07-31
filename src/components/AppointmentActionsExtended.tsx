import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateTimeInMexicoTZ } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  Clock,
  X,
  Edit3,
  AlertTriangle
} from 'lucide-react';

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  patient_user_id: string;
  doctor_user_id: string;
  patient_profile?: {
    full_name: string;
    phone: string;
  };
}

interface AppointmentActionsProps {
  appointment: Appointment;
  userRole: string;
  currentUserId: string;
  onAppointmentUpdated: () => void;
  showPatientName?: boolean;
}

export function AppointmentActionsExtended({ 
  appointment, 
  userRole, 
  currentUserId, 
  onAppointmentUpdated,
  showPatientName = true 
}: AppointmentActionsProps) {
  const { toast } = useToast();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Reschedule form state
  const [newDate, setNewDate] = useState<Date>();
  const [newTime, setNewTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  // Cancel form state
  const [cancelReason, setCancelReason] = useState('');

  const canModifyAppointment = () => {
    if (userRole === 'admin') return true;
    if (userRole === 'doctor' && appointment.doctor_user_id === currentUserId) return true;
    if (userRole === 'assistant') return true; // Assuming assistants can modify their doctor's appointments
    if (userRole === 'patient' && appointment.patient_user_id === currentUserId) return true;
    return false;
  };

  const canCancelAppointment = () => {
    return canModifyAppointment() && appointment.status === 'scheduled';
  };

  const canRescheduleAppointment = () => {
    return canModifyAppointment() && appointment.status === 'scheduled';
  };

  const generateTimeSlots = async (date: Date) => {
    if (!date) return;

    // Get existing appointments for the selected date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('starts_at, ends_at')
      .eq('doctor_user_id', appointment.doctor_user_id)
      .gte('starts_at', startOfDay.toISOString())
      .lte('starts_at', endOfDay.toISOString())
      .neq('status', 'cancelled')
      .neq('id', appointment.id); // Exclude current appointment

    if (error) {
      console.error('Error fetching appointments:', error);
      return;
    }

    // Generate available time slots (8 AM to 6 PM)
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const slotDateTime = setMinutes(setHours(date, hour), 0);
      
      // Check if this slot is already booked
      const isBooked = appointments?.some(apt => {
        const appointmentStart = new Date(apt.starts_at);
        const appointmentEnd = new Date(apt.ends_at);
        return slotDateTime >= appointmentStart && slotDateTime < appointmentEnd;
      });

      // Check if slot is in the past
      const isPast = slotDateTime < new Date();
      
      if (!isBooked && !isPast) {
        slots.push(timeString);
      }
    }
    
    setAvailableSlots(slots);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setNewDate(date);
    setNewTime('');
    if (date) {
      generateTimeSlots(date);
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      toast({
        title: "Error",
        description: "Selecciona fecha y hora",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const [hours, minutes] = newTime.split(':');
      const newStartTime = setMinutes(setHours(newDate, parseInt(hours)), parseInt(minutes || '0'));
      const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000); // 1 hour

      const { error } = await supabase
        .from('appointments')
        .update({
          starts_at: newStartTime.toISOString(),
          ends_at: newEndTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Cita reprogramada",
        description: `La cita ha sido reprogramada para el ${formatDateTimeInMexicoTZ(newStartTime)} a las ${newTime}`,
      });

      setRescheduleOpen(false);
      setNewDate(undefined);
      setNewTime('');
      onAppointmentUpdated();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo reprogramar la cita",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast({
        title: "Error",
        description: "Proporciona un motivo para la cancelación",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: cancelReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Cita cancelada",
        description: "La cita ha sido cancelada exitosamente",
      });

      setCancelOpen(false);
      setCancelReason('');
      onAppointmentUpdated();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la cita",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Badge variant={getStatusColor(appointment.status)}>
        {getStatusText(appointment.status)}
      </Badge>
      
      {showPatientName && appointment.patient_profile && (
        <p className="text-sm font-medium">{appointment.patient_profile.full_name}</p>
      )}
      
      <div className="text-xs text-muted-foreground">
        {formatDateTimeInMexicoTZ(appointment.starts_at)}
      </div>

      {appointment.status === 'scheduled' && (
        <div className="flex gap-1">
          {/* Reschedule Button */}
          {canRescheduleAppointment() && (
            <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Edit3 className="h-3 w-3 mr-1" />
                  Reprogramar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Reprogramar Cita</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nueva Fecha</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newDate ? format(newDate, "PPP", { locale: es }) : "Selecciona fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newDate}
                          onSelect={handleDateSelect}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today || date > addDays(today, 60);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {newDate && (
                    <div>
                      <Label>Nueva Hora</Label>
                      <Select value={newTime} onValueChange={setNewTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {slot}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleReschedule} 
                      disabled={!newDate || !newTime || loading}
                      className="flex-1"
                    >
                      {loading ? "Reprogramando..." : "Confirmar"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setRescheduleOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Cancel Button */}
          {canCancelAppointment() && (
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Cancelar Cita
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive">
                      Esta acción cancelará permanentemente la cita. ¿Estás seguro?
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="cancelReason">Motivo de cancelación</Label>
                    <Textarea
                      id="cancelReason"
                      placeholder="Explica el motivo de la cancelación..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="destructive"
                      onClick={handleCancel} 
                      disabled={!cancelReason.trim() || loading}
                      className="flex-1"
                    >
                      {loading ? "Cancelando..." : "Confirmar Cancelación"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setCancelOpen(false)}
                    >
                      Volver
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}