import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  MapPin, 
  Trash2, 
  Star, 
  Building2, 
  Users, 
  Mail, 
  User, 
  Phone,
  UserPlus,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Clinic {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  consultation_fee?: number;
  is_primary?: boolean;
}

interface Assistant {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  email: string;
  profile_image_url?: string;
  created_at: string;
}

interface ClinicAssistant {
  id: string;
  clinic_id: string;
  assistant_id: string;
  assistant: Assistant;
}

interface ClinicsAndAssistantsManagerProps {
  doctorUserId: string;
  onClinicsChange?: () => void;
}

export function ClinicsAndAssistantsManager({ doctorUserId, onClinicsChange }: ClinicsAndAssistantsManagerProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicAssistants, setClinicAssistants] = useState<ClinicAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedClinicForAssistant, setSelectedClinicForAssistant] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'México',
    consultation_fee: ''
  });

  useEffect(() => {
    loadData();
  }, [doctorUserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadClinics(),
        loadClinicAssistants()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClinics = async () => {
    // Primero obtener el doctor_id interno
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', doctorUserId)
      .single();

    if (profileError) throw profileError;

    // Obtener las clínicas del doctor
    const { data: clinicsData, error: clinicsError } = await supabase
      .from('clinics')
      .select('*')
      .eq('doctor_id', profileData.id)
      .order('is_primary', { ascending: false })
      .order('name');

    if (clinicsError) throw clinicsError;

    setClinics(clinicsData || []);

    // Seleccionar primera clínica por defecto para asistentes
    if (clinicsData && clinicsData.length > 0 && !selectedClinicForAssistant) {
      // Asegurar que el ID de la clínica no sea vacío o undefined
      const firstValidClinic = clinicsData.find(clinic => clinic.id && clinic.id.trim() !== '');
      if (firstValidClinic) {
        setSelectedClinicForAssistant(firstValidClinic.id);
      }
    }
  };

  const loadClinicAssistants = async () => {
    try {
      // Obtener asistentes asignados a consultorios específicos
      const { data: clinicAssignments, error } = await supabase
        .from('clinic_assistants')
        .select(`
          id,
          clinic_id,
          assistant_id,
          profiles!clinic_assistants_assistant_id_fkey(
            user_id,
            full_name,
            phone,
            profile_image_url,
            created_at
          )
        `);

      if (error) throw error;

      // Obtener emails y detalles para cada asistente
      const assistantsWithDetails = await Promise.all(
        (clinicAssignments || []).map(async (assignment: any) => {
          const assistant = assignment.profiles;
          if (!assistant) return null;
          
          try {
            // Obtener email usando edge function
            const { data: userInfo, error: userError } = await supabase.functions.invoke(
              'get-assistant-info',
              { body: { user_id: assistant.user_id } }
            );

            return {
              id: assignment.id,
              clinic_id: assignment.clinic_id,
              assistant_id: assignment.assistant_id,
              assistant: {
                ...assistant,
                email: userInfo?.email || 'Email no disponible'
              }
            };
          } catch (error) {
            console.error('Error fetching assistant details:', error);
            return {
              id: assignment.id,
              clinic_id: assignment.clinic_id,
              assistant_id: assignment.assistant_id,
              assistant: {
                ...assistant,
                email: 'Email no disponible'
              }
            };
          }
        })
      );

      // Filtrar valores nulos
      const validAssistants = assistantsWithDetails.filter(Boolean);
      setClinicAssistants(validAssistants);
    } catch (error) {
      console.error('Error loading clinic assistants:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      country: 'México',
      consultation_fee: ''
    });
    setEditingClinic(null);
    setIsAddingNew(false);
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setFormData({
      name: clinic.name,
      address: clinic.address || '',
      city: clinic.city || '',
      state: clinic.state || '',
      country: clinic.country || 'México',
      consultation_fee: clinic.consultation_fee?.toString() || ''
    });
    setIsAddingNew(false);
  };

  const handleSaveClinic = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la clínica es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      // Obtener el doctor_id interno
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', doctorUserId)
        .single();

      if (profileError) throw profileError;

      const clinicData = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        country: formData.country.trim() || 'México',
        consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
        doctor_id: profileData.id,
        is_primary: clinics.length === 0 // Primera clínica es principal automáticamente
      };

      if (editingClinic) {
        // Actualizar clínica existente
        const { error } = await supabase
          .from('clinics')
          .update(clinicData)
          .eq('id', editingClinic.id);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Clínica actualizada correctamente'
        });
      } else {
        // Crear nueva clínica
        const { error } = await supabase
          .from('clinics')
          .insert(clinicData);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Clínica agregada correctamente'
        });
      }

      resetForm();
      await loadData();
      onClinicsChange?.();

    } catch (error) {
      console.error('Error saving clinic:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la clínica',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClinic = async (clinicId: string) => {
    try {
      // Verificar si hay citas asociadas a esta clínica
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id')
        .eq('clinic_id', clinicId)
        .limit(1);

      if (appointmentsError) throw appointmentsError;

      if (appointments && appointments.length > 0) {
        toast({
          title: 'No se puede eliminar',
          description: 'Esta clínica tiene citas asociadas. No se puede eliminar.',
          variant: 'destructive'
        });
        return;
      }

      if (!confirm('¿Está seguro de que desea eliminar esta clínica?')) {
        return;
      }

      setSaving(true);

      // Primero eliminar asistentes asignados
      await supabase
        .from('clinic_assistants')
        .delete()
        .eq('clinic_id', clinicId);

      // Luego eliminar la clínica
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', clinicId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Clínica eliminada correctamente'
      });

      await loadData();
      onClinicsChange?.();

    } catch (error) {
      console.error('Error deleting clinic:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la clínica',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (clinicId: string) => {
    try {
      setSaving(true);

      // Primero quitar primary de todas las clínicas
      await supabase
        .from('clinics')
        .update({ is_primary: false })
        .neq('id', clinicId);

      // Luego establecer la seleccionada como primary
      const { error } = await supabase
        .from('clinics')
        .update({ is_primary: true })
        .eq('id', clinicId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Clínica principal actualizada'
      });

      await loadData();
      onClinicsChange?.();

    } catch (error) {
      console.error('Error setting primary clinic:', error);
      toast({
        title: 'Error',
        description: 'No se pudo establecer como clínica principal',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInviteAssistant = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un email válido",
        variant: "destructive"
      });
      return;
    }

    if (!selectedClinicForAssistant) {
      toast({
        title: "Error",
        description: "Por favor selecciona un consultorio",
        variant: "destructive"
      });
      return;
    }

    try {
      setInviting(true);
      
      // Verificar si el usuario ya existe
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id, user_id, role')
        .eq('email', inviteEmail.trim())
        .single();

      let assistantProfileId: string;
      let assistantUserId: string;

      if (existingUser) {
        // Usuario existe - verificar que sea asistente
        if (existingUser.role !== 'assistant') {
          toast({
            title: "Error",
            description: "El usuario existe pero no tiene rol de asistente",
            variant: "destructive"
          });
          return;
        }
        
        assistantProfileId = existingUser.id;
        assistantUserId = existingUser.user_id;
      } else {
        // Usuario no existe - crear usando edge function
        const { data, error } = await supabase.functions.invoke('assign-assistant-by-email', {
          body: { 
            email: inviteEmail.trim(),
            doctor_id: doctorUserId
          }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw new Error(error.message || 'Error de conexión con el servidor');
        }

        if (!data || data.error) {
          throw new Error(data?.error || 'Error desconocido del servidor');
        }

        // Obtener el ID interno del asistente recién creado
        const { data: assistantProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('user_id', data.assistant_user_id)
          .single();

        if (profileError) {
          console.error('Error getting assistant profile:', profileError);
          throw new Error('Error obteniendo perfil del asistente');
        }

        assistantProfileId = assistantProfile.id;
        assistantUserId = assistantProfile.user_id;
      }

      // Asignar SOLO al consultorio específico (NO al doctor en general)
      const { error: clinicAssignError } = await supabase
        .from('clinic_assistants')
        .insert({
          clinic_id: selectedClinicForAssistant,
          assistant_id: assistantProfileId
        });

      if (clinicAssignError) {
        console.error('Error assigning to clinic:', clinicAssignError);
        // Si el asistente ya está asignado a este consultorio, está bien
        if (!clinicAssignError.message.includes('duplicate') && !clinicAssignError.message.includes('unique')) {
          throw clinicAssignError;
        }
      }

      const selectedClinicName = clinics.find(c => c.id === selectedClinicForAssistant)?.name;
      toast({
        title: "¡Éxito!",
        description: `Asistente asignado al consultorio ${selectedClinicName}`,
        variant: "default"
      });

      setInviteEmail('');
      await loadData();
      
    } catch (error: any) {
      console.error('Error inviting assistant:', error);
      
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el asistente",
        variant: "destructive"
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveAssistant = async (assistantId: string, assistantName: string, clinicId: string) => {
    try {
      // Remover de clínica específica
      const { error } = await supabase
        .from('clinic_assistants')
        .delete()
        .eq('clinic_id', clinicId)
        .eq('assistant_id', assistantId);

      if (error) throw error;

      toast({
        title: "Asistente removido del consultorio",
        description: `${assistantName} ha sido removido del consultorio`,
        variant: "default"
      });

      await loadData();
    } catch (error) {
      console.error('Error removing assistant:', error);
      toast({
        title: "Error", 
        description: "No se pudo remover el asistente",
        variant: "destructive"
      });
    }
  };

  const getAssistantsForClinic = (clinicId: string) => {
    return clinicAssistants.filter(ca => ca.clinic_id === clinicId);
  };

  const getUnassignedAssistants = () => {
    // Ya no mostramos asistentes no asignados porque ahora solo trabajamos con asignaciones específicas
    return [];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-32">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="clinics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clinics" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Consultorios
          </TabsTrigger>
          <TabsTrigger value="assistants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Asistentes por Consultorio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinics" className="space-y-4">
          {/* Lista de clínicas existentes */}
          {clinics.length > 0 && (
            <div className="space-y-3">
              {clinics.map((clinic) => (
                <Card key={clinic.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{clinic.name}</h4>
                          {clinic.is_primary && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Principal
                            </Badge>
                          )}
                        </div>
                        {clinic.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {clinic.address}
                            {clinic.city && `, ${clinic.city}`}
                            {clinic.state && `, ${clinic.state}`}
                          </p>
                        )}
                        {clinic.consultation_fee && (
                          <p className="text-sm font-medium text-primary">
                            Consulta: ${clinic.consultation_fee.toLocaleString()} MXN
                          </p>
                        )}
                        {/* Mostrar asistentes asignados */}
                        {getAssistantsForClinic(clinic.id).length > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            Asistentes: {getAssistantsForClinic(clinic.id)
                              .map(ca => ca.assistant.full_name)
                              .join(', ')
                            }
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!clinic.is_primary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetPrimary(clinic.id)}
                            disabled={saving}
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(clinic)}
                          disabled={saving}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClinic(clinic.id)}
                          disabled={saving || clinics.length === 1}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Formulario para agregar/editar */}
          {(isAddingNew || editingClinic) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingClinic ? 'Editar Clínica' : 'Agregar Nueva Clínica'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre de la Clínica *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ej: Consultorio Médico Central"
                    />
                  </div>
                  <div>
                    <Label htmlFor="consultation_fee">Costo de Consulta (MXN)</Label>
                    <Input
                      id="consultation_fee"
                      type="number"
                      value={formData.consultation_fee}
                      onChange={(e) => handleInputChange('consultation_fee', e.target.value)}
                      placeholder="Ej: 800"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Dirección completa del consultorio"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Ej: Ciudad de México"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Ej: CDMX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="México"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveClinic} disabled={saving}>
                    {saving ? 'Guardando...' : (editingClinic ? 'Actualizar' : 'Agregar')}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botón para agregar nueva clínica */}
          {!isAddingNew && !editingClinic && (
            <Button onClick={() => setIsAddingNew(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Nuevo Consultorio
            </Button>
          )}

          {clinics.length === 0 && !isAddingNew && (
            <Card>
              <CardContent className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">No tienes consultorios registrados</p>
                <p className="text-muted-foreground mb-4">
                  Agrega tu primer consultorio para comenzar a gestionar citas.
                </p>
                <Button onClick={() => setIsAddingNew(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primer Consultorio
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assistants" className="space-y-4">
          {clinics.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">No tienes consultorios registrados</p>
                <p className="text-muted-foreground">
                  Necesitas tener al menos un consultorio para asignar asistentes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Formulario para asignar asistente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Asignar Asistente a Consultorio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Consultorio</Label>
                    <Select 
                      value={selectedClinicForAssistant || undefined} 
                      onValueChange={setSelectedClinicForAssistant}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un consultorio" />
                      </SelectTrigger>
                      <SelectContent>
                        {clinics
                          .filter(clinic => clinic.id && clinic.id.trim() !== '')
                          .map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{clinic.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {clinic.address && `${clinic.address}, `}{clinic.city}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-3">
                    <Input
                      type="email"
                      placeholder="email@ejemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleInviteAssistant}
                      disabled={inviting || !inviteEmail.trim() || !selectedClinicForAssistant}
                    >
                      {inviting ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Asignando...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Asignar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de asistentes por consultorio */}
              <div className="space-y-4">
                {clinics.map((clinic) => {
                  const assistantsForClinic = getAssistantsForClinic(clinic.id);
                  return (
                    <Card key={clinic.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {clinic.name}
                          <Badge variant="outline">
                            {assistantsForClinic.length} asistente(s)
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {assistantsForClinic.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            <User className="h-8 w-8 mx-auto mb-2" />
                            <p>No hay asistentes asignados a este consultorio</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {assistantsForClinic.map((clinicAssistant) => (
                              <div key={clinicAssistant.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarImage src={clinicAssistant.assistant.profile_image_url || ''} />
                                    <AvatarFallback>
                                      <User className="h-5 w-5" />
                                    </AvatarFallback>
                                  </Avatar>
                                  
                                  <div>
                                    <h4 className="font-medium">
                                      {clinicAssistant.assistant.full_name || 'Nombre no disponible'}
                                    </h4>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Mail className="h-3 w-3" />
                                      <span>{clinicAssistant.assistant.email}</span>
                                    </div>
                                    {clinicAssistant.assistant.phone && (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        <span>{clinicAssistant.assistant.phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Activo
                                  </Badge>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveAssistant(
                                      clinicAssistant.assistant_id, 
                                      clinicAssistant.assistant.full_name || 'Asistente',
                                      clinic.id
                                    )}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}