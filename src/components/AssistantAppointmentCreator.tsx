import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addDays, setHours, setMinutes, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDoctorClinics } from '@/hooks/useDoctorClinics';
import {
  CalendarIcon,
  Plus,
  Search,
  User,
  Phone,
  Clock,
  AlertCircle,
  CheckCircle,
  MapPin
} from 'lucide-react';
import { useDoctorAvailability } from '@/hooks/useDoctorAvailability';

interface Patient {
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  date_of_birth: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  clinic_id: string;
  clinic_name: string;
}

interface AssistantAppointmentCreatorProps {
  doctorId: string;
}

export function AssistantAppointmentCreator({ doctorId }: AssistantAppointmentCreatorProps) {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);

  const isFutureSlotTime = (time: string, date?: Date) => {
    if (!date) return true;
    if (!isToday(date)) return true;
    const [h, m] = time.slice(0,5).split(":").map(Number);
    const now = new Date();
    const slotMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes >= nowMinutes;
  };

  const { data: clinics = [] } = useDoctorClinics(doctorId);
  const { data: availabilityMap = {} } = useDoctorAvailability(doctorId);
  
  // New patient form
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    date_of_birth: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedDate && doctorId) {
      fetchAvailableSlots();
    }
  }, [selectedDate, doctorId, selectedClinic]);

  const hasAvailabilityForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availabilityMap[dayOfWeek] || false;
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, address, date_of_birth')
        .eq('role', 'patient')
        .order('full_name');

      if (error) throw error;

      // Get emails from auth users
      const patientsWithEmail = await Promise.all(
        (data || []).map(async (patient) => {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(patient.user_id);
            return {
              ...patient,
              email: userData?.user?.email || ''
            };
          } catch {
            return {
              ...patient,
              email: ''
            };
          }
        })
      );

      setPatients(patientsWithEmail);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pacientes",
        variant: "destructive"
      });
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;

    try {
      setLoading(true);
      const dayOfWeek = selectedDate.getDay();
      
      // Get doctor's profile to get internal ID
      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', doctorId)
        .single();

      if (profileError) throw profileError;

      // Get clinics for this doctor
      let clinicsQuery = supabase
        .from('clinics')
        .select('id, name')
        .eq('doctor_id', doctorProfile.id);

      if (selectedClinic) {
        clinicsQuery = clinicsQuery.eq('id', selectedClinic);
      }

      const { data: doctorClinics, error: clinicsError } = await clinicsQuery;
      if (clinicsError) throw clinicsError;

      if (!doctorClinics || doctorClinics.length === 0) {
        setAvailableSlots([]);
        return;
      }

      const slots: TimeSlot[] = [];

      // For each clinic, get availability and generate slots
      for (const clinic of doctorClinics) {
        const { data: availability, error: availError } = await supabase
          .from('availabilities')
          .select('start_time, end_time, slot_duration_minutes')
          .eq('clinic_id', clinic.id)
          .eq('weekday', dayOfWeek)
          .eq('is_active', true);

        if (availError) throw availError;

        if (availability && availability.length > 0) {
          for (const avail of availability) {
            const startHour = parseInt(avail.start_time.split(':')[0]);
            const startMinute = parseInt(avail.start_time.split(':')[1]);
            const endHour = parseInt(avail.end_time.split(':')[0]);
            const endMinute = parseInt(avail.end_time.split(':')[1]);
            
            for (let hour = startHour; hour < endHour || (hour === endHour && startMinute < endMinute); hour++) {
              for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 60) { // 1 hour slots
                if (hour === endHour && minute >= endMinute) break;
                
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const slotDateTime = setMinutes(setHours(selectedDate, hour), minute);
                
                // Check if slot is in the past
                const isPast = slotDateTime < new Date();
                
                if (!isPast) {
                  slots.push({
                    time: timeString,
                    available: true, // We'll check availability below
                    clinic_id: clinic.id,
                    clinic_name: clinic.name
                  });
                }
              }
            }
          }
        }
      }

      // Check existing appointments for the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('starts_at, clinic_id')
        .eq('doctor_user_id', doctorId)
        .gte('starts_at', startOfDay.toISOString())
        .lte('starts_at', endOfDay.toISOString())
        .in('status', ['scheduled', 'completed']);

      if (appointmentsError) throw appointmentsError;

      // Mark occupied slots per clinic
      const occupiedSlots = new Set(
        appointments?.map(apt => {
          const time = new Date(apt.starts_at);
          return `${apt.clinic_id}-${format(time, 'HH:mm')}`;
        }) || []
      );

      // Update availability
      const updatedSlots = slots.map(slot => ({
        ...slot,
        available: !occupiedSlots.has(`${slot.clinic_id}-${slot.time}`)
      }));

      setAvailableSlots(updatedSlots);
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

  const createNewPatient = async () => {
    try {
      // Use edge function to create patient (avoiding admin API issues)
      const { data: response, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'create_patient',
          email: newPatient.email,
          full_name: newPatient.full_name,
          phone: newPatient.phone,
          address: newPatient.address,
          date_of_birth: newPatient.date_of_birth
        }
      });

      if (error) throw error;
      
      const userId = response?.user_id;
      if (!userId) throw new Error('No se recibió ID de usuario');

      const createdPatient: Patient = {
        user_id: userId,
        full_name: newPatient.full_name,
        phone: newPatient.phone,
        email: newPatient.email,
        address: newPatient.address,
        date_of_birth: newPatient.date_of_birth
      };

      setSelectedPatient(createdPatient);
      setPatients(prev => [...prev, createdPatient]);
      setShowNewPatientForm(false);
      
      // Reset form
      setNewPatient({
        full_name: '',
        phone: '',
        email: '',
        address: '',
        date_of_birth: ''
      });

      toast({
        title: "Éxito",
        description: "Paciente creado correctamente"
      });

    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el paciente",
        variant: "destructive"
      });
    }
  };

  const createAppointment = async () => {
    if (!selectedPatient || !selectedDate || !selectedTime || !selectedClinic) {
      toast({
        title: "Campos requeridos",
        description: "Selecciona paciente, fecha, hora y consultorio",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreatingAppointment(true);
      
      const [hour, minute] = selectedTime.split(':').map(Number);
      const startDateTime = setMinutes(setHours(selectedDate, hour), minute);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60000); // 1 hour

      // Check for conflicts first
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_user_id', doctorId)
        .eq('clinic_id', selectedClinic)
        .eq('starts_at', startDateTime.toISOString())
        .in('status', ['scheduled', 'completed']);

      if (checkError) throw checkError;

      if (existingAppointments && existingAppointments.length > 0) {
        throw new Error('Este horario ya está ocupado en este consultorio');
      }

      const { error } = await supabase
        .from('appointments')
        .insert({
          doctor_user_id: doctorId,
          patient_user_id: selectedPatient.user_id,
          clinic_id: selectedClinic,
          starts_at: startDateTime.toISOString(),
          ends_at: endDateTime.toISOString(),
          status: 'scheduled',
          notes: notes || null
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cita creada correctamente"
      });

      // Reset form
      setSelectedPatient(null);
      setSelectedDate(undefined);
      setSelectedTime('');
      setSelectedClinic('');
      setNotes('');
      setSearchTerm('');
      
      // Refresh available slots
      if (selectedDate) {
        fetchAvailableSlots();
      }

    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la cita",
        variant: "destructive"
      });
    } finally {
      setCreatingAppointment(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Crear Nueva Cita
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient Selection */}
        <div className="space-y-4">
          <Label>Seleccionar Paciente</Label>
          
          {selectedPatient ? (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{selectedPatient.full_name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>📞 {selectedPatient.phone}</span>
                      <span>✉️ {selectedPatient.email}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                >
                  Cambiar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, teléfono o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewPatientForm(true)}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Paciente
                </Button>
              </div>

              {searchTerm && (
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {filteredPatients.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No se encontraron pacientes
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient.user_id}
                          className="p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setSearchTerm('');
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4" />
                            <div>
                              <p className="font-medium">{patient.full_name}</p>
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span>{patient.phone}</span>
                                <span>{patient.email}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clinic Selection */}
        {clinics.length > 0 && (
          <div className="space-y-2">
            <Label>Consultorio</Label>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un consultorio" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{clinic.name}</p>
                        <p className="text-xs text-muted-foreground">{clinic.address}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Selection */}
        <div className="space-y-4">
          <Label>Fecha de la Cita</Label>
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
                modifiers={{
                  available: (date) => hasAvailabilityForDate(date),
                  today: (date) => isToday(date)
                }}
                modifiersStyles={{
                  available: {
                    backgroundColor: 'hsl(var(--success))',
                    color: 'hsl(var(--success-foreground))',
                    fontWeight: '600',
                    borderRadius: '8px'
                  },
                  today: {
                    backgroundColor: 'transparent',
                    color: 'inherit',
                    border: '2px solid hsl(var(--accent))',
                    borderRadius: '8px'
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="space-y-4">
            <Label>Hora de la Cita</Label>
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Cargando horarios...</p>
              </div>
            ) : availableSlots.filter((s) => isFutureSlotTime(s.time, selectedDate)).length === 0 ? (
              <div className="p-4 text-center border rounded-lg">
                <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No hay horarios disponibles para esta fecha</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group slots by clinic */}
                {Object.entries(
                  availableSlots
                    .filter((s) => isFutureSlotTime(s.time, selectedDate))
                    .reduce((acc, slot) => {
                      if (!acc[slot.clinic_id]) {
                        acc[slot.clinic_id] = {
                          clinic_name: slot.clinic_name,
                          slots: []
                        };
                      }
                      acc[slot.clinic_id].slots.push(slot);
                      return acc;
                    }, {} as Record<string, { clinic_name: string; slots: TimeSlot[] }>)
                ).map(([clinicId, { clinic_name, slots }]) => (
                  <div key={clinicId} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {clinic_name}
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((slot) => (
                        <Button
                          key={`${slot.clinic_id}-${slot.time}`}
                          variant={selectedTime === slot.time && selectedClinic === slot.clinic_id ? "default" : "outline"}
                          size="sm"
                          disabled={!slot.available}
                          onClick={() => {
                            setSelectedTime(slot.time);
                            setSelectedClinic(slot.clinic_id);
                          }}
                          className={cn(
                            "relative",
                            !slot.available && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {slot.time}
                          {!slot.available && (
                            <div className="absolute inset-0 bg-red-500/10 rounded" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notas (Opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Notas adicionales sobre la cita..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Create Button */}
        <Button 
          onClick={createAppointment}
          disabled={!selectedPatient || !selectedDate || !selectedTime || !selectedClinic || creatingAppointment}
          className="w-full"
        >
          {creatingAppointment ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creando Cita...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Crear Cita
            </>
          )}
        </Button>

        {/* New Patient Dialog */}
        <Dialog open={showNewPatientForm} onOpenChange={setShowNewPatientForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Paciente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-name">Nombre Completo *</Label>
                <Input
                  id="new-name"
                  value={newPatient.full_name}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Nombre completo del paciente"
                />
              </div>
              
              <div>
                <Label htmlFor="new-email">Email *</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              
              <div>
                <Label htmlFor="new-phone">Teléfono</Label>
                <Input
                  id="new-phone"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Número de teléfono"
                />
              </div>
              
              <div>
                <Label htmlFor="new-birth">Fecha de Nacimiento</Label>
                <Input
                  id="new-birth"
                  type="date"
                  value={newPatient.date_of_birth}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="new-address">Dirección</Label>
                <Textarea
                  id="new-address"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Dirección completa"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewPatientForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={createNewPatient}
                  disabled={!newPatient.full_name || !newPatient.email}
                  className="flex-1"
                >
                  Crear Paciente
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}