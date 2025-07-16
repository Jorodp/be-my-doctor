import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Eye, Edit, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DoctorImage } from '@/components/DoctorImage';

interface Doctor {
  id: string;
  user_id: string;
  professional_license: string;
  specialty: string;
  biography: string | null;
  consultation_fee: number | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  years_experience: number | null;
  profile_image_url: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface Assistant {
  user_id: string;
  full_name: string | null;
}

export const DoctorsList = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDoctors();
    fetchAssistants();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [doctors, searchTerm, statusFilter]);

  const fetchDoctors = async () => {
    try {
      const { data: doctorProfiles, error } = await supabase
        .from('doctor_profiles')
        .select(`
          id,
          user_id,
          professional_license,
          specialty,
          biography,
          consultation_fee,
          verification_status,
          years_experience,
          profile_image_url
        `);

      if (error) throw error;

      // Fetch profile data for each doctor
      const doctorsWithProfiles = await Promise.all(
        doctorProfiles.map(async (doctor) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', doctor.user_id)
            .single();

          // Get email from auth.users metadata
          const { data: authUser } = await supabase.auth.admin.getUserById(doctor.user_id);
          
          return {
            ...doctor,
            profile: {
              full_name: profile?.full_name || null,
              email: authUser.user?.email || null
            }
          };
        })
      );

      setDoctors(doctorsWithProfiles);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los doctores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssistants = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'assistant');

      if (error) throw error;
      setAssistants(data || []);
    } catch (error) {
      console.error('Error fetching assistants:', error);
    }
  };

  const filterDoctors = () => {
    let filtered = doctors;

    if (searchTerm) {
      filtered = filtered.filter(doctor => 
        doctor.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(doctor => doctor.verification_status === statusFilter);
    }

    setFilteredDoctors(filtered);
  };

  const updateVerificationStatus = async (doctorId: string, status: 'verified' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('doctor_profiles')
        .update({ 
          verification_status: status,
          verified_at: status === 'verified' ? new Date().toISOString() : null
        })
        .eq('id', doctorId);

      if (error) throw error;

      toast({
        title: `Doctor ${status === 'verified' ? 'Verificado' : 'Rechazado'}`,
        description: `El doctor ha sido ${status === 'verified' ? 'verificado' : 'rechazado'} exitosamente`,
      });

      fetchDoctors();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de verificación",
        variant: "destructive"
      });
    }
  };

  const updateDoctorProfile = async (doctorId: string, updates: Partial<Doctor>) => {
    try {
      const { error } = await supabase
        .from('doctor_profiles')
        .update(updates)
        .eq('id', doctorId);

      if (error) throw error;

      toast({
        title: "Perfil Actualizado",
        description: "Los datos del doctor han sido actualizados",
      });

      setEditingDoctor(null);
      fetchDoctors();
    } catch (error) {
      console.error('Error updating doctor:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    }
  };

  const assignAssistant = async (doctorUserId: string, assistantUserId: string) => {
    try {
      // Update assistant's metadata to include assigned doctor
      const { error } = await supabase.auth.admin.updateUserById(assistantUserId, {
        user_metadata: { assigned_doctor_id: doctorUserId }
      });

      if (error) throw error;

      toast({
        title: "Asistente Asignado",
        description: "El asistente ha sido asignado al doctor exitosamente",
      });
    } catch (error) {
      console.error('Error assigning assistant:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el asistente",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verificado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Cargando doctores...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Doctores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email o especialidad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="verified">Verificados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="rejected">Rechazados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Doctors Grid */}
          <div className="grid gap-4">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <DoctorImage 
                        profileImageUrl={doctor.profile_image_url}
                        doctorName={doctor.profile?.full_name}
                        size="sm"
                      />
                      <h3 className="font-semibold">{doctor.profile?.full_name || 'Sin nombre'}</h3>
                      {getStatusBadge(doctor.verification_status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Email: {doctor.profile?.email || 'N/A'}</div>
                      <div>Especialidad: {doctor.specialty}</div>
                      <div>Licencia: {doctor.professional_license}</div>
                      {doctor.consultation_fee && (
                        <div>Tarifa: ${doctor.consultation_fee}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* View Profile */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedDoctor(doctor)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Perfil del Doctor</DialogTitle>
                        </DialogHeader>
                        {selectedDoctor && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Nombre Completo</Label>
                                <div className="font-medium">{selectedDoctor.profile?.full_name}</div>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <div className="font-medium">{selectedDoctor.profile?.email}</div>
                              </div>
                              <div>
                                <Label>Especialidad</Label>
                                <div className="font-medium">{selectedDoctor.specialty}</div>
                              </div>
                              <div>
                                <Label>Estado</Label>
                                <div>{getStatusBadge(selectedDoctor.verification_status)}</div>
                              </div>
                            </div>
                            {selectedDoctor.biography && (
                              <div>
                                <Label>Biografía</Label>
                                <div className="mt-1 text-sm">{selectedDoctor.biography}</div>
                              </div>
                            )}
                            
                            {/* Assign Assistant */}
                            <div>
                              <Label>Asignar Asistente</Label>
                              <Select onValueChange={(value) => assignAssistant(selectedDoctor.user_id, value)}>
                                <SelectTrigger className="w-full mt-2">
                                  <SelectValue placeholder="Seleccionar asistente" />
                                </SelectTrigger>
                                <SelectContent>
                                  {assistants.map((assistant) => (
                                    <SelectItem key={assistant.user_id} value={assistant.user_id}>
                                      {assistant.full_name || 'Sin nombre'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {/* Edit Profile */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setEditingDoctor(doctor)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Editar Doctor</DialogTitle>
                        </DialogHeader>
                        {editingDoctor && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="specialty">Especialidad</Label>
                                <Input
                                  id="specialty"
                                  value={editingDoctor.specialty}
                                  onChange={(e) => setEditingDoctor({...editingDoctor, specialty: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="license">Licencia Profesional</Label>
                                <Input
                                  id="license"
                                  value={editingDoctor.professional_license}
                                  onChange={(e) => setEditingDoctor({...editingDoctor, professional_license: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="fee">Tarifa de Consulta</Label>
                                <Input
                                  id="fee"
                                  type="number"
                                  value={editingDoctor.consultation_fee || ''}
                                  onChange={(e) => setEditingDoctor({...editingDoctor, consultation_fee: Number(e.target.value)})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="experience">Años de Experiencia</Label>
                                <Input
                                  id="experience"
                                  type="number"
                                  value={editingDoctor.years_experience || ''}
                                  onChange={(e) => setEditingDoctor({...editingDoctor, years_experience: Number(e.target.value)})}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="biography">Biografía</Label>
                              <Textarea
                                id="biography"
                                value={editingDoctor.biography || ''}
                                onChange={(e) => setEditingDoctor({...editingDoctor, biography: e.target.value})}
                                rows={3}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setEditingDoctor(null)}>
                                Cancelar
                              </Button>
                              <Button onClick={() => updateDoctorProfile(editingDoctor.id, editingDoctor)}>
                                Guardar Cambios
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {/* Verification Actions */}
                    {doctor.verification_status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => updateVerificationStatus(doctor.id, 'verified')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateVerificationStatus(doctor.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron doctores con los filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};