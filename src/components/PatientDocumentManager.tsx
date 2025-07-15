import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Camera, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PatientIdDocument } from './PatientIdDocument';

interface PatientProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  profile_image_url: string | null;
  id_document_url: string | null;
}

interface PatientDocumentManagerProps {
  appointmentPatients: string[];
}

export const PatientDocumentManager = ({ appointmentPatients }: PatientDocumentManagerProps) => {
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'profile' | 'document' | null>(null);

  useEffect(() => {
    if (appointmentPatients.length > 0) {
      fetchPatientsData();
    }
  }, [appointmentPatients]);

  const fetchPatientsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, profile_image_url, id_document_url')
        .in('user_id', appointmentPatients)
        .eq('role', 'patient');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de los pacientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, patientId: string, type: 'profile' | 'document') => {
    setUploadingFor(patientId);
    setUploadType(type);

    try {
      const bucket = type === 'profile' ? 'patient-profiles' : 'patient-documents';
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}/${type}-${Date.now()}.${fileExt}`;

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
        .eq('user_id', patientId);

      if (updateError) throw updateError;

      toast({
        title: "Imagen subida",
        description: `${type === 'profile' ? 'Foto de perfil' : 'Documento'} actualizado correctamente`
      });

      // Refresh data
      fetchPatientsData();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen",
        variant: "destructive"
      });
    } finally {
      setUploadingFor(null);
      setUploadType(null);
    }
  };

  const isPatientComplete = (patient: PatientProfile) => {
    return patient.profile_image_url && patient.id_document_url;
  };

  const getIncompletePatients = () => {
    return patients.filter(patient => !isPatientComplete(patient));
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const incompletePatients = getIncompletePatients();

  if (incompletePatients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Documentos de Pacientes
          </CardTitle>
          <CardDescription>
            Todos los pacientes tienen documentos completos
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Documentos Incompletos
        </CardTitle>
        <CardDescription>
          {incompletePatients.length} paciente(s) necesitan completar sus documentos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Los siguientes pacientes no tienen documentos completos. Por favor, súbelos antes de continuar con las citas.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {incompletePatients.map((patient) => (
            <div key={patient.user_id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={patient.profile_image_url || ''} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{patient.full_name || 'Paciente sin nombre'}</h4>
                    {patient.phone && (
                      <p className="text-sm text-muted-foreground">{patient.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!patient.profile_image_url && (
                    <Badge variant="outline" className="text-orange-600">
                      Sin foto
                    </Badge>
                  )}
                  {!patient.id_document_url && (
                    <Badge variant="outline" className="text-orange-600">
                      Sin ID
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profile Image */}
                <div className="space-y-2">
                  <Label>Foto de Perfil</Label>
                  <div className="flex flex-col items-center gap-2">
                    {patient.profile_image_url ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden">
                        <img 
                          src={patient.profile_image_url} 
                          alt="Perfil"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, patient.user_id, 'profile');
                        }}
                        className="hidden"
                        id={`profile-${patient.user_id}`}
                      />
                      <label htmlFor={`profile-${patient.user_id}`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={uploadingFor === patient.user_id && uploadType === 'profile'}
                          asChild
                        >
                          <span>
                            {uploadingFor === patient.user_id && uploadType === 'profile' ? (
                              <LoadingSpinner />
                            ) : (
                              <>
                                <Camera className="h-4 w-4 mr-2" />
                                {patient.profile_image_url ? 'Cambiar' : 'Subir'}
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>

                {/* ID Document */}
                <div className="space-y-2">
                  <Label>Identificación Oficial</Label>
                   <div className="flex flex-col items-center gap-2">
                     {patient.id_document_url ? (
                       <div className="w-32 h-20">
                         <PatientIdDocument 
                           idDocumentUrl={patient.id_document_url}
                           patientUserId={patient.user_id}
                           compact={true}
                           showTitle={false}
                         />
                       </div>
                     ) : (
                       <div className="w-32 h-20 border-2 border-dashed border-muted-foreground/25 rounded flex items-center justify-center">
                         <Upload className="h-6 w-6 text-muted-foreground" />
                       </div>
                     )}
                    
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, patient.user_id, 'document');
                        }}
                        className="hidden"
                        id={`document-${patient.user_id}`}
                      />
                      <label htmlFor={`document-${patient.user_id}`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={uploadingFor === patient.user_id && uploadType === 'document'}
                          asChild
                        >
                          <span>
                            {uploadingFor === patient.user_id && uploadType === 'document' ? (
                              <LoadingSpinner />
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                {patient.id_document_url ? 'Cambiar' : 'Subir'}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};