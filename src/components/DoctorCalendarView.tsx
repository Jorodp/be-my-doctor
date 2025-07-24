import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfDay, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useDoctorSlots, useBookAppointment } from "@/hooks/useDoctorSlots";
import { useDoctorClinics } from "@/hooks/useDoctorClinics";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DoctorCalendarViewProps {
  doctorId?: string;
}

export function DoctorCalendarView({ doctorId }: DoctorCalendarViewProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<string>('all');

  const { data: clinics = [], isLoading: clinicsLoading } = useDoctorClinics(doctorId || '');
  const { data: slots = [], isLoading, error } = useDoctorSlots(doctorId || '', selectedDate, selectedClinic === 'all' ? undefined : selectedClinic);
  const bookAppointment = useBookAppointment();

  const hasAvailabilityForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    // Simulamos disponibilidad basada en los datos que ya tienes
    // Esto se puede mejorar con una query más eficiente
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Lun-Vie por ahora
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // HH:mm
  };

  const handleSlotSelect = (slotTime: string, clinicId: string) => {
    setSelectedSlot(slotTime);
    if (!selectedClinic) {
      setSelectedClinic(clinicId);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedSlot || !user || !selectedClinic) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha, hora y consultorio",
        variant: "destructive",
      });
      return;
    }

    const selectedSlotData = slots.find(slot => 
      slot.start_time === selectedSlot && slot.clinic_id === selectedClinic
    );

    if (!selectedSlotData) {
      toast({
        title: "Error",
        description: "El slot seleccionado no está disponible",
        variant: "destructive",
      });
      return;
    }

    try {
      await bookAppointment.mutateAsync({
        doctorUserId: doctorId || '',
        clinicId: selectedSlotData.clinic_id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedSlot,
        patientUserId: user.id,
      });

      toast({
        title: "¡Cita agendada!",
        description: `Tu cita ha sido programada exitosamente en ${selectedSlotData.clinic_name}`,
      });

      setSelectedSlot(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo agendar la cita. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <CalendarIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error al cargar horarios</h3>
        <p className="text-muted-foreground">
          No se pudieron cargar los horarios disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clinic Selection */}
      {clinics.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Consultorio</label>
          <Select value={selectedClinic} onValueChange={setSelectedClinic}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un consultorio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los consultorios</SelectItem>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name} - {clinic.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedSlot(null); // Reset selected slot when date changes
            }}
            className="rounded-md border"
            modifiers={{
              available: (date) => hasAvailabilityForDate(date),
              today: (date) => isToday(date)
            }}
            modifiersStyles={{
              available: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                borderRadius: '4px'
              },
              today: {
                backgroundColor: 'hsl(var(--accent))',
                color: 'hsl(var(--accent-foreground))',
                fontWeight: 'bold',
                border: '2px solid hsl(var(--primary))'
              }
            }}
            locale={es}
            disabled={(date) => date < startOfDay(new Date())}
          />
          
          {/* Legend */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-primary rounded"></div>
              <span>Días con horarios disponibles</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-accent border-2 border-primary rounded"></div>
              <span>Hoy</span>
            </div>
          </div>
        </div>

        {/* Available times for selected date */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
              {selectedDate ? (
                <>Horarios para {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                {selectedClinic && (
                  <div className="text-sm text-muted-foreground">
                    Consultorio: {clinics.find(c => c.id === selectedClinic)?.name}
                  </div>
                )}
                </>
              ) : (
                'Selecciona una fecha'
              )}
          </h3>
          
          {selectedDate && (
            <div className="space-y-3">
              {slots.length > 0 ? (
                <>
                  {slots.map((slot, index) => {
                    const slotId = `${slot.clinic_id}-${slot.start_time}-${slot.end_time}`;
                    const isSelected = selectedSlot === slot.start_time && selectedClinic === slot.clinic_id;
                    const isBooked = !slot.available;
                    
                    return (
                      <div
                        key={slotId}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isBooked 
                            ? 'bg-muted/50 border-muted' 
                            : isSelected
                            ? 'bg-primary/20 border-primary'
                            : 'bg-primary/5 border-primary/10 hover:bg-primary/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <Badge 
                              variant={isBooked ? "secondary" : isSelected ? "default" : "outline"} 
                              className={
                                isBooked 
                                  ? "text-muted-foreground" 
                                  : isSelected 
                                  ? "bg-primary text-primary-foreground"
                                  : "border-primary text-primary"
                              }
                            >
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </Badge>
                            <span className="text-xs text-muted-foreground mt-1">
                              {slot.clinic_name}
                            </span>
                          </div>
                          {isBooked && (
                            <span className="text-xs text-muted-foreground">Ocupado</span>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          className="px-6"
                          variant={isSelected ? "default" : "outline"}
                          disabled={isBooked}
                          onClick={() => handleSlotSelect(slot.start_time, slot.clinic_id)}
                        >
                          {isSelected ? "Seleccionado" : "Seleccionar"}
                        </Button>
                      </div>
                    );
                  })}
                  
                  {/* Book Appointment Button */}
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={handleBookAppointment}
                      disabled={!selectedSlot || bookAppointment.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {bookAppointment.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : selectedSlot ? (
                        `Agendar para ${formatTime(selectedSlot)}`
                      ) : (
                        'Selecciona una hora para agendar'
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">
                    No hay horarios disponibles para esta fecha.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Por favor selecciona otra fecha resaltada en el calendario.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}