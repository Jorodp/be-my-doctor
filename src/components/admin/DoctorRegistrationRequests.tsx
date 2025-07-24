import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Stethoscope,
  Calendar,
  MessageSquare
} from 'lucide-react';

interface RegistrationRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  specialty: string;
  professional_license: string;
  years_experience: number;
  clinic_address?: string;
  clinic_city?: string;
  clinic_state?: string;
  preferred_contact_method: string;
  preferred_contact_time?: string;
  additional_notes?: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export default function DoctorRegistrationRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [processing, setProcessing] = useState(false);

  const statusColors = {
    pending: 'default',
    in_review: 'secondary',
    approved: 'outline',
    rejected: 'destructive'
  } as const;

  const statusLabels = {
    pending: 'Pendiente',
    in_review: 'En revisión',
    approved: 'Aprobada',
    rejected: 'Rechazada'
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las solicitudes."
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string, notes?: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('doctor_registration_requests')
        .update({
          status: newStatus,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `La solicitud ha sido ${statusLabels[newStatus as keyof typeof statusLabels].toLowerCase()}.`
      });

      await fetchRequests();
      setShowDetailModal(false);
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado de la solicitud."
      });
    } finally {
      setProcessing(false);
    }
  };

  const createDoctorAccount = async (request: RegistrationRequest) => {
    if (!tempPassword.trim()) {
      toast({
        variant: "destructive",
        title: "Contraseña requerida",
        description: "Por favor ingresa una contraseña temporal."
      });
      return;
    }

    setProcessing(true);
    try {
      // Primero aprobar la solicitud
      await updateRequestStatus(request.id, 'approved', adminNotes);

      // Luego crear la cuenta del doctor usando la función de la base de datos
      const { data, error } = await supabase.rpc('create_doctor_from_request', {
        p_request_id: request.id,
        p_admin_id: (await supabase.auth.getUser()).data.user?.id,
        p_temp_password: tempPassword
      });

      if (error) throw error;

      toast({
        title: "Cuenta creada",
        description: `Se ha creado la cuenta para ${request.full_name}. Contraseña temporal: ${tempPassword}`
      });

      setShowCreateModal(false);
      setTempPassword('');
      setAdminNotes('');
      await fetchRequests();
    } catch (error: any) {
      console.error('Error creating doctor account:', error);
      toast({
        variant: "destructive",
        title: "Error al crear cuenta",
        description: error.message || "No se pudo crear la cuenta del doctor."
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDetailModal = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setShowDetailModal(true);
  };

  const openCreateModal = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setAdminNotes('');
    setTempPassword('');
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Solicitudes de Registro</h2>
          <p className="text-muted-foreground">
            Gestiona las solicitudes de registro de nuevos doctores
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {requests.length} solicitudes
        </Badge>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay solicitudes</h3>
            <p className="text-muted-foreground text-center">
              No se han recibido solicitudes de registro de doctores aún.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{request.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-4 w-4" />
                        {request.specialty}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {request.years_experience} años de experiencia
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>
                    {request.status === 'pending' && (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{request.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{request.phone}</span>
                    </div>
                    {request.clinic_city && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{request.clinic_city}, {request.clinic_state}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Cédula:</span> {request.professional_license}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Contacto preferido:</span> {request.preferred_contact_method}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Solicitud: {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDetailModal(request)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalles
                  </Button>
                  
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateRequestStatus(request.id, 'in_review')}
                        disabled={processing}
                      >
                        Marcar en revisión
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateModal(request)}
                        disabled={processing}
                        className="text-green-600 hover:text-green-700"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Crear cuenta
                      </Button>
                    </>
                  )}
                  
                  {request.status === 'in_review' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateModal(request)}
                        disabled={processing}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprobar y crear cuenta
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateRequestStatus(request.id, 'rejected', adminNotes)}
                        disabled={processing}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de detalles */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la solicitud</DialogTitle>
            <DialogDescription>
              Revisa la información completa de la solicitud de {selectedRequest?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Información personal */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Información Personal
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Nombre:</span> {selectedRequest.full_name}</div>
                  <div><span className="font-medium">Email:</span> {selectedRequest.email}</div>
                  <div><span className="font-medium">Teléfono:</span> {selectedRequest.phone}</div>
                  <div><span className="font-medium">Especialidad:</span> {selectedRequest.specialty}</div>
                  <div><span className="font-medium">Cédula:</span> {selectedRequest.professional_license}</div>
                  <div><span className="font-medium">Experiencia:</span> {selectedRequest.years_experience} años</div>
                </div>
              </div>

              {/* Ubicación */}
              {selectedRequest.clinic_address && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Ubicación del Consultorio
                  </h4>
                  <div className="text-sm space-y-1">
                    <div>{selectedRequest.clinic_address}</div>
                    <div>{selectedRequest.clinic_city}, {selectedRequest.clinic_state}</div>
                  </div>
                </div>
              )}

              {/* Preferencias de contacto */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Preferencias de Contacto
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Método preferido:</span> {selectedRequest.preferred_contact_method}</div>
                  {selectedRequest.preferred_contact_time && (
                    <div><span className="font-medium">Horario:</span> {selectedRequest.preferred_contact_time}</div>
                  )}
                </div>
              </div>

              {/* Notas adicionales */}
              {selectedRequest.additional_notes && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentarios del Solicitante
                  </h4>
                  <p className="text-sm bg-muted p-3 rounded">{selectedRequest.additional_notes}</p>
                </div>
              )}

              {/* Notas del admin */}
              <div>
                <Label htmlFor="admin-notes">Notas de administración</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Añade notas sobre esta solicitud..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => updateRequestStatus(selectedRequest.id, 'in_review', adminNotes)}
                      disabled={processing}
                    >
                      Marcar en revisión
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'rejected', adminNotes)}
                      disabled={processing}
                    >
                      Rechazar
                    </Button>
                  </>
                )}
                
                {selectedRequest.status === 'in_review' && (
                  <>
                    <Button
                      onClick={() => updateRequestStatus(selectedRequest.id, 'approved', adminNotes)}
                      disabled={processing}
                    >
                      Aprobar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'rejected', adminNotes)}
                      disabled={processing}
                    >
                      Rechazar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de crear cuenta */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear cuenta de doctor</DialogTitle>
            <DialogDescription>
              Crear una cuenta para {selectedRequest?.full_name} y aprobar su solicitud
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="temp-password">Contraseña temporal *</Label>
              <Input
                id="temp-password"
                type="password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Ingresa una contraseña temporal"
                required
              />
              <p className="text-sm text-muted-foreground">
                Esta contraseña será enviada al doctor para su primer acceso.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin-notes-create">Notas de aprobación</Label>
              <Textarea
                id="admin-notes-create"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notas sobre la aprobación..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => selectedRequest && createDoctorAccount(selectedRequest)}
                disabled={processing || !tempPassword.trim()}
                className="flex-1"
              >
                {processing ? 'Creando cuenta...' : 'Crear cuenta y aprobar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={processing}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}