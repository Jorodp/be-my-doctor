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
  office_address: string | null;
  office_phone: string | null;
  practice_locations: string[] | null;
  professional_license_document_url: string | null;
  university_degree_document_url: string | null;
  identification_document_url: string | null;
  office_photos_urls: string[] | null;
  professional_photos_urls: string[] | null;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
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
          profile_image_url,
          office_address,
          office_phone,
          practice_locations,
          professional_license_document_url,
          university_degree_document_url,
          identification_document_url,
          office_photos_urls,
          professional_photos_urls
        `);

      if (error) throw error;

      // Get profile data and email for each doctor
      const doctorsWithProfiles = await Promise.all(
        (doctorProfiles || []).map(async (doctor) => {
          // Get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, address')
            .eq('user_id', doctor.user_id)
            .maybeSingle();
          
          // Get email from auth.users
          let email = null;
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(doctor.user_id);
            email = authUser.user?.email || null;
          } catch (error) {
            console.warn('Could not fetch email for user:', doctor.user_id);
          }
          
          return {
            ...doctor,
            profile: {
              full_name: profile?.full_name || 'Sin nombre',
              email: email,
              phone: profile?.phone || null,
              address: profile?.address || null
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
      // First check if the profile is complete when trying to verify
      if (status === 'verified') {
        const { data: profileComplete, error: checkError } = await supabase
          .rpc('is_doctor_profile_complete', { doctor_user_id: doctorId });
        
        if (checkError) throw checkError;
        
        if (!profileComplete) {
          toast({
            title: "Perfil incompleto",
            description: "No se puede verificar un doctor sin todos los documentos requeridos",
            variant: "destructive"
          });
          return;
        }
      }

      const { error } = await supabase
        .from('doctor_profiles')
        .update({ 
          verification_status: status,
          verified_at: status === 'verified' ? new Date().toISOString() : null
        })
        .eq('user_id', doctorId); // Use user_id instead of id

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
                      <h3 className="font-semibold">
                        Dr. {doctor.profile?.full_name || 'Nombre no disponible'}
                      </h3>
                      {getStatusBadge(doctor.verification_status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Email: {doctor.profile?.email || 'No disponible'}</div>
                      <div>Teléfono: {doctor.profile?.phone || 'No disponible'}</div>
                      <div>Especialidad: {doctor.specialty}</div>
                      <div>Licencia: {doctor.professional_license}</div>
                      <div>Dirección consultorio: {doctor.office_address || 'No especificada'}</div>
                      {doctor.consultation_fee && (
                        <div>Tarifa: ${doctor.consultation_fee} MXN</div>
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
                                <div className="font-medium">{selectedDoctor.profile?.full_name || 'No disponible'}</div>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <div className="font-medium">{selectedDoctor.profile?.email || 'No disponible'}</div>
                              </div>
                              <div>
                                <Label>Teléfono</Label>
                                <div className="font-medium">{selectedDoctor.profile?.phone || 'No disponible'}</div>
                              </div>
                              <div>
                                <Label>Especialidad</Label>
                                <div className="font-medium">{selectedDoctor.specialty}</div>
                              </div>
                              <div>
                                <Label>Cédula Profesional</Label>
                                <div className="font-medium">{selectedDoctor.professional_license}</div>
                              </div>
                              <div>
                                <Label>Estado</Label>
                                <div>{getStatusBadge(selectedDoctor.verification_status)}</div>
                              </div>
                              <div>
                                <Label>Dirección Consultorio</Label>
                                <div className="font-medium">{selectedDoctor.office_address || 'No especificada'}</div>
                              </div>
                              <div>
                                <Label>Teléfono Consultorio</Label>
                                <div className="font-medium">{selectedDoctor.office_phone || 'No especificado'}</div>
                              </div>
                            </div>
                            {selectedDoctor.biography && (
                              <div>
                                <Label>Biografía</Label>
                                <div className="mt-1 text-sm">{selectedDoctor.biography}</div>
                              </div>
                            )}
                            
                            {/* Documentos */}
                            <div className="space-y-2">
                              <Label>Documentos Profesionales</Label>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>Cédula: {selectedDoctor.professional_license_document_url ? '✅ Subida' : '❌ Faltante'}</div>
                                <div>Título: {selectedDoctor.university_degree_document_url ? '✅ Subido' : '❌ Faltante'}</div>
                                <div>Identificación: {selectedDoctor.identification_document_url ? '✅ Subida' : '❌ Faltante'}</div>
                              </div>
                            </div>
                            
                            {/* Fotos */}
                            <div className="space-y-2">
                              <Label>Fotos</Label>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>Fotos consultorio: {selectedDoctor.office_photos_urls?.length ? `✅ ${selectedDoctor.office_photos_urls.length} fotos` : '❌ Sin fotos'}</div>
                                <div>Fotos profesionales: {selectedDoctor.professional_photos_urls?.length ? `✅ ${selectedDoctor.professional_photos_urls.length} fotos` : '❌ Sin fotos'}</div>
                              </div>
                            </div>
                            
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

                    {/* Edit Profile - Now opens advanced editor */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        window.open(`/admin?doctorId=${doctor.user_id}&action=edit`, '_blank');
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {/* Verification Actions */}
                    {doctor.verification_status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => updateVerificationStatus(doctor.user_id, 'verified')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateVerificationStatus(doctor.user_id, 'rejected')}
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