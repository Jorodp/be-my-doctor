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
  Settings,
  Building
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
import { useDoctorClinics, DoctorClinic } from '@/hooks/useDoctorClinics';

interface Availability {
  id: string;
  clinic_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface DoctorCalendarScheduleProps {
  doctorId: string;
}

// Generar slots de tiempo cada 30 minutos de 00:00 a 23:30
const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

export const DoctorCalendarSchedule = ({ doctorId }: DoctorCalendarScheduleProps) => {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const { toast } = useToast();
  
  // Obtener clínicas del doctor
  const { data: clinics = [], isLoading: clinicsLoading } = useDoctorClinics(doctorId);

  useEffect(() => {
    if (clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id);
    }
  }, [clinics, selectedClinic]);

  useEffect(() => {
    if (selectedClinic) {
      fetchAvailability();
    }
  }, [selectedClinic]);

  // Cargar disponibilidad de TODAS las clínicas para mostrar correctamente los días disponibles
  useEffect(() => {
    if (clinics.length > 0) {
      fetchAllClinicsAvailability();
    }
  }, [clinics]);

  const fetchAvailability = async () => {
    if (!selectedClinic) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .eq('clinic_id', selectedClinic)
        .eq('is_active', true)
        .order('weekday')
        .order('start_time');

      if (error) throw error;

      setAvailability(data || []);
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

  const fetchAllClinicsAvailability = async () => {
    try {
      const clinicIds = clinics.map(c => c.id);
      
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .in('clinic_id', clinicIds)
        .eq('is_active', true)
        .order('weekday')
        .order('start_time');

      if (error) throw error;

      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching all clinics availability:', error);
    }
  };

  const addTimeSlot = async () => {
    // Validación más estricta y clara
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Selecciona una fecha en el calendario",
        variant: "destructive"
      });
      return;
    }

    if (!selectedClinic) {
      toast({
        title: "Error",
        description: "Selecciona un consultorio",
        variant: "destructive"
      });
      return;
    }

    if (!newStartTime) {
      toast({
        title: "Error", 
        description: "Selecciona la hora de inicio",
        variant: "destructive"
      });
      return;
    }

    if (!newEndTime) {
      toast({
        title: "Error",
        description: "Selecciona la hora de fin", 
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
      // Convertir día de la semana (0=domingo, 1=lunes) a formato interno (0=lunes, 6=domingo)
      const jsDay = selectedDate.getDay();
      const weekday = jsDay === 0 ? 6 : jsDay - 1;

      const { error } = await supabase
        .from('availabilities')
        .insert({
          clinic_id: selectedClinic,
          weekday: weekday,
          start_time: newStartTime,
          end_time: newEndTime,
          is_active: true
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
      const { error } = await supabase
        .from('availabilities')
        .update({ is_active: !currentStatus })
        .eq('id', availabilityId);

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
    if (!selectedClinic) return [];
    // Convertir día de la semana (0=domingo, 1=lunes) a formato interno (0=lunes, 6=domingo)
    const jsDay = date.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;
    
    return availability.filter(slot => 
      slot.clinic_id === selectedClinic && slot.weekday === weekday && slot.is_active
    );
  };

  const hasAvailability = (date: Date) => {
    // Verificar disponibilidad en TODAS las clínicas del doctor, no solo la seleccionada
    const jsDay = date.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;
    
    return availability.some(slot => 
      slot.weekday === weekday && slot.is_active
    );
  };

  const getSelectedDateSlots = () => {
    if (!selectedDate) return [];
    return getDateAvailability(selectedDate);
  };

  if (clinicsLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-semibold mb-2">No tienes consultorios registrados</p>
          <p className="text-muted-foreground">
            Necesitas tener al menos un consultorio para configurar horarios.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedClinicInfo = clinics.find(c => c.id === selectedClinic);

  return (
    <div className="space-y-6">
      {/* Selector de consultorio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Seleccionar Consultorio
          </CardTitle>
          <CardDescription>
            Cada consultorio tiene su propia agenda independiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClinic} onValueChange={setSelectedClinic}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un consultorio" />
            </SelectTrigger>
            <SelectContent>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{clinic.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {clinic.address}, {clinic.city}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Calendario de Disponibilidad
              {selectedClinicInfo && (
                <Badge variant="outline" className="ml-2">
                  {selectedClinicInfo.name}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Selecciona una fecha para ver y gestionar los horarios de {selectedClinicInfo?.name}
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
                {selectedClinicInfo && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedClinicInfo.name}
                  </Badge>
                )}
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="flex items-center gap-2"
                    disabled={!selectedDate || !selectedClinic}
                  >
                    <Plus className="h-4 w-4" />
                    {!selectedClinic ? 'Selecciona consultorio' : !selectedDate ? 'Selecciona fecha' : 'Agregar'}
                  </Button>
                </DialogTrigger>
                  <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Horario</DialogTitle>
                    <DialogDescription>
                      {selectedDate ? (
                        <>Configura un nuevo horario para {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</>
                      ) : (
                        'Selecciona primero una fecha en el calendario'
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  
                  {!selectedDate ? (
                    <div className="text-center py-6">
                      <CalendarX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Selecciona una fecha en el calendario para continuar</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-accent/20 rounded-lg">
                        <p className="text-sm font-medium text-accent-foreground">
                          📅 {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Hora de inicio</label>
                          <Select value={newStartTime} onValueChange={setNewStartTime}>
                            <SelectTrigger>
                              <SelectValue placeholder="08:00" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.slice(16, 40).map((time) => ( // 08:00 to 19:30
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-2 block">Hora de fin</label>
                          <Select value={newEndTime} onValueChange={setNewEndTime}>
                            <SelectTrigger>
                              <SelectValue placeholder="18:00" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.slice(17, 48).map((time) => ( // 08:30 to 23:30
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button 
                          onClick={addTimeSlot} 
                          className="flex-1"
                          disabled={!newStartTime || !newEndTime}
                        >
                          {!newStartTime || !newEndTime ? 'Completa los horarios' : 'Agregar Horario'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setDialogOpen(false);
                            setNewStartTime('');
                            setNewEndTime('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
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
                        <Badge variant={slot.is_active ? "default" : "secondary"}>
                          {slot.is_active ? "Disponible" : "No disponible"}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAvailability(slot.id, slot.is_active)}
                        className="flex items-center gap-2"
                      >
                        {slot.is_active ? (
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