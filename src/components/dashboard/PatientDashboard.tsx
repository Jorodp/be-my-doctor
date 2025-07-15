import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, User, Star, FileText, Camera, Upload, Edit, Save, X, Download } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { RatingModal } from '@/components/RatingModal';
import { DashboardHeader } from '@/components/DashboardHeader';
import { generateConsultationPDF } from '@/utils/pdfGenerator';

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number | null;
  notes: string | null;
  doctor_user_id: string;
  patient_user_id: string;
  doctor_profile?: {
    full_name: string | null;
    specialty?: string;
  } | null;
  consultation_notes?: {
    id: string;
    diagnosis: string | null;
    prescription: string | null;
    recommendations: string | null;
    follow_up_date: string | null;
  }[] | null;
  ratings?: {
    id: string;
    rating: number;
    comment: string | null;
  }[] | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  profile_image_url: string | null;
  id_document_url: string | null;
}

export const PatientDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    date_of_birth: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchAppointments(),
      fetchUserProfile()
    ]);
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setUserProfile(data);
      setProfileForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
        date_of_birth: data.date_of_birth || ''
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchAppointments = async () => {
    if (!user) return;

    try {
      console.log('Fetching appointments for user:', user.id);
      
      // Fetch upcoming appointments
      const { data: upcoming, error: upcomingError } = await supabase
        .from('appointments')
        .select(`
          *,
          consultation_notes (*),
          ratings (id, rating, comment)
        `)
        .eq('patient_user_id', user.id)
        .eq('status', 'scheduled')
        .gt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true });

      console.log('Upcoming appointments query result:', { upcoming, upcomingError });

      if (upcomingError) throw upcomingError;

      // Fetch past appointments
      const { data: past, error: pastError } = await supabase
        .from('appointments')
        .select(`
          *,
          consultation_notes (*),
          ratings (id, rating, comment)
        `)
        .eq('patient_user_id', user.id)
        .in('status', ['completed'])
        .order('starts_at', { ascending: false });

      console.log('Past appointments query result:', { past, pastError });

      if (pastError) throw pastError;

      // Fetch doctor profiles for all appointments
      const allAppointments = [...(upcoming || []), ...(past || [])];
      const doctorIds = [...new Set(allAppointments.map(app => app.doctor_user_id))];
      
      let doctorProfiles: Record<string, any> = {};
      if (doctorIds.length > 0) {
        const { data: doctors, error: doctorsError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', doctorIds);

        if (!doctorsError && doctors) {
          doctorProfiles = doctors.reduce((acc, doctor) => {
            acc[doctor.user_id] = doctor;
            return acc;
          }, {} as Record<string, any>);
        }

        // Also fetch doctor specialties
        const { data: doctorSpecialties, error: specialtiesError } = await supabase
          .from('doctor_profiles')
          .select('user_id, specialty')
          .in('user_id', doctorIds);

        if (!specialtiesError && doctorSpecialties) {
          doctorSpecialties.forEach(spec => {
            if (doctorProfiles[spec.user_id]) {
              doctorProfiles[spec.user_id].specialty = spec.specialty;
            }
          });
        }
      }

      // Process appointments with doctor profiles and ensure proper typing
      const processedUpcoming = (upcoming || []).map(app => ({
        ...app,
        doctor_profile: doctorProfiles[app.doctor_user_id] || null,
        ratings: Array.isArray(app.ratings) ? app.ratings : []
      })) as Appointment[];

      const processedPast = (past || []).map(app => ({
        ...app,
        doctor_profile: doctorProfiles[app.doctor_user_id] || null,
        ratings: Array.isArray(app.ratings) ? app.ratings : []
      })) as Appointment[];

      console.log('Processed appointments:', { processedUpcoming, processedPast });

      setUpcomingAppointments(processedUpcoming);
      setPastAppointments(processedPast);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const updateProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          address: profileForm.address,
          date_of_birth: profileForm.date_of_birth
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente"
      });

      setEditingProfile(false);
      fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = async (file: File, type: 'profile' | 'document') => {
    if (!user || !file) return;

    const bucket = type === 'profile' ? 'patient-profiles' : 'patient-documents';
    const setUploading = type === 'profile' ? setUploadingImage : setUploadingDocument;
    
    setUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Update profile with image URL
      const updateColumn = type === 'profile' ? 'profile_image_url' : 'id_document_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateColumn]: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Imagen subida",
        description: `${type === 'profile' ? 'Foto de perfil' : 'Documento'} actualizado correctamente`
      });

      fetchUserProfile();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen",
        variant: "destructive"
      });
    }
  };

  const handleDownloadPDF = (appointment: Appointment) => {
    if (!appointment.consultation_notes || appointment.consultation_notes.length === 0) {
      toast({
        title: "Sin notas médicas",
        description: "Esta consulta no tiene notas médicas para descargar",
        variant: "destructive"
      });
      return;
    }

    const consultationData = {
      patientName: userProfile?.full_name || 'Paciente',
      doctorName: appointment.doctor_profile?.full_name || 'Doctor',
      specialty: appointment.doctor_profile?.specialty || 'Medicina General',
      date: formatDate(appointment.starts_at),
      time: `${formatTime(appointment.starts_at)} - ${formatTime(appointment.ends_at)}`,
      diagnosis: appointment.consultation_notes[0].diagnosis,
      prescription: appointment.consultation_notes[0].prescription,
      recommendations: appointment.consultation_notes[0].recommendations,
      followUpDate: appointment.consultation_notes[0].follow_up_date ? 
        formatDate(appointment.consultation_notes[0].follow_up_date) : null,
      rating: appointment.ratings && appointment.ratings.length > 0 ? appointment.ratings[0].rating : undefined,
      ratingComment: appointment.ratings && appointment.ratings.length > 0 ? appointment.ratings[0].comment || undefined : undefined
    };

    generateConsultationPDF(consultationData);
    
    toast({
      title: "PDF generado",
      description: "El resumen de la consulta se ha descargado correctamente"
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <DashboardHeader
        title="Panel del Paciente"
        subtitle="Gestiona tus citas y consultas médicas"
        onSignOut={signOut}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Mi Perfil */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Mi Perfil
                </CardTitle>
                <CardDescription>
                  Gestiona tu información personal y documentos
                </CardDescription>
              </div>
              {!editingProfile && (
                <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h3 className="font-semibold">Información Personal</h3>
                
                {editingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">Nombre Completo</Label>
                      <Input
                        id="full_name"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Dirección</Label>
                      <Textarea
                        id="address"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="date_of_birth">Fecha de Nacimiento</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={profileForm.date_of_birth}
                        onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={updateProfile}>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </Button>
                      <Button variant="outline" onClick={() => setEditingProfile(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label>Nombre Completo</Label>
                      <p className="text-sm text-muted-foreground">{userProfile?.full_name || 'No especificado'}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <p className="text-sm text-muted-foreground">{userProfile?.phone || 'No especificado'}</p>
                    </div>
                    <div>
                      <Label>Dirección</Label>
                      <p className="text-sm text-muted-foreground">{userProfile?.address || 'No especificado'}</p>
                    </div>
                    <div>
                      <Label>Fecha de Nacimiento</Label>
                      <p className="text-sm text-muted-foreground">
                        {userProfile?.date_of_birth ? new Date(userProfile.date_of_birth).toLocaleDateString('es-ES') : 'No especificado'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Documentos e Imágenes */}
              <div className="space-y-4">
                <h3 className="font-semibold">Documentos e Imágenes</h3>
                
                {/* Foto de Perfil */}
                <div className="text-center space-y-3">
                  <Label>Foto de Perfil</Label>
                  <div className="flex flex-col items-center gap-3">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={userProfile?.profile_image_url || ''} />
                      <AvatarFallback>
                        <User className="h-12 w-12" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'profile');
                        }}
                        className="hidden"
                        id="profile-upload"
                      />
                      <label htmlFor="profile-upload">
                        <Button variant="outline" size="sm" disabled={uploadingImage} asChild>
                          <span>
                            {uploadingImage ? (
                              <LoadingSpinner />
                            ) : (
                              <>
                                <Camera className="h-4 w-4 mr-2" />
                                Cambiar Foto
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Documento de Identificación */}
                <div className="text-center space-y-3">
                  <Label>Identificación Oficial</Label>
                  <div className="flex flex-col items-center gap-3">
                    {userProfile?.id_document_url ? (
                      <div className="border rounded-lg p-4 w-full max-w-xs">
                        <img 
                          src={userProfile.id_document_url} 
                          alt="Documento de identidad"
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 w-full max-w-xs">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Sin documento</p>
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'document');
                        }}
                        className="hidden"
                        id="document-upload"
                      />
                      <label htmlFor="document-upload">
                        <Button variant="outline" size="sm" disabled={uploadingDocument} asChild>
                          <span>
                            {uploadingDocument ? (
                              <LoadingSpinner />
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                {userProfile?.id_document_url ? 'Cambiar Documento' : 'Subir Documento'}
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximas Citas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Citas
            </CardTitle>
            <CardDescription>
              Citas programadas para los próximos días
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tienes citas programadas
              </p>
            ) : (
              <div className="grid gap-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{appointment.doctor_profile?.full_name || 'Doctor'}</span>
                          <Badge variant="secondary">Especialista</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(appointment.starts_at)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}
                        </div>
                      </div>
                      <Badge>{appointment.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de Consultas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Consultas
            </CardTitle>
            <CardDescription>
              Consultas anteriores y notas médicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pastAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tienes consultas anteriores
              </p>
            ) : (
              <div className="grid gap-4">
                {pastAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{appointment.doctor_profile?.full_name || 'Doctor'}</span>
                          <Badge variant="secondary">Especialista</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(appointment.starts_at)}
                        </div>
                      </div>
                       <div className="flex gap-2">
                         {appointment.consultation_notes && appointment.consultation_notes.length > 0 && (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handleDownloadPDF(appointment)}
                           >
                             <Download className="h-4 w-4 mr-1" />
                             Descargar PDF
                           </Button>
                         )}
                         
                         {appointment.ratings && appointment.ratings.length > 0 ? (
                           <div className="flex items-center gap-1">
                             <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                             <span className="text-sm">{appointment.ratings[0].rating}/5</span>
                           </div>
                         ) : (
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => setSelectedAppointment(appointment)}
                           >
                             Calificar
                           </Button>
                         )}
                       </div>
                    </div>
                    
                    {appointment.consultation_notes && appointment.consultation_notes.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        {appointment.consultation_notes[0].diagnosis && (
                          <div>
                            <strong>Diagnóstico:</strong> {appointment.consultation_notes[0].diagnosis}
                          </div>
                        )}
                        {appointment.consultation_notes[0].prescription && (
                          <div>
                            <strong>Receta:</strong> {appointment.consultation_notes[0].prescription}
                          </div>
                        )}
                        {appointment.consultation_notes[0].recommendations && (
                          <div>
                            <strong>Recomendaciones:</strong> {appointment.consultation_notes[0].recommendations}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Modal */}
        {selectedAppointment && (
          <RatingModal
            appointmentId={selectedAppointment.id}
            doctorUserId={selectedAppointment.doctor_user_id}
            patientUserId={user?.id || ''}
            isOpen={true}
            onRatingSubmitted={() => {
              setSelectedAppointment(null);
              fetchAppointments();
            }}
            onClose={() => setSelectedAppointment(null)}
          />
        )}
      </main>
    </div>
  );
};