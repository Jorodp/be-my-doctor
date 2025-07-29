import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  Clock, 
  CalendarCheck, 
  CalendarX, 
  Plus,
  Trash2,
  Building2,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon
} from "lucide-react";
import { format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDoctorClinics } from "@/hooks/useDoctorClinics";
import { useUnifiedDoctorAvailability, useUnifiedScheduleManagement } from "@/hooks/useUnifiedAvailability";

interface UnifiedScheduleManagerProps {
  doctorId: string;
  title?: string;
  description?: string;
  readOnly?: boolean;
}

// Generar slots de tiempo cada 30 minutos de 06:00 a 22:00
const timeSlots = Array.from({ length: 32 }, (_, i) => {
  const totalMinutes = (i * 30) + (6 * 60); // Start from 6:00 AM
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

export const UnifiedScheduleManager = ({ 
  doctorId, 
  title = "Gestión de Horarios", 
  description = "Administra los horarios de atención médica",
  readOnly = false
}: UnifiedScheduleManagerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const { toast } = useToast();
  
  // Hooks unificados
  const { data: clinics = [], isLoading: clinicsLoading } = useDoctorClinics(doctorId);
  const { data: globalAvailabilityMap = {} } = useUnifiedDoctorAvailability(doctorId);
  const {
    availabilities,
    isLoading,
    addAvailability,
    toggleAvailability,
    deleteAvailability,
    isAddingAvailability,
    isTogglingAvailability,
    isDeletingAvailability
  } = useUnifiedScheduleManagement(doctorId, selectedClinic);

  useEffect(() => {
    if (clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id);
    }
  }, [clinics, selectedClinic]);

  const handleAddTimeSlot = async () => {
    if (!selectedDate || !selectedClinic || !newStartTime || !newEndTime) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
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

      await addAvailability({
        clinicId: selectedClinic,
        weekday,
        startTime: newStartTime,
        endTime: newEndTime
      });

      setDialogOpen(false);
      setNewStartTime('');
      setNewEndTime('');

      toast({
        title: "¡Éxito!",
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

  const handleToggleAvailability = async (availabilityId: string, currentStatus: boolean) => {
    try {
      await toggleAvailability({ availabilityId, isActive: currentStatus });
      toast({
        title: "¡Actualizado!",
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

  const handleDeleteAvailability = async (availabilityId: string) => {
    try {
      await deleteAvailability(availabilityId);
      toast({
        title: "¡Eliminado!",
        description: "Horario eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el horario",
        variant: "destructive"
      });
    }
  };

  const getDateAvailability = (date: Date) => {
    if (!selectedClinic) return [];
    // Convertir día de la semana (0=domingo, 1=lunes) a formato interno (0=lunes, 6=domingo)
    const jsDay = date.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;
    
    return availabilities.filter(slot => 
      slot.clinic_id === selectedClinic && slot.weekday === weekday
    );
  };

  const hasAvailability = (date: Date) => {
    // Usar el mapa global de disponibilidad para consistencia
    const dayOfWeek = date.getDay();
    return globalAvailabilityMap[dayOfWeek] || false;
  };

  const getSelectedDateSlots = () => {
    if (!selectedDate) return [];
    return getDateAvailability(selectedDate);
  };

  if (clinicsLoading || isLoading) {
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
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-semibold mb-2">No hay consultorios registrados</p>
          <p className="text-muted-foreground">
            Se necesita tener al menos un consultorio para configurar horarios.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedClinicInfo = clinics.find(c => c.id === selectedClinic);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Estado:</span>
              <Badge variant="default" className="bg-primary">
                Sistema Unificado Activo
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Los horarios se sincronizan automáticamente entre doctor, asistentes y pacientes
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selector de consultorio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seleccionar Consultorio
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada consultorio mantiene su agenda independiente
          </p>
        </CardHeader>
        <CardContent>
          <Select value={selectedClinic} onValueChange={setSelectedClinic}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecciona un consultorio" />
            </SelectTrigger>
            <SelectContent>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">{clinic.name}</span>
                    <span className="text-xs text-muted-foreground">
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
              <CalendarIcon className="h-5 w-5" />
              Calendario de Disponibilidad
              {selectedClinicInfo && (
                <Badge variant="outline" className="ml-2">
                  {selectedClinicInfo.name}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Los días resaltados indican disponibilidad en cualquier consultorio
            </p>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={es}
              className="rounded-md border w-full"
              modifiers={{
                available: (date) => hasAvailability(date),
                today: (date) => isToday(date)
              }}
              modifiersStyles={{
                available: { 
                  backgroundColor: 'hsl(var(--primary))', 
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold',
                  borderRadius: '8px'
                },
                today: { 
                  backgroundColor: 'hsl(var(--accent))',
                  color: 'hsl(var(--accent-foreground))',
                  fontWeight: 'bold',
                  border: '2px solid hsl(var(--primary))',
                  borderRadius: '8px'
                }
              }}
              fromDate={new Date()}
            />
            
            {/* Leyenda mejorada */}
            <div className="mt-6 space-y-3 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm">Leyenda del Calendario</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded bg-primary"></div>
                  <span>Días con horarios disponibles</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded bg-accent border-2 border-primary"></div>
                  <span className="font-medium">Día actual</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded bg-muted border"></div>
                  <span>Días sin disponibilidad</span>
                </div>
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
                <div className="flex flex-col">
                  <span>
                    Horarios del {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : 'día seleccionado'}
                  </span>
                  {selectedDate && isToday(selectedDate) && (
                    <Badge variant="secondary" className="w-fit mt-1">
                      HOY
                    </Badge>
                  )}
                </div>
                {selectedClinicInfo && (
                  <Badge variant="outline" className="ml-2">
                    {selectedClinicInfo.name}
                  </Badge>
                )}
              </div>
              {!readOnly && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="flex items-center gap-2"
                      disabled={!selectedDate || !selectedClinic || isAddingAvailability}
                    >
                      <Plus className="h-4 w-4" />
                      {!selectedClinic ? 'Selecciona consultorio' : !selectedDate ? 'Selecciona fecha' : 'Agregar'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nuevo Horario</DialogTitle>
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
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                            {isToday(selectedDate) && (
                              <Badge variant="secondary" className="text-xs">HOY</Badge>
                            )}
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
                                {timeSlots.slice(4, 30).map((time) => ( // 08:00 to 20:30
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
                                {timeSlots.slice(5, 32).map((time) => ( // 08:30 to 22:00
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
                            onClick={handleAddTimeSlot} 
                            className="flex-1"
                            disabled={!newStartTime || !newEndTime || isAddingAvailability}
                          >
                            {isAddingAvailability ? (
                              <div className="flex items-center gap-2">
                                <LoadingSpinner size="sm" />
                                <span>Agregando...</span>
                              </div>
                            ) : (
                              !newStartTime || !newEndTime ? 'Completa los horarios' : 'Agregar Horario'
                            )}
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
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getSelectedDateSlots().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarX className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-medium">No hay horarios configurados para este día</p>
                    <p className="text-sm">
                      {readOnly ? 'Este día no tiene horarios disponibles' : 'Haz clic en "Agregar" para crear uno'}
                    </p>
                  </div>
                ) : (
                  getSelectedDateSlots().map((slot) => (
                    <div key={slot.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all duration-200 ${
                      slot.is_active 
                        ? 'bg-gradient-to-r from-background to-primary/5 border-primary/20' 
                        : 'bg-muted/30 border-muted'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          slot.is_active ? 'bg-primary' : 'bg-muted-foreground'
                        }`}></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {slot.start_time} - {slot.end_time}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {slot.clinic_name}
                          </span>
                        </div>
                        <Badge variant={slot.is_active ? "default" : "secondary"} className="ml-2">
                          {slot.is_active ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Disponible
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              No disponible
                            </div>
                          )}
                        </Badge>
                      </div>
                      
                      {!readOnly && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAvailability(slot.id, slot.is_active)}
                            disabled={isTogglingAvailability}
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAvailability(slot.id)}
                            disabled={isDeletingAvailability}
                            className="flex items-center gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4" />
                <p className="font-medium">Selecciona una fecha en el calendario</p>
                <p className="text-sm">Elige un día para ver y gestionar los horarios</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};