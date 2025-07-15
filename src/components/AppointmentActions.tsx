import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addDays, setHours, setMinutes, parseISO, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon,
  Clock,
  X,
  Edit,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  doctor_user_id: string;
  patient_user_id: string;
  notes?: string;
  patient_profile?: {
    full_name: string;
    phone: string;
  };
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AppointmentActionsProps {
  appointment: Appointment;
  userRole: 'patient' | 'doctor' | 'assistant' | 'admin';
  currentUserId: string;
  onAppointmentUpdated: () => void;
  showPatientName?: boolean;
}

export function AppointmentActions({
  appointment,
  userRole,
  currentUserId,
  onAppointmentUpdated,
  showPatientName = true
}: AppointmentActionsProps) {
  const { toast } = useToast();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Check if user can modify this appointment based on role and RLS rules
  const canModifyAppointment = () => {
    const appointmentDate = new Date(appointment.starts_at);
    const now = new Date();
    
    // Can't modify past appointments
    if (isBefore(appointmentDate, now)) {
      return false;
    }

    // Can't modify cancelled appointments
    if (appointment.status === 'cancelled') {
      return false;
    }

    switch (userRole) {
      case 'admin':
        return true;
      case 'patient':
        return appointment.patient_user_id === currentUserId;
      case 'doctor':
        return appointment.doctor_user_id === currentUserId;
      case 'assistant':
        // This will be validated by RLS using get_assigned_doctor_id()
        return true;
      default:
        return false;
    }
  };

  useEffect(() => {
    if (selectedDate && rescheduleDialogOpen) {
      fetchAvailableSlots();
    }
  }, [selectedDate, rescheduleDialogOpen]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;

    try {
      setLoading(true);
      const dayOfWeek = selectedDate.getDay();
      
      // Get doctor's availability for the selected day
      const { data: availability, error } = await supabase
        .from('doctor_availability')
        .select('start_time, end_time')
        .eq('doctor_user_id', appointment.doctor_user_id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (error) throw error;

      if (!availability || availability.length === 0) {
        setAvailableSlots([]);
        return;
      }

      // Get existing appointments for the selected date (excluding current appointment)
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('starts_at, ends_at')
        .eq('doctor_user_id', appointment.doctor_user_id)
        .gte('starts_at', startOfDay.toISOString())
        .lte('starts_at', endOfDay.toISOString())
        .neq('status', 'cancelled')
        .neq('id', appointment.id); // Exclude current appointment

      if (appointmentsError) throw appointmentsError;

      // Generate time slots
      const slots: TimeSlot[] = [];
      
      availability.forEach(({ start_time, end_time }) => {
        const startHour = parseInt(start_time.split(':')[0]);
        const startMinute = parseInt(start_time.split(':')[1]);
        const endHour = parseInt(end_time.split(':')[0]);
        const endMinute = parseInt(end_time.split(':')[1]);
        
        for (let hour = startHour; hour < endHour || (hour === endHour && startMinute < endMinute); hour++) {
          for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 30) {
            if (hour === endHour && minute >= endMinute) break;
            
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const slotDateTime = setMinutes(setHours(selectedDate, hour), minute);
            
            // Check if this slot is already booked
            const isBooked = appointments?.some(apt => {
              const appointmentStart = parseISO(apt.starts_at);
              const appointmentEnd = parseISO(apt.ends_at);
              return slotDateTime >= appointmentStart && slotDateTime < appointmentEnd;
            });

            // Check if slot is in the past
            const isPast = slotDateTime < new Date();
            
            slots.push({
              time: timeString,
              available: !isBooked && !isPast
            });
          }
        }
      });

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los horarios disponibles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    try {
      setLoading(true);
      
      const updateData: any = {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      };

      // Add cancellation reason to notes if provided
      if (cancelReason.trim()) {
        const existingNotes = appointment.notes || '';
        const cancelNote = `[Cancelada por ${userRole} el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}]: ${cancelReason}`;
        updateData.notes = existingNotes ? `${existingNotes}\n\n${cancelNote}` : cancelNote;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Cita Cancelada",
        description: "La cita ha sido cancelada correctamente"
      });

      setCancelDialogOpen(false);
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

  const handleRescheduleAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Campos requeridos",
        description: "Selecciona fecha y hora",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const [hour, minute] = selectedTime.split(':').map(Number);
      const newStartDateTime = setMinutes(setHours(selectedDate, hour), minute);
      const newEndDateTime = new Date(newStartDateTime.getTime() + 30 * 60000); // 30 minutes

      const updateData: any = {
        starts_at: newStartDateTime.toISOString(),
        ends_at: newEndDateTime.toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add reschedule reason to notes if provided
      if (rescheduleReason.trim()) {
        const existingNotes = appointment.notes || '';
        const rescheduleNote = `[Reprogramada por ${userRole} el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}]: ${rescheduleReason}`;
        updateData.notes = existingNotes ? `${existingNotes}\n\n${rescheduleNote}` : rescheduleNote;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Cita Reprogramada",
        description: `Cita reprogramada para el ${format(newStartDateTime, 'dd/MM/yyyy', { locale: es })} a las ${selectedTime}`
      });

      setRescheduleDialogOpen(false);
      setSelectedDate(undefined);
      setSelectedTime('');
      setRescheduleReason('');
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

  if (!canModifyAppointment()) {
    return null;
  }

  const appointmentDateTime = new Date(appointment.starts_at);
  const isToday = format(appointmentDateTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex gap-2">
      {/* Cancel Appointment */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Cancelar Cita
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  ¿Estás seguro de que deseas cancelar esta cita?
                </p>
                
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  {showPatientName && appointment.patient_profile && (
                    <p><strong>Paciente:</strong> {appointment.patient_profile.full_name}</p>
                  )}
                  <p><strong>Fecha:</strong> {format(appointmentDateTime, 'dd/MM/yyyy', { locale: es })}</p>
                  <p><strong>Hora:</strong> {format(appointmentDateTime, 'HH:mm')}</p>
                  {isToday && (
                    <Badge variant="destructive" className="text-xs">
                      ¡Cita para hoy!
                    </Badge>
                  )}
                </div>

                <div>
                  <Label htmlFor="cancel-reason">Motivo de cancelación (opcional)</Label>
                  <Textarea
                    id="cancel-reason"
                    placeholder="Explica brevemente el motivo..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener cita</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Cancelando...' : 'Sí, cancelar cita'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Appointment */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-1" />
            Reprogramar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Reprogramar Cita
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current appointment info */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="font-medium">Cita actual:</p>
              {showPatientName && appointment.patient_profile && (
                <p><strong>Paciente:</strong> {appointment.patient_profile.full_name}</p>
              )}
              <p><strong>Fecha:</strong> {format(appointmentDateTime, 'dd/MM/yyyy', { locale: es })}</p>
              <p><strong>Hora:</strong> {format(appointmentDateTime, 'HH:mm')}</p>
            </div>

            {/* New date selection */}
            <div className="space-y-2">
              <Label>Nueva fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP", { locale: es })
                    ) : (
                      <span>Selecciona una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today || date > addDays(today, 60);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time selection */}
            {selectedDate && (
              <div className="space-y-2">
                <Label>Nueva hora</Label>
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Cargando horarios...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-3 text-center border rounded-lg">
                    <p className="text-muted-foreground text-sm">No hay horarios disponibles para esta fecha</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={cn(
                          "text-xs",
                          !slot.available && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <Label htmlFor="reschedule-reason">Motivo del cambio (opcional)</Label>
              <Textarea
                id="reschedule-reason"
                placeholder="Explica brevemente el motivo..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRescheduleAppointment}
              disabled={!selectedDate || !selectedTime || loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Reprogramando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Reprogramar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}