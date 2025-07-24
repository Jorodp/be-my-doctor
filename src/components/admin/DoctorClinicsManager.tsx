import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MapPin, Trash2, Star, Building2 } from 'lucide-react';
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

interface DoctorClinicsManagerProps {
  doctorUserId: string;
  onClinicsChange?: () => void;
}

export function DoctorClinicsManager({ doctorUserId, onClinicsChange }: DoctorClinicsManagerProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
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
    loadClinics();
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
      await loadClinics();
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
    if (!confirm('¿Está seguro de que desea eliminar esta clínica?')) {
      return;
    }

    try {
      setSaving(true);

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
                  <div className="space-y-1">
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