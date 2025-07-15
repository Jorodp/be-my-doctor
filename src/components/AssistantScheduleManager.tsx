import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Clock,
  Plus,
  Trash2,
  Save,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AssistantScheduleManagerProps {
  doctorId: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

export function AssistantScheduleManager({ doctorId }: AssistantScheduleManagerProps) {
  const { toast } = useToast();
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New availability form
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  useEffect(() => {
    if (doctorId) {
      fetchAvailability();
    }
  }, [doctorId]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_user_id', doctorId)
        .order('day_of_week')
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

  const addAvailability = async () => {
    if (startTime >= endTime) {
      toast({
        title: "Error",
        description: "La hora de inicio debe ser anterior a la hora de fin",
        variant: "destructive"
      });
      return;
    }

    // Check for overlapping times on the same day
    const overlapping = availability.find(avail => 
      avail.day_of_week === selectedDay &&
      ((startTime >= avail.start_time && startTime < avail.end_time) ||
       (endTime > avail.start_time && endTime <= avail.end_time) ||
       (startTime <= avail.start_time && endTime >= avail.end_time))
    );

    if (overlapping) {
      toast({
        title: "Error",
        description: "Ya existe disponibilidad para este horario",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_user_id: doctorId,
          day_of_week: selectedDay,
          start_time: startTime,
          end_time: endTime,
          is_available: true
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Horario agregado correctamente"
      });

      fetchAvailability();
      
      // Reset form
      setStartTime('09:00');
      setEndTime('17:00');
    } catch (error) {
      console.error('Error adding availability:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el horario",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (availabilityId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .update({ is_available: isAvailable })
        .eq('id', availabilityId);

      if (error) throw error;

      setAvailability(prev => 
        prev.map(avail => 
          avail.id === availabilityId 
            ? { ...avail, is_available: isAvailable }
            : avail
        )
      );

      toast({
        title: "Éxito",
        description: `Horario ${isAvailable ? 'activado' : 'desactivado'}`
      });
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el horario",
        variant: "destructive"
      });
    }
  };

  const deleteAvailability = async (availabilityId: string) => {
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', availabilityId);

      if (error) throw error;

      setAvailability(prev => prev.filter(avail => avail.id !== availabilityId));

      toast({
        title: "Éxito",
        description: "Horario eliminado correctamente"
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

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDayName = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(day => day.value === dayOfWeek)?.label || 'Día';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Horario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="day">Día de la semana</Label>
              <Select value={selectedDay.toString()} onValueChange={(value) => setSelectedDay(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="start-time">Hora de inicio</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="end-time">Hora de fin</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={addAvailability} 
                disabled={saving}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {saving ? 'Agregando...' : 'Agregar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Horarios Configurados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availability.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No hay horarios configurados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {DAYS_OF_WEEK.map(day => {
                const dayAvailability = availability.filter(avail => avail.day_of_week === day.value);
                
                if (dayAvailability.length === 0) return null;
                
                return (
                  <div key={day.value} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">{day.label}</h4>
                    <div className="space-y-2">
                      {dayAvailability.map(avail => (
                        <div key={avail.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                              {formatTime(avail.start_time)} - {formatTime(avail.end_time)}
                            </span>
                            <Badge variant={avail.is_available ? "default" : "secondary"}>
                              {avail.is_available ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={avail.is_available}
                              onCheckedChange={(checked) => toggleAvailability(avail.id, checked)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAvailability(avail.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}