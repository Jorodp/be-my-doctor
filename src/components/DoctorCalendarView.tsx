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
    <div className="space-y-8">
      {/* Clinic Selection */}
      {clinics.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <label className="text-sm font-semibold text-foreground">Selecciona un Consultorio</label>
          </div>
          <Select value={selectedClinic} onValueChange={setSelectedClinic}>
            <SelectTrigger className="h-12 border-primary/20 focus:border-primary">
              <SelectValue placeholder="Elige el consultorio de tu preferencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                  <span>Todos los consultorios</span>
                </div>
              </SelectItem>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id} className="py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{clinic.name}</span>
                    <span className="text-xs text-muted-foreground">{clinic.address}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Calendar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Calendario</h3>
          </div>
          <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedSlot(null); // Reset selected slot when date changes
              }}
              className="rounded-lg bg-background shadow-sm w-full"
              modifiers={{
                available: (date) => hasAvailabilityForDate(date),
                today: (date) => isToday(date)
              }}
              modifiersStyles={{
                available: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  borderRadius: '8px',
                  fontWeight: '600'
                },
                today: {
                  backgroundColor: 'hsl(var(--accent))',
                  color: 'hsl(var(--accent-foreground))',
                  fontWeight: 'bold',
                  border: '2px solid hsl(var(--primary))',
                  borderRadius: '8px'
                }
              }}
              locale={es}
              disabled={(date) => date < startOfDay(new Date())}
            />
          </div>
          
          {/* Legend */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-sm text-foreground">Leyenda</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 bg-primary rounded-lg"></div>
                <span>Días con horarios disponibles</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 bg-accent border-2 border-primary rounded-lg"></div>
                <span>Hoy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Available times for selected date */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Horarios Disponibles</h3>
          </div>
          
          {selectedDate ? (
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex flex-col gap-1">
                  <h4 className="font-medium text-foreground">
                    {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                  </h4>
                  {selectedClinic !== 'all' && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Consultorio: {clinics.find(c => c.id === selectedClinic)?.name}</span>
                    </div>
                  )}
                  {selectedClinic === 'all' && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      <span>Mostrando horarios de todos los consultorios</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {slots.length > 0 ? (
                  <>
                    {slots.map((slot, index) => {
                      const slotId = `${slot.clinic_id}-${slot.start_time}-${slot.end_time}`;
                      const isSelected = selectedSlot === slot.start_time && selectedClinic === slot.clinic_id;
                      const isBooked = !slot.available;
                      
                      return (
                        <div
                          key={slotId}
                          className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                            isBooked 
                              ? 'bg-muted/30 border-muted cursor-not-allowed opacity-60' 
                              : isSelected
                              ? 'bg-primary/10 border-primary shadow-md'
                              : 'bg-gradient-to-r from-background to-primary/5 border-primary/20 hover:border-primary/40 hover:shadow-sm'
                          }`}
                          onClick={() => !isBooked && handleSlotSelect(slot.start_time, slot.clinic_id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${
                              isBooked ? 'bg-muted-foreground' : isSelected ? 'bg-primary' : 'bg-primary/60'
                            }`}></div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant={isBooked ? "secondary" : isSelected ? "default" : "outline"} 
                                  className={`text-base px-3 py-1 ${
                                    isBooked 
                                      ? "text-muted-foreground bg-muted" 
                                      : isSelected 
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "border-primary/40 text-primary font-medium"
                                  }`}
                                >
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </Badge>
                                {isBooked && (
                                  <Badge variant="destructive" className="text-xs">
                                    No disponible
                                  </Badge>
                                )}
                              </div>
                              {selectedClinic === 'all' && (
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full"></div>
                                  <span className="font-medium">{slot.clinic_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button 
                            size="sm" 
                            className={`px-6 transition-all duration-200 ${
                              isSelected ? 'shadow-md' : ''
                            }`}
                            variant={isSelected ? "default" : "outline"}
                            disabled={isBooked}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSlotSelect(slot.start_time, slot.clinic_id);
                            }}
                          >
                            {isSelected ? "✓ Seleccionado" : "Seleccionar"}
                          </Button>
                        </div>
                      );
                    })}
                    
                    {/* Book Appointment Button */}
                    {selectedSlot && selectedClinic && selectedClinic !== 'all' && (
                      <div className="pt-6 border-t-2 border-primary/20">
                        <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/30">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <span>Resumen de tu cita:</span>
                          </div>
                          <div className="text-sm text-muted-foreground ml-4 space-y-1">
                            <div>Fecha: {format(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}</div>
                            <div>Hora: {formatTime(selectedSlot)}</div>
                            <div>Lugar: {clinics.find(c => c.id === selectedClinic)?.name}</div>
                          </div>
                        </div>
                        <Button 
                          onClick={handleBookAppointment}
                          disabled={!selectedSlot || bookAppointment.isPending}
                          className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                          size="lg"
                        >
                          {bookAppointment.isPending ? (
                            <div className="flex items-center gap-2">
                              <LoadingSpinner size="sm" />
                              <span>Agendando...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-5 h-5" />
                              <span>Confirmar Cita</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    )}

                    {selectedSlot && selectedClinic === 'all' && (
                      <div className="pt-4 border-t border-muted">
                        <div className="p-4 bg-muted/20 rounded-lg border border-muted">
                          <p className="text-sm text-muted-foreground text-center">
                            Selecciona un consultorio específico para continuar con la reserva
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-8 bg-gradient-to-br from-muted/20 to-muted/10 rounded-xl border border-muted">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-medium text-foreground mb-2">No hay horarios disponibles</h4>
                    <p className="text-muted-foreground text-sm">
                      No se encontraron horarios para esta fecha.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Por favor selecciona otra fecha resaltada en el calendario.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-8 bg-muted/10 rounded-xl border border-muted">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium text-foreground mb-2">Selecciona una fecha</h4>
              <p className="text-muted-foreground text-sm">
                Elige una fecha del calendario para ver los horarios disponibles
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}