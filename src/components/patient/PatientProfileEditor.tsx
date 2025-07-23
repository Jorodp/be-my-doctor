import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Save, User } from 'lucide-react';

interface PatientProfile {
  full_name: string;
  phone: string;
  date_of_birth: string;
  address: string;
}

export const PatientProfileEditor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PatientProfile>({
    full_name: '',
    phone: '',
    date_of_birth: '',
    address: ''
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, date_of_birth, address')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          address: data.address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          date_of_birth: profile.date_of_birth || null,
          address: profile.address
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Perfil actualizado correctamente"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof PatientProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Información Personal</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre Completo *</Label>
          <Input
            id="full_name"
            value={profile.full_name}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            placeholder="Ingresa tu nombre completo"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={profile.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="Ingresa tu teléfono"
            type="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Fecha de Nacimiento</Label>
          <Input
            id="date_of_birth"
            value={profile.date_of_birth}
            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            type="date"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Dirección</Label>
          <Textarea
            id="address"
            value={profile.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Ingresa tu dirección completa"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <LoadingSpinner className="w-4 h-4 mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </form>
  );
};