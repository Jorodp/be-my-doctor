import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, Eye, Calendar, User, Upload, FileText, Star, MessageSquare, Image, IdCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Patient {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  profile_image_url: string | null;
  id_document_url: string | null;
  created_at: string;
}

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  doctor_profile: {
    specialty: string;
  } | null;
  doctor_name: string | null;
  rating?: number;
  rating_comment?: string;
}

interface AppointmentRating {
  id: string;
  appointment_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export const PatientsList = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'new'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [patients, searchTerm, filterType]);

  const fetchPatients = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*, profile_image_url, id_document_url')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get email from auth users for each patient
      const patientsWithEmails = await Promise.all(
        profiles.map(async (profile) => {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
            return {
              ...profile,
              email: authUser.user?.email || null
            };
          } catch (error) {
            return {
              ...profile,
              email: null
            };
          }
        })
      );

      setPatients(patientsWithEmails);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pacientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    let filtered = patients;

    // Filter by new patients (last 24 hours)
    if (filterType === 'new') {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter(patient => 
        new Date(patient.created_at) >= yesterday
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(patient => 
        patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm)
      );
    }

    setFilteredPatients(filtered);
  };

  const fetchPatientAppointments = async (patientUserId: string) => {
    setLoadingAppointments(true);
    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          starts_at,
          ends_at,
          status,
          notes,
          doctor_user_id
        `)
        .eq('patient_user_id', patientUserId)
        .order('starts_at', { ascending: false });

      if (error) throw error;

      // Get doctor names, specialties, and ratings
      const appointmentsWithDetails = await Promise.all(
        appointments.map(async (appointment) => {
          try {
            // Get doctor profile
            const { data: doctorProfile } = await supabase
              .from('doctor_profiles')
              .select('specialty')
              .eq('user_id', appointment.doctor_user_id)
              .single();

            // Get doctor name
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', appointment.doctor_user_id)
              .single();

            // Get rating for this appointment
            const { data: rating } = await supabase
              .from('doctor_ratings')
              .select('rating, comment')
              .eq('appointment_id', appointment.id)
              .single();

            return {
              ...appointment,
              doctor_profile: doctorProfile,
              doctor_name: profile?.full_name || null,
              rating: rating?.rating || null,
              rating_comment: rating?.comment || null
            };
          } catch (error) {
            return {
              ...appointment,
              doctor_profile: null,
              doctor_name: null,
              rating: null,
              rating_comment: null
            };
          }
        })
      );

      setPatientAppointments(appointmentsWithDetails);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas del paciente",
        variant: "destructive"
      });
    } finally {
      setLoadingAppointments(false);
    }
  };

  const uploadFile = async (file: File, folder: string, patientId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${patientId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('patient-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('patient-documents')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleFileUpload = async (file: File, field: 'profile_image_url' | 'id_document_url', patient: Patient) => {
    try {
      setUploading(field);
      const folder = field === 'profile_image_url' ? 'profile' : 'documents';
      const url = await uploadFile(file, folder, patient.user_id);
      
      // Update patient profile in database
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: url })
        .eq('user_id', patient.user_id);
      
      if (error) throw error;
      
      // Update local state
      setSelectedPatient(prev => prev ? { ...prev, [field]: url } : null);
      
      // Refresh patients list
      await fetchPatients();
      
      toast({
        title: 'Éxito',
        description: 'Archivo subido correctamente',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el archivo',
        variant: 'destructive'
      });
    } finally {
      setUploading(null);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completada</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Programada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'no_show':
        return <Badge variant="secondary">No se presentó</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return <div className="flex justify-center py-8">Cargando pacientes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="mb-6 space-y-4">
            {/* Filter buttons */}
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                Todos los Pacientes
              </Button>
              <Button
                variant={filterType === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('new')}
              >
                Pacientes Nuevos (24h)
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Patients Grid */}
          <div className="grid gap-4">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={patient.profile_image_url || ''} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{patient.full_name || 'Sin nombre'}</h3>
                        <div className="flex gap-2">
                          {patient.profile_image_url && (
                            <Badge variant="outline" className="text-xs">
                              <Image className="h-3 w-3 mr-1" />
                              Foto
                            </Badge>
                          )}
                          {patient.id_document_url && (
                            <Badge variant="outline" className="text-xs">
                              <IdCard className="h-3 w-3 mr-1" />
                              ID
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Email: {patient.email || 'N/A'}</div>
                        <div>Teléfono: {patient.phone || 'N/A'}</div>
                        {patient.date_of_birth && (
                          <div>Edad: {calculateAge(patient.date_of_birth)} años</div>
                        )}
                        <div>Registrado: {formatDate(patient.created_at)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* View Profile */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedPatient(patient);
                            fetchPatientAppointments(patient.user_id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Perfil del Paciente: {selectedPatient?.full_name || 'Sin nombre'}
                          </DialogTitle>
                        </DialogHeader>
                        {selectedPatient && (
                          <Tabs defaultValue="info" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="info">Información Personal</TabsTrigger>
                              <TabsTrigger value="documents">Documentos</TabsTrigger>
                              <TabsTrigger value="appointments">Historial de Citas</TabsTrigger>
                            </TabsList>

                            {/* Tab: Información Personal */}
                            <TabsContent value="info" className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Foto de Perfil */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Foto de Perfil</CardTitle>
                                  </CardHeader>
                                  <CardContent className="flex flex-col items-center space-y-4">
                                    <Avatar className="h-24 w-24">
                                      <AvatarImage src={selectedPatient.profile_image_url || ''} />
                                      <AvatarFallback>
                                        <User className="h-12 w-12" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-2 w-full">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleFileUpload(file, 'profile_image_url', selectedPatient);
                                          }
                                        }}
                                        disabled={uploading === 'profile_image_url'}
                                      />
                                      {uploading === 'profile_image_url' && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <LoadingSpinner size="sm" />
                                          Subiendo...
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Información Básica */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Datos Personales</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Nombre Completo</Label>
                                      <div className="font-medium">{selectedPatient.full_name || 'N/A'}</div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Email</Label>
                                      <div className="font-medium">{selectedPatient.email || 'N/A'}</div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Teléfono</Label>
                                      <div className="font-medium">{selectedPatient.phone || 'N/A'}</div>
                                    </div>
                                    {selectedPatient.date_of_birth && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Edad</Label>
                                        <div className="font-medium">{calculateAge(selectedPatient.date_of_birth)} años</div>
                                      </div>
                                    )}
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Dirección</Label>
                                      <div className="font-medium">{selectedPatient.address || 'N/A'}</div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Registrado</Label>
                                      <div className="font-medium">{formatDate(selectedPatient.created_at)}</div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </TabsContent>

                            {/* Tab: Documentos */}
                            <TabsContent value="documents" className="space-y-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                                    <IdCard className="h-5 w-5" />
                                    Documentos de Identificación
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                  <div>
                                    <Label className="text-sm font-medium">Documento de Identidad</Label>
                                    <div className="mt-2 space-y-3">
                                      {selectedPatient.id_document_url ? (
                                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                          <FileText className="h-5 w-5 text-green-600" />
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-green-800">Documento subido</div>
                                            <div className="text-xs text-green-600">Documento disponible</div>
                                          </div>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => window.open(selectedPatient.id_document_url!, '_blank')}
                                          >
                                            Ver
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                          <FileText className="h-5 w-5 text-yellow-600" />
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-yellow-800">Sin documento</div>
                                            <div className="text-xs text-yellow-600">No se ha subido identificación</div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div>
                                        <Input
                                          type="file"
                                          accept=".pdf,.jpg,.jpeg,.png"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleFileUpload(file, 'id_document_url', selectedPatient);
                                            }
                                          }}
                                          disabled={uploading === 'id_document_url'}
                                        />
                                        {uploading === 'id_document_url' && (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                            <LoadingSpinner size="sm" />
                                            Subiendo documento...
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </TabsContent>

                            {/* Tab: Historial de Citas */}
                            <TabsContent value="appointments" className="space-y-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Historial de Citas y Calificaciones
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {loadingAppointments ? (
                                    <div className="flex justify-center py-8">
                                      <LoadingSpinner />
                                    </div>
                                  ) : patientAppointments.length > 0 ? (
                                    <div className="space-y-4">
                                      {patientAppointments.map((appointment) => (
                                        <Card key={appointment.id} className="border-l-4 border-l-primary">
                                          <CardContent className="pt-4">
                                            <div className="space-y-3">
                                              {/* Información de la cita */}
                                              <div className="flex justify-between items-start">
                                                <div className="space-y-2">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                      Dr. {appointment.doctor_name || 'Desconocido'}
                                                    </span>
                                                    {getStatusBadge(appointment.status)}
                                                  </div>
                                                  <div className="text-sm text-muted-foreground space-y-1">
                                                    <div>
                                                      <span className="font-medium">Especialidad:</span> {appointment.doctor_profile?.specialty || 'N/A'}
                                                    </div>
                                                    <div>
                                                      <span className="font-medium">Fecha:</span> {formatDate(appointment.starts_at)}
                                                    </div>
                                                    {appointment.notes && (
                                                      <div>
                                                        <span className="font-medium">Notas:</span> {appointment.notes}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Calificación y comentarios */}
                                              {appointment.rating && (
                                                <div className="border-t pt-3 mt-3">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <Star className="h-4 w-4 text-yellow-500" />
                                                    <span className="text-sm font-medium">Calificación del paciente:</span>
                                                  </div>
                                                  <div className="space-y-2">
                                                    <div className="flex items-center gap-1">
                                                      {renderStars(appointment.rating)}
                                                      <span className="text-sm text-muted-foreground ml-2">
                                                        ({appointment.rating}/5)
                                                      </span>
                                                    </div>
                                                    {appointment.rating_comment && (
                                                      <div className="bg-muted p-3 rounded-lg">
                                                        <div className="flex items-start gap-2">
                                                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                          <div>
                                                            <div className="text-xs text-muted-foreground mb-1">Comentario:</div>
                                                            <div className="text-sm italic">"{appointment.rating_comment}"</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {/* Sin calificación */}
                                              {appointment.status === 'completed' && !appointment.rating && (
                                                <div className="border-t pt-3 mt-3">
                                                  <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Star className="h-4 w-4" />
                                                    <span className="text-sm">Esta cita no fue calificada por el paciente</span>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                      <div>No hay citas registradas para este paciente</div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </TabsContent>
                          </Tabs>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPatients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron pacientes con los filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};