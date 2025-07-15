import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Upload, User, IdCard, Check, X } from 'lucide-react';

interface Patient {
  user_id: string;
  full_name: string;
  profile_image_url?: string;
  id_document_url?: string;
}

interface UploadPatientFilesProps {
  doctorId: string;
}

export const UploadPatientFiles = ({ doctorId }: UploadPatientFilesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [uploading, setUploading] = useState<{ profile: boolean; id: boolean }>({ profile: false, id: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (doctorId) {
      fetchPatients();
    }
  }, [doctorId]);

  const fetchPatients = async () => {
    try {
      // Fetch upcoming appointments for the doctor to get patient list
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('patient_user_id')
        .eq('doctor_user_id', doctorId)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      if (!appointments || appointments.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      // Get unique patient IDs
      const uniquePatientIds = [...new Set(appointments.map(apt => apt.patient_user_id))];

      // Fetch patient profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_image_url, id_document_url')
        .in('user_id', uniquePatientIds);

      if (profilesError) throw profilesError;

      setPatients(profiles || []);
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

  const handleFileUpload = async (file: File, type: 'profile' | 'id') => {
    if (!selectedPatient || !user) return;

    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      // Determine bucket and file path
      const bucket = type === 'profile' ? 'patient-profiles' : 'patient-documents';
      const fileExt = file.name.split('.').pop();
      const fileName = type === 'profile' ? `profile.${fileExt}` : `id.${fileExt}`;
      const filePath = `${selectedPatient.user_id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Update patient profile with the URL
      const updateField = type === 'profile' ? 'profile_image_url' : 'id_document_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: publicUrl })
        .eq('user_id', selectedPatient.user_id);

      if (updateError) throw updateError;

      // Update local state
      setSelectedPatient(prev => prev ? { ...prev, [updateField]: publicUrl } : null);
      setPatients(prev => prev.map(p => 
        p.user_id === selectedPatient.user_id 
          ? { ...p, [updateField]: publicUrl }
          : p
      ));

      toast({
        title: "Éxito",
        description: `${type === 'profile' ? 'Foto de perfil' : 'Documento de identidad'} subido correctamente`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `No se pudo subir el ${type === 'profile' ? 'archivo' : 'documento'}`,
        variant: "destructive"
      });
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const createFileInputHandler = (type: 'profile' | 'id') => () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, type);
      }
    };
    input.click();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          📄 Subir documentos del paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {patients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay pacientes con citas próximas
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar paciente</label>
              <Select
                value={selectedPatient?.user_id || ""}
                onValueChange={(value) => {
                  const patient = patients.find(p => p.user_id === value);
                  setSelectedPatient(patient || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.user_id} value={patient.user_id}>
                      {patient.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPatient && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Image Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4" />
                      Foto de perfil
                      {selectedPatient.profile_image_url && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedPatient.profile_image_url && (
                      <div className="w-32 h-32 mx-auto">
                        <img
                          src={selectedPatient.profile_image_url}
                          alt="Foto de perfil"
                          className="w-full h-full object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    <Button
                      onClick={createFileInputHandler('profile')}
                      disabled={uploading.profile}
                      className="w-full"
                      variant={selectedPatient.profile_image_url ? "outline" : "default"}
                    >
                      {uploading.profile ? (
                        <>
                          <LoadingSpinner className="mr-2 h-4 w-4" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {selectedPatient.profile_image_url ? 'Reemplazar foto' : 'Subir foto'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* ID Document Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IdCard className="h-4 w-4" />
                      Identificación oficial
                      {selectedPatient.id_document_url && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedPatient.id_document_url && (
                      <div className="w-full max-w-xs mx-auto">
                        <img
                          src={selectedPatient.id_document_url}
                          alt="Documento de identidad"
                          className="w-full h-auto object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    <Button
                      onClick={createFileInputHandler('id')}
                      disabled={uploading.id}
                      className="w-full"
                      variant={selectedPatient.id_document_url ? "outline" : "default"}
                    >
                      {uploading.id ? (
                        <>
                          <LoadingSpinner className="mr-2 h-4 w-4" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {selectedPatient.id_document_url ? 'Reemplazar documento' : 'Subir documento'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedPatient && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="mt-1">
                    {selectedPatient.profile_image_url && selectedPatient.id_document_url ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {selectedPatient.profile_image_url && selectedPatient.id_document_url 
                        ? "✅ Documentos completos - El paciente puede pasar a consulta"
                        : "🧩 Ambos archivos son obligatorios antes de la consulta"
                      }
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estado: Foto de perfil {selectedPatient.profile_image_url ? '✅' : '❌'} | 
                      Identificación {selectedPatient.id_document_url ? '✅' : '❌'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};