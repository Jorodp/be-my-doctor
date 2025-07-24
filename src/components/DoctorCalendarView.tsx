import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, startOfDay, endOfDay, isSameDay, parse } from "date-fns";
import { es } from "date-fns/locale";

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface DoctorCalendarViewProps {
  doctorId?: string;
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function DoctorCalendarView({ doctorId }: DoctorCalendarViewProps) {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (!doctorId) return;
    
    async function fetchAvailability() {
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('doctor_availability')
          .select('*')
          .eq('doctor_user_id', doctorId)
          .eq('is_available', true)
          .order('day_of_week')
          .order('start_time');

        if (error) {
          console.error('Error fetching availability:', error);
        } else {
          setAvailability(data || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailability();
  }, [doctorId]);

  const getAvailabilityForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availability.filter(slot => slot.day_of_week === dayOfWeek);
  };

  const hasAvailabilityForDate = (date: Date) => {
    return getAvailabilityForDate(date).length > 0;
  };

  const formatTime = (time: string) => {
    try {
      const parsed = parse(time, 'HH:mm:ss', new Date());
      return format(parsed, 'HH:mm');
    } catch {
      return time.slice(0, 5); // fallback to simple slice
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!availability.length) {
    return (
      <div className="text-center p-8">
        <CalendarIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sin horarios configurados</h3>
        <p className="text-muted-foreground">
          El doctor aún no ha configurado sus horarios disponibles.
        </p>
      </div>
    );
  }

  const selectedDateAvailability = selectedDate ? getAvailabilityForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              available: (date) => hasAvailabilityForDate(date)
            }}
            modifiersStyles={{
              available: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                borderRadius: '4px'
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
          </div>
        </div>

        {/* Available times for selected date */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {selectedDate ? (
              <>Horarios para {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</>
            ) : (
              'Selecciona una fecha'
            )}
          </h3>
          
          {selectedDate && (
            <div className="space-y-3">
              {selectedDateAvailability.length > 0 ? (
                selectedDateAvailability.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary text-primary">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </Badge>
                    </div>
                    <Button size="sm" className="px-6">
                      Agendar
                    </Button>
                  </div>
                ))
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

      {/* General availability overview */}
      <div className="border-t pt-6">
        <h3 className="font-semibold mb-4">Horarios Generales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const dayAvailability = availability.filter(slot => slot.day_of_week === dayIndex);
            
            return (
              <div key={dayIndex} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">{DAYS_OF_WEEK[dayIndex]}</h4>
                <div className="space-y-1">
                  {dayAvailability.length > 0 ? (
                    dayAvailability.map((slot, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No disponible</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}