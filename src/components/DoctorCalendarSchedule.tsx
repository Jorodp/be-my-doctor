import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Clock, 
  CalendarCheck, 
  CalendarX, 
  Plus,
  Trash2,
  Settings
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Availability {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface DoctorCalendarScheduleProps {
  doctorId: string;
}

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

export const DoctorCalendarSchedule = ({ doctorId }: DoctorCalendarScheduleProps) => {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailability();
  }, [doctorId]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_user_id', doctorId)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      // Convert day_of_week based availability to date-based for the next 3 months
      const dateAvailability: Availability[] = [];
      const today = new Date();
      
      for (let i = 0; i < 90; i++) {
        const currentDate = addDays(today, i);
        const dayOfWeek = currentDate.getDay();
        
        const dayAvailability = data?.filter(slot => 
          slot.day_of_week === dayOfWeek && slot.is_available
        ) || [];

        dayAvailability.forEach(slot => {
          dateAvailability.push({
            id: `${currentDate.toISOString().split('T')[0]}-${slot.id}`,
            date: currentDate.toISOString().split('T')[0],
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_available: slot.is_available
          });
        });
      }

      setAvailability(dateAvailability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la disponibilidad",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = async () => {
    if (!selectedDate || !newStartTime || !newEndTime) {
      toast({
        title: "Error",
        description: "Selecciona fecha, hora de inicio y fin",
        variant: "destructive"
      });
      return;
    }

    if (newStartTime >= newEndTime) {
      toast({
        title: "Error",
        description: "La hora de inicio debe ser anterior a la hora de fin",
        variant: "destructive"
      });
      return;
    }

    try {
      const dayOfWeek = selectedDate.getDay();

      const { error } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_user_id: doctorId,
          day_of_week: dayOfWeek,
          start_time: newStartTime,
          end_time: newEndTime,
          is_available: true
        });

      if (error) throw error;

      await fetchAvailability();
      setDialogOpen(false);
      setNewStartTime('');
      setNewEndTime('');

      toast({
        title: "Éxito",
        description: "Horario agregado correctamente",
      });
    } catch (error) {
      console.error('Error adding time slot:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el horario",
        variant: "destructive"
      });
    }
  };

  const toggleAvailability = async (availabilityId: string, currentStatus: boolean) => {
    try {
      const slotIdParts = availabilityId.split('-');
      const originalId = slotIdParts[slotIdParts.length - 1];

      const { error } = await supabase
        .from('doctor_availability')
        .update({ is_available: !currentStatus })
        .eq('id', originalId);

      if (error) throw error;

      await fetchAvailability();

      toast({
        title: "Éxito",
        description: `Horario ${!currentStatus ? 'habilitado' : 'deshabilitado'}`,
      });
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la disponibilidad",
        variant: "destructive"
      });
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return availability.filter(slot => slot.date === dateStr);
  };

  const hasAvailability = (date: Date) => {
    return getDateAvailability(date).length > 0;
  };

  const getSelectedDateSlots = () => {
    if (!selectedDate) return [];
    return getDateAvailability(selectedDate);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Calendario de Disponibilidad
            </CardTitle>
            <CardDescription>
              Selecciona una fecha para ver y gestionar tus horarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={es}
              className="rounded-md border"
              modifiers={{
                available: (date) => hasAvailability(date),
                today: (date) => isSameDay(date, new Date())
              }}
              modifiersStyles={{
                available: { 
                  backgroundColor: 'hsl(var(--primary))', 
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold'
                },
                today: { 
                  backgroundColor: 'hsl(var(--accent))',
                  color: 'hsl(var(--accent-foreground))'
                }
              }}
              fromDate={new Date()}
              toDate={addDays(new Date(), 90)}
            />
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-primary"></div>
                <span>Días con disponibilidad</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-accent"></div>
                <span>Día actual</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Slots Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horarios del {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : 'día seleccionado'}
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Horario</DialogTitle>
                    <DialogDescription>
                      Configura un nuevo horario para {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : 'el día seleccionado'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Hora de inicio</label>
                      <Select value={newStartTime} onValueChange={setNewStartTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar hora de inicio" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Hora de fin</label>
                      <Select value={newEndTime} onValueChange={setNewEndTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar hora de fin" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={addTimeSlot} className="flex-1">
                        Agregar Horario
                      </Button>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-3">
                {getSelectedDateSlots().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarX className="h-12 w-12 mx-auto mb-4" />
                    <p>No hay horarios configurados para este día</p>
                    <p className="text-sm">Haz clic en "Agregar" para crear uno</p>
                  </div>
                ) : (
                  getSelectedDateSlots().map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {slot.start_time} - {slot.end_time}
                        </span>
                        <Badge variant={slot.is_available ? "default" : "secondary"}>
                          {slot.is_available ? "Disponible" : "No disponible"}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAvailability(slot.id, slot.is_available)}
                        className="flex items-center gap-2"
                      >
                        {slot.is_available ? (
                          <>
                            <CalendarX className="h-4 w-4" />
                            Deshabilitar
                          </>
                        ) : (
                          <>
                            <CalendarCheck className="h-4 w-4" />
                            Habilitar
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4" />
                <p>Selecciona una fecha en el calendario</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};