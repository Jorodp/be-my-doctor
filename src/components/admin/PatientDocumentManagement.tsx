import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Search,
  Trash2,
  FileText,
  User,
  Image as ImageIcon,
  ExternalLink,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface PatientData {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_image_url: string | null;
  id_document_url: string | null;
  role: string;
  created_at: string;
}

export function PatientDocumentManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingDocument, setDeletingDocument] = useState<{
    userId: string;
    type: 'profile_image' | 'id_document';
    url: string;
  } | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      // Fetch all patients with their document info
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, profile_image_url, id_document_url, role, created_at')
        .eq('role', 'patient')
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Get email addresses from auth.users for each patient
      const patientsWithEmail = await Promise.all(
        (profiles || []).map(async (profile) => {
          let email = 'No disponible';
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
            if (userData?.user?.email) {
              email = userData.user.email;
            }
          } catch (error) {
            console.log('Could not fetch email for user:', profile.user_id);
          }
          
          return {
            ...profile,
            email
          };
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
    } finally {
      setLoading(false);
    }
  };

  const extractFileName = (url: string) => {
    if (!url) return '';
    
    try {
      // Extract file path from Supabase storage URL
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1];
    } catch (error) {
      return url;
    }
  };

  const deleteDocument = async (userId: string, documentType: 'profile_image' | 'id_document', fileUrl: string) => {
    try {
      const fileName = extractFileName(fileUrl);
      if (!fileName) {
        throw new Error('Could not extract filename from URL');
      }

      // Determine bucket and build file path
      const bucket = documentType === 'profile_image' ? 'patient-profiles' : 'patient-documents';
      const filePath = `${userId}/${fileName}`;

      // Delete file from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (storageError) {
        console.log('Storage deletion error (file may not exist):', storageError);
        // Continue with database update even if file doesn't exist in storage
      }

      // Update database to remove reference
      const updateData = documentType === 'profile_image' 
        ? { profile_image_url: null }
        : { id_document_url: null };

      const { error: dbError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (dbError) throw dbError;

      // Log audit trail
      const auditNote = `${documentType === 'profile_image' ? 'Foto de perfil' : 'Documento de identificación'} eliminado por admin (${user?.email}) el ${new Date().toISOString()}`;
      
      toast({
        title: "Documento Eliminado",
        description: `${documentType === 'profile_image' ? 'Foto de perfil' : 'Documento de identificación'} eliminado correctamente`
      });

      // Refresh data
      fetchPatients();
      setDeletingDocument(null);

    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive"
      });
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasDocuments = (patient: PatientData) => {
    return patient.profile_image_url || patient.id_document_url;
  };

  const getDocumentStatus = (patient: PatientData) => {
    const hasProfile = !!patient.profile_image_url;
    const hasId = !!patient.id_document_url;
    
    if (hasProfile && hasId) return { status: 'complete', text: 'Completo', color: 'bg-green-100 text-green-800' };
    if (hasProfile || hasId) return { status: 'partial', text: 'Parcial', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'missing', text: 'Sin documentos', color: 'bg-red-100 text-red-800' };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Gestión de Documentos de Pacientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{patients.length}</div>
            <div className="text-sm text-blue-700">Total Pacientes</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {patients.filter(p => getDocumentStatus(p).status === 'complete').length}
            </div>
            <div className="text-sm text-green-700">Documentos Completos</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {patients.filter(p => getDocumentStatus(p).status === 'partial').length}
            </div>
            <div className="text-sm text-yellow-700">Documentos Parciales</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {patients.filter(p => getDocumentStatus(p).status === 'missing').length}
            </div>
            <div className="text-sm text-red-700">Sin Documentos</div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Foto de Perfil</TableHead>
                <TableHead>Identificación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => {
                const docStatus = getDocumentStatus(patient);
                
                return (
                  <TableRow key={patient.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={patient.profile_image_url || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{patient.full_name || 'Sin nombre'}</div>
                          <div className="text-sm text-muted-foreground">{patient.email}</div>
                          {patient.phone && (
                            <div className="text-xs text-muted-foreground">📞 {patient.phone}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={docStatus.color}>
                        {docStatus.text}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {patient.profile_image_url ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(patient.profile_image_url!, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">No cargada</span>
                          </>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {patient.id_document_url ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(patient.id_document_url!, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">No cargada</span>
                          </>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex gap-1">
                        {/* Delete Profile Image */}
                        {patient.profile_image_url && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600">
                                <ImageIcon className="h-3 w-3 mr-1" />
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-red-600" />
                                  Eliminar Foto de Perfil
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar la foto de perfil de{' '}
                                  <strong>{patient.full_name}</strong>?
                                  <br /><br />
                                  Esta acción no se puede deshacer. El paciente deberá subir una nueva foto.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteDocument(patient.user_id, 'profile_image', patient.profile_image_url!)}
                                >
                                  Eliminar Foto
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {/* Delete ID Document */}
                        {patient.id_document_url && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600">
                                <FileText className="h-3 w-3 mr-1" />
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-red-600" />
                                  Eliminar Documento de Identificación
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar el documento de identificación de{' '}
                                  <strong>{patient.full_name}</strong>?
                                  <br /><br />
                                  Esta acción no se puede deshacer. El paciente deberá subir un nuevo documento.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteDocument(patient.user_id, 'id_document', patient.id_document_url!)}
                                >
                                  Eliminar Documento
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {!hasDocuments(patient) && (
                          <span className="text-xs text-muted-foreground">Sin documentos</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredPatients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}