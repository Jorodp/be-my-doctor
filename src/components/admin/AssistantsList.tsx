import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, UserCheck, Users, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Assistant {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  assigned_doctor_id?: string | null;
  assigned_doctor_name?: string | null;
}

interface Doctor {
  user_id: string;
  full_name: string | null;
  specialty: string;
}

export const AssistantsList = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredAssistants, setFilteredAssistants] = useState<Assistant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssistants();
    fetchDoctors();
  }, []);

  useEffect(() => {
    filterAssistants();
  }, [assistants, searchTerm]);

  const fetchAssistants = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'assistant')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get email and assigned doctor info for each assistant
      const assistantsWithDetails = await Promise.all(
        profiles.map(async (profile) => {
          try {
            // Get email from auth users
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
            const email = authUser.user?.email || null;
            const assignedDoctorId = authUser.user?.user_metadata?.assigned_doctor_id || null;
            
            let assigned_doctor_name = null;
            if (assignedDoctorId) {
              const { data: doctorProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', assignedDoctorId)
                .single();
              assigned_doctor_name = doctorProfile?.full_name || null;
            }

            return {
              ...profile,
              email,
              assigned_doctor_id: assignedDoctorId,
              assigned_doctor_name
            };
          } catch (error) {
            return {
              ...profile,
              email: null,
              assigned_doctor_id: null,
              assigned_doctor_name: null
            };
          }
        })
      );

      setAssistants(assistantsWithDetails);
    } catch (error) {
      console.error('Error fetching assistants:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los asistentes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data: doctorProfiles, error } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialty')
        .eq('verification_status', 'verified');

      if (error) throw error;

      // Get doctor names
      const doctorsWithNames = await Promise.all(
        doctorProfiles.map(async (doctor) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', doctor.user_id)
            .single();

          return {
            ...doctor,
            full_name: profile?.full_name || null
          };
        })
      );

      setDoctors(doctorsWithNames);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const filterAssistants = () => {
    let filtered = assistants;

    if (searchTerm) {
      filtered = filtered.filter(assistant => 
        assistant.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assistant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assistant.phone?.includes(searchTerm) ||
        assistant.assigned_doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssistants(filtered);
  };

  const assignDoctor = async (assistantUserId: string, doctorUserId: string | null) => {
    try {
      const updateData = doctorUserId 
        ? { user_metadata: { assigned_doctor_id: doctorUserId } }
        : { user_metadata: { assigned_doctor_id: null } };

      const { error } = await supabase.auth.admin.updateUserById(assistantUserId, updateData);

      if (error) throw error;

      toast({
        title: doctorUserId ? "Doctor Asignado" : "Doctor Desasignado",
        description: doctorUserId 
          ? "El doctor ha sido asignado al asistente exitosamente"
          : "El doctor ha sido desasignado del asistente",
      });

      fetchAssistants(); // Refresh data
    } catch (error) {
      console.error('Error assigning doctor:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la asignación",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  if (loading) {
    return <div className="flex justify-center py-8">Cargando asistentes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Asistentes</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre, email o doctor asignado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Assistants Grid */}
          <div className="grid gap-4">
            {filteredAssistants.map((assistant) => (
              <div key={assistant.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">{assistant.full_name || 'Sin nombre'}</h3>
                      {assistant.assigned_doctor_name && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Link className="h-3 w-3 mr-1" />
                          Asignado
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Email: {assistant.email || 'N/A'}</div>
                      <div>Teléfono: {assistant.phone || 'N/A'}</div>
                      {assistant.assigned_doctor_name && (
                        <div className="text-blue-600">
                          Doctor asignado: Dr. {assistant.assigned_doctor_name}
                        </div>
                      )}
                      <div>Registrado: {formatDate(assistant.created_at)}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* View Profile */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedAssistant(assistant)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Perfil del Asistente</DialogTitle>
                        </DialogHeader>
                        {selectedAssistant && (
                          <div className="space-y-6">
                            {/* Assistant Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Nombre Completo</Label>
                                <div className="font-medium">{selectedAssistant.full_name || 'N/A'}</div>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <div className="font-medium">{selectedAssistant.email || 'N/A'}</div>
                              </div>
                              <div>
                                <Label>Teléfono</Label>
                                <div className="font-medium">{selectedAssistant.phone || 'N/A'}</div>
                              </div>
                              <div>
                                <Label>Fecha de Registro</Label>
                                <div className="font-medium">{formatDate(selectedAssistant.created_at)}</div>
                              </div>
                            </div>

                            {/* Doctor Assignment */}
                            <div>
                              <Label>Asignar Doctor</Label>
                              <div className="mt-2 space-y-2">
                                {selectedAssistant.assigned_doctor_name && (
                                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                    <UserCheck className="h-4 w-4 text-blue-600" />
                                    <span className="text-blue-800 font-medium">
                                      Actualmente asignado a: Dr. {selectedAssistant.assigned_doctor_name}
                                    </span>
                                  </div>
                                )}
                                
                                <Select 
                                  onValueChange={(value) => assignDoctor(selectedAssistant.user_id, value === 'none' ? null : value)}
                                  defaultValue={selectedAssistant.assigned_doctor_id || 'none'}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccionar doctor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sin asignar</SelectItem>
                                    {doctors.map((doctor) => (
                                      <SelectItem key={doctor.user_id} value={doctor.user_id}>
                                        Dr. {doctor.full_name || 'Sin nombre'} - {doctor.specialty}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAssistants.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron asistentes con los filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};