import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MapPin, Trash2, Star, Building2, Users, Clock, Mail } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
}

interface ClinicAssistant {
  id: string;
  clinic_id: string;
  assistant_id: string;
  full_name: string;
}

interface DoctorClinicsManagerProps {
  doctorUserId: string;
  onClinicsChange?: () => void;
}

export function DoctorClinicsManager({ doctorUserId, onClinicsChange }: DoctorClinicsManagerProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [clinicAssistants, setClinicAssistants] = useState<ClinicAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [assistantEmail, setAssistantEmail] = useState('');
  const [assigningAssistant, setAssigningAssistant] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'México',
    consultation_fee: '',
    selectedAssistants: [] as string[]
  });

  useEffect(() => {
    loadClinics();
    loadAssistants();
  }, [doctorUserId]);

  const loadClinics = async () => {
    try {
      setLoading(true);
      
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
      
      // Cargar asistentes de las clínicas
      await loadClinicAssistants();
    } catch (error) {
      console.error('Error loading clinics:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las clínicas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAssistants = async () => {
    try {
      const { data: assistantsData, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name')
        .eq('role', 'assistant')
        .order('full_name');

      if (error) throw error;
      setAssistants(assistantsData || []);
    } catch (error) {
      console.error('Error loading assistants:', error);
    }
  };

  const loadClinicAssistants = async () => {
    try {
      const { data: clinicAssistantsData, error } = await supabase
        .from('clinic_assistants')
        .select(`
          id,
          clinic_id,
          assistant_id,
          profiles!inner(full_name)
        `);

      if (error) throw error;

      const formattedData = clinicAssistantsData?.map((item: any) => ({
        id: item.id,
        clinic_id: item.clinic_id,
        assistant_id: item.assistant_id,
        full_name: item.profiles?.full_name || 'Sin nombre'
      })) || [];

      setClinicAssistants(formattedData);
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
      consultation_fee: '',
      selectedAssistants: []
    });
    setEditingClinic(null);
    setIsAddingNew(false);
    setAssistantEmail('');
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    
    // Obtener asistentes de esta clínica
    const assistantsForClinic = clinicAssistants
      .filter(ca => ca.clinic_id === clinic.id)
      .map(ca => ca.assistant_id);

    setFormData({
      name: clinic.name,
      address: clinic.address || '',
      city: clinic.city || '',
      state: clinic.state || '',
      country: clinic.country || 'México',
      consultation_fee: clinic.consultation_fee?.toString() || '',
      selectedAssistants: assistantsForClinic
    });
    setIsAddingNew(false);
  };

  const assignAssistantsToClinic = async (clinicId: string, assistantIds: string[]) => {
    if (assistantIds.length === 0) return;

    const assignments = assistantIds.map(assistantId => ({
      clinic_id: clinicId,
      assistant_id: assistantId
    }));

    const { error } = await supabase
      .from('clinic_assistants')
      .insert(assignments);

    if (error) throw error;
  };

  const updateClinicAssistants = async (clinicId: string, assistantIds: string[]) => {
    // Primero eliminar asignaciones existentes
    await supabase
      .from('clinic_assistants')
      .delete()
      .eq('clinic_id', clinicId);

    // Luego agregar las nuevas asignaciones
    await assignAssistantsToClinic(clinicId, assistantIds);
  };

  const handleSave = async () => {
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

        // Actualizar asistentes de la clínica
        await updateClinicAssistants(editingClinic.id, formData.selectedAssistants);

        toast({
          title: 'Éxito',
          description: 'Clínica actualizada correctamente'
        });
      } else {
        // Crear nueva clínica
        const { data: newClinic, error } = await supabase
          .from('clinics')
          .insert(clinicData)
          .select()
          .single();

        if (error) throw error;

        // Asignar asistentes a la nueva clínica
        if (formData.selectedAssistants.length > 0) {
          await assignAssistantsToClinic(newClinic.id, formData.selectedAssistants);
        }

        toast({
          title: 'Éxito',
          description: 'Clínica agregada correctamente'
        });
      }

      resetForm();
      await loadClinics();
      await loadClinicAssistants();
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

  const handleDelete = async (clinicId: string) => {
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

      await loadClinics();
      await loadClinicAssistants();
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

      await loadClinics();
      await loadClinicAssistants();
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

  const handleAssignAssistantByEmail = async () => {
    if (!assistantEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un email válido',
        variant: 'destructive'
      });
      return;
    }

    if (!editingClinic) {
      toast({
        title: 'Error',
        description: 'Guarda primero la clínica antes de asignar asistentes',
        variant: 'destructive'
      });
      return;
    }

    try {
      setAssigningAssistant(true);

      const { data, error } = await supabase.functions.invoke('assign-assistant-by-email', {
        body: { 
          email: assistantEmail.trim(),
          doctor_id: doctorUserId,
          clinic_id: editingClinic.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Error de conexión con el servidor');
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Error desconocido del servidor');
      }

      toast({
        title: 'Éxito',
        description: 'Asistente asignado correctamente a la clínica'
      });

      setAssistantEmail('');
      await loadClinicAssistants();

    } catch (error) {
      console.error('Error assigning assistant:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo asignar el asistente',
        variant: 'destructive'
      });
    } finally {
      setAssigningAssistant(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-32">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Consultorios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de clínicas existentes */}
        {clinics.length > 0 && (
          <div className="space-y-3">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                className="border rounded-lg p-4 space-y-2"
              >
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
                    {clinicAssistants.filter(ca => ca.clinic_id === clinic.id).length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Asistentes: {clinicAssistants
                          .filter(ca => ca.clinic_id === clinic.id)
                          .map(ca => ca.full_name)
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
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(clinic.id)}
                      disabled={saving || clinics.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario para agregar/editar */}
        {(isAddingNew || editingClinic) && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-3">
              {editingClinic ? 'Editar Clínica' : 'Agregar Nueva Clínica'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinic-name">Nombre de la clínica *</Label>
                <Input
                  id="clinic-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Clínica Médica Santa Ana"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultation-fee">Precio de consulta (MXN)</Label>
                <Input
                  id="consultation-fee"
                  type="number"
                  step="0.01"
                  value={formData.consultation_fee}
                  onChange={(e) => handleInputChange('consultation_fee', e.target.value)}
                  placeholder="800.00"
                />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="clinic-address">Dirección</Label>
              <Textarea
                id="clinic-address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Calle, número, colonia..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="clinic-city">Ciudad</Label>
                <Input
                  id="clinic-city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Ciudad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic-state">Estado</Label>
                <Input
                  id="clinic-state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="Estado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic-country">País</Label>
                <Input
                  id="clinic-country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="País"
                />
              </div>
            </div>
            
            {/* Sección de asistentes */}
            <div className="space-y-3 mt-4">
              <Label>Asignar Asistente por Email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={assistantEmail}
                  onChange={(e) => setAssistantEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="button"
                  onClick={handleAssignAssistantByEmail}
                  disabled={!assistantEmail.trim() || assigningAssistant}
                  size="sm"
                >
                  {assigningAssistant ? (
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
              <p className="text-xs text-muted-foreground">
                Si el usuario no tiene cuenta, se creará automáticamente como asistente.
              </p>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Botón para agregar nueva clínica */}
        {!isAddingNew && !editingClinic && (
          <Button
            variant="outline"
            onClick={() => setIsAddingNew(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Consultorio
          </Button>
        )}

        {clinics.length === 0 && !isAddingNew && (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay consultorios registrados</p>
            <p className="text-sm">Agregue al menos un consultorio para que el doctor pueda recibir pacientes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}