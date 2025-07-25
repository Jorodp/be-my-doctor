import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Clock,
  Plus,
  Trash2,
  Building,
  CalendarCheck,
  CalendarX,
  Settings,
  Stethoscope,
  User
} from 'lucide-react';
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
import { useDoctorClinics } from '@/hooks/useDoctorClinics';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

interface Availability {
  id: string;
  clinic_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  slot_duration_minutes?: number;
}

interface DoctorAssignment {
  id: string;
  doctor_id: string;
  doctor_profile: {
    user_id: string;
    full_name: string;
    specialty: string;
  };
}

interface AssistantScheduleManagerProps {
  doctorId?: string;
}

// Generar slots de tiempo cada 30 minutos de 06:00 a 22:00
const timeSlots = Array.from({ length: 33 }, (_, i) => {
  const hours = Math.floor(i / 2) + 6;
  const minutes = (i % 2) * 30;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

export function AssistantScheduleManager({ doctorId: propDoctorId }: AssistantScheduleManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  
  // Estados para múltiples doctores
  const [assignments, setAssignments] = useState<DoctorAssignment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>(propDoctorId || '');
  
  // Obtener clínicas del doctor seleccionado
  const { data: clinics = [], isLoading: clinicsLoading } = useDoctorClinics(selectedDoctor);

  // Cargar doctores asignados al asistente
  useEffect(() => {
    if (user && !propDoctorId) {
      fetchDoctorAssignments();
    }
  }, [user, propDoctorId]);

  // Si hay un doctor específico pasado como prop, usarlo directamente
  useEffect(() => {
    if (propDoctorId) {
      setSelectedDoctor(propDoctorId);
    }
  }, [propDoctorId]);

  // Configurar clínica por defecto cuando cambien las clínicas
  useEffect(() => {
    if (clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id);
    }
  }, [clinics, selectedClinic]);

  // Cargar disponibilidad cuando cambie la clínica seleccionada
  useEffect(() => {
    if (selectedClinic) {
      fetchAvailability();
    }
  }, [selectedClinic]);

  const fetchDoctorAssignments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: doctorAssignments, error } = await supabase
        .from('doctor_assistants')
        .select(`
          id,
          doctor_id,
          profiles:doctor_id (
            user_id,
            full_name
          )
        `)
        .eq('assistant_id', user.id);

      if (error) throw error;

      const assignmentsWithDetails = await Promise.all(
        (doctorAssignments || []).map(async (assignment: any) => {
          const doctorProfile = assignment.profiles;
          if (!doctorProfile) return null;

          try {
            const { data: doctorDetails, error: doctorError } = await supabase
              .from('doctor_profiles')
              .select('specialty')
              .eq('user_id', doctorProfile.user_id)
              .single();

            return {
              ...assignment,
              doctor_profile: {
                ...doctorProfile,
                specialty: doctorDetails?.specialty || 'Medicina General',
              },
            };
          } catch (error) {
            console.error('Error fetching doctor details:', error);
            return {
              ...assignment,
              doctor_profile: {
                ...doctorProfile,
                specialty: 'Medicina General',
              },
            };
          }
        })
      );

      const validAssignments = assignmentsWithDetails.filter(Boolean);
      setAssignments(validAssignments);
      
      // Seleccionar el primer doctor si no hay uno seleccionado
      if (validAssignments.length > 0 && !selectedDoctor) {
        setSelectedDoctor(validAssignments[0].doctor_profile.user_id);
      }
    } catch (error) {
      console.error('Error fetching doctor assignments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los doctores asignados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedClinic) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .eq('clinic_id', selectedClinic)
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

  const addTimeSlot = async () => {
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

    if (!newStartTime || !newEndTime) {
      toast({
        title: "Error",
        description: "Selecciona las horas de inicio y fin",
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
      setSaving(true);
      
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
          is_active: true,
          slot_duration_minutes: 60
        });

      if (error) throw error;

      await fetchAvailability();
      setDialogOpen(false);
      setNewStartTime('09:00');
      setNewEndTime('17:00');

      toast({
        title: "Éxito",
        description: "Horario agregado correctamente"
      });
    } catch (error) {
      console.error('Error adding time slot:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el horario",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
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
        description: `Horario ${!currentStatus ? 'habilitado' : 'deshabilitado'}`
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

  const deleteAvailability = async (availabilityId: string) => {
    try {
      const { error } = await supabase
        .from('availabilities')
        .delete()
        .eq('id', availabilityId);

      if (error) throw error;

      await fetchAvailability();

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

  const getDateAvailability = (date: Date) => {
    if (!selectedClinic) return [];
    
    const jsDay = date.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;
    
    return availability.filter(slot => 
      slot.clinic_id === selectedClinic && 
      slot.weekday === weekday && 
      slot.is_active
    );
  };

  const getSelectedDateSlots = () => {
    if (!selectedDate) return [];
    return getDateAvailability(selectedDate);
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && (propDoctorId || assignments.length === 0)) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Si no hay doctores asignados y no se pasó un doctor específico
  if (!propDoctorId && assignments.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-semibold mb-2">No tienes doctores asignados</p>
          <p className="text-muted-foreground">
            Contacta al administrador para que te asignen a un doctor.
          </p>
        </CardContent>
      </Card>
    );
  }

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
          <p className="text-lg font-semibold mb-2">Sin consultorios registrados</p>
          <p className="text-muted-foreground">
            El doctor seleccionado no tiene consultorios registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedClinicInfo = clinics.find(c => c.id === selectedClinic);
  const selectedDoctorInfo = assignments.find(a => a.doctor_profile.user_id === selectedDoctor);

  return (
    <div className="space-y-6">
      {/* Selector de doctor (solo si hay múltiples doctores asignados) */}
      {!propDoctorId && assignments.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Seleccionar Doctor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un doctor" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment) => (
                  <SelectItem 
                    key={assignment.id} 
                    value={assignment.doctor_profile.user_id}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {assignment.doctor_profile.full_name}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        - {assignment.doctor_profile.specialty}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Información del doctor y consultorio seleccionado */}
      {(selectedDoctorInfo || propDoctorId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Gestión de Agenda
              {selectedDoctorInfo && (
                <Badge variant="outline" className="ml-2">
                  Dr. {selectedDoctorInfo.doctor_profile.full_name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Consultorio:</label>
                <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map(clinic => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        <div>
                          <div className="font-medium">{clinic.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {clinic.city}, {clinic.state}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Calendario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        {/* Horarios del día seleccionado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horarios disponibles
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground">
                  {selectedDate.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar horario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar nuevo horario</DialogTitle>
                    <DialogDescription>
                      Configurar horario para {selectedClinicInfo?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Hora de inicio</label>
                        <Select value={newStartTime} onValueChange={setNewStartTime}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Hora de fin</label>
                        <Select value={newEndTime} onValueChange={setNewEndTime}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={addTimeSlot}
                        disabled={saving}
                      >
                        {saving ? 'Agregando...' : 'Agregar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getSelectedDateSlots().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarX className="h-8 w-8 mx-auto mb-2" />
                  <p>No hay horarios configurados para este día</p>
                </div>
              ) : (
                getSelectedDateSlots().map(slot => (
                  <div key={slot.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </span>
                      <Badge variant={slot.is_active ? "default" : "secondary"}>
                        {slot.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAvailability(slot.id, slot.is_active)}
                      >
                        {slot.is_active ? <CalendarX className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAvailability(slot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}