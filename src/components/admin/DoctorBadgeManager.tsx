import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Award, Crown, Star, Shield, Trophy, Heart, Eye, EyeOff } from 'lucide-react';

interface BadgeType {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
}

interface DoctorBadge {
  id: string;
  badge_type_id: string;
  assigned_at: string;
  notes: string;
  is_visible: boolean;
  badge_types: BadgeType;
}

interface DoctorBadgeManagerProps {
  doctorUserId: string;
  doctorName: string;
}

const iconComponents = {
  Award,
  Crown,
  Star,
  Shield,
  Trophy,
  Heart
};

export const DoctorBadgeManager: React.FC<DoctorBadgeManagerProps> = ({ 
  doctorUserId, 
  doctorName 
}) => {
  const [doctorBadges, setDoctorBadges] = useState<DoctorBadge[]>([]);
  const [availableBadges, setAvailableBadges] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const fetchDoctorBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_badges')
        .select(`
          *,
          badge_types (*)
        `)
        .eq('doctor_user_id', doctorUserId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setDoctorBadges(data || []);
    } catch (error) {
      console.error('Error fetching doctor badges:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las insignias del doctor",
        variant: "destructive"
      });
    }
  };

  const fetchAvailableBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badge_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAvailableBadges(data || []);
    } catch (error) {
      console.error('Error fetching available badges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorBadges();
    fetchAvailableBadges();
  }, [doctorUserId]);

  const handleAssignBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBadgeId) {
      toast({
        title: "Error",
        description: "Selecciona una insignia",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('doctor_badges')
        .insert([{
          doctor_user_id: doctorUserId,
          badge_type_id: selectedBadgeId,
          notes: notes,
          is_visible: true
        }]);
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Error",
            description: "Este doctor ya tiene esta insignia asignada",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }
      
      toast({
        title: "Éxito",
        description: "Insignia asignada correctamente"
      });
      
      fetchDoctorBadges();
      setIsDialogOpen(false);
      setSelectedBadgeId('');
      setNotes('');
    } catch (error) {
      console.error('Error assigning badge:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar la insignia",
        variant: "destructive"
      });
    }
  };

  const handleRemoveBadge = async (badgeId: string) => {
    if (!confirm('¿Estás seguro de que quieres quitar esta insignia?')) return;
    
    try {
      const { error } = await supabase
        .from('doctor_badges')
        .delete()
        .eq('id', badgeId);
      
      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Insignia removida correctamente"
      });
      fetchDoctorBadges();
    } catch (error) {
      console.error('Error removing badge:', error);
      toast({
        title: "Error",
        description: "No se pudo remover la insignia",
        variant: "destructive"
      });
    }
  };

  const toggleBadgeVisibility = async (badge: DoctorBadge) => {
    try {
      const { error } = await supabase
        .from('doctor_badges')
        .update({ is_visible: !badge.is_visible })
        .eq('id', badge.id);
      
      if (error) throw error;
      
      fetchDoctorBadges();
      toast({
        title: "Éxito",
        description: `Insignia ${badge.is_visible ? 'ocultada' : 'mostrada'} correctamente`
      });
    } catch (error) {
      console.error('Error toggling badge visibility:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar la visibilidad de la insignia",
        variant: "destructive"
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    return iconComponents[iconName as keyof typeof iconComponents] || Award;
  };

  const getAvailableBadgesToAssign = () => {
    const assignedBadgeIds = doctorBadges.map(db => db.badge_type_id);
    return availableBadges.filter(badge => !assignedBadgeIds.includes(badge.id));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">ℹ️ Cómo asignar insignias</h4>
        <p className="text-sm text-blue-700">
          • Haz clic en "Asignar Insignia" para otorgar una nueva insignia a este doctor<br/>
          • Solo puedes asignar cada tipo de insignia una vez por doctor<br/>
          • Usa el botón de ojo para controlar si la insignia es visible al público<br/>
          • Las insignias aparecerán en el perfil público del doctor
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">
          Insignias de {doctorName}
        </h3>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Asignar Nueva Insignia
        </Button>
      </div>

      {doctorBadges.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="text-center py-8">
            <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Sin insignias asignadas</h4>
            <p className="text-gray-600 mb-4">
              Este doctor no tiene ninguna insignia asignada aún.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Asignar Primera Insignia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctorBadges.map((doctorBadge) => {
            const IconComponent = getIconComponent(doctorBadge.badge_types.icon);
            return (
              <Card key={doctorBadge.id} className={`relative ${!doctorBadge.is_visible ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent 
                        className="h-5 w-5" 
                        style={{ color: doctorBadge.badge_types.color }}
                      />
                      <CardTitle className="text-lg">{doctorBadge.badge_types.name}</CardTitle>
                    </div>
                    <Badge variant={doctorBadge.is_visible ? 'default' : 'secondary'}>
                      {doctorBadge.is_visible ? 'Visible' : 'Oculta'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {doctorBadge.badge_types.description}
                  </p>
                  {doctorBadge.notes && (
                    <p className="text-sm mb-3 p-2 bg-muted rounded">
                      <strong>Notas:</strong> {doctorBadge.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mb-4">
                    Asignada: {new Date(doctorBadge.assigned_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleBadgeVisibility(doctorBadge)}
                    >
                      {doctorBadge.is_visible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleRemoveBadge(doctorBadge.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Insignia a {doctorName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignBadge} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Selecciona una insignia para asignar:
              </label>
              {getAvailableBadgesToAssign().length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    No hay insignias disponibles para asignar. Este doctor ya tiene todas las insignias posibles.
                  </p>
                </div>
              ) : (
                <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="👇 Haz clic para ver las opciones disponibles" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableBadgesToAssign().map((badge) => {
                      const IconComponent = getIconComponent(badge.icon);
                      return (
                        <SelectItem key={badge.id} value={badge.id}>
                          <div className="flex items-center gap-3 py-1">
                            <IconComponent 
                              className="h-5 w-5 flex-shrink-0" 
                              style={{ color: badge.color }}
                            />
                            <div>
                              <div className="font-medium">{badge.name}</div>
                              <div className="text-xs text-gray-500">{badge.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Motivo de la asignación o notas adicionales"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Asignar
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};