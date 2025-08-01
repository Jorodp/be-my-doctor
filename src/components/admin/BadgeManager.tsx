import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Award, Crown, Star, Shield, Trophy, Heart } from 'lucide-react';

interface BadgeType {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

const iconOptions = [
  { value: 'Award', label: 'Award', icon: Award },
  { value: 'Crown', label: 'Crown', icon: Crown },
  { value: 'Star', label: 'Star', icon: Star },
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'Trophy', label: 'Trophy', icon: Trophy },
  { value: 'Heart', label: 'Heart', icon: Heart },
];

export const BadgeManager: React.FC = () => {
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Award'
  });
  const { toast } = useToast();

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badge_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las insignias",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBadge) {
        const { error } = await supabase
          .from('badge_types')
          .update(formData)
          .eq('id', editingBadge.id);
        
        if (error) throw error;
        toast({
          title: "Éxito",
          description: "Insignia actualizada correctamente"
        });
      } else {
        const { error } = await supabase
          .from('badge_types')
          .insert([formData]);
        
        if (error) throw error;
        toast({
          title: "Éxito",
          description: "Insignia creada correctamente"
        });
      }
      
      fetchBadges();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving badge:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la insignia",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (badgeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta insignia?')) return;
    
    try {
      const { error } = await supabase
        .from('badge_types')
        .delete()
        .eq('id', badgeId);
      
      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Insignia eliminada correctamente"
      });
      fetchBadges();
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la insignia",
        variant: "destructive"
      });
    }
  };

  const toggleStatus = async (badge: BadgeType) => {
    try {
      const { error } = await supabase
        .from('badge_types')
        .update({ is_active: !badge.is_active })
        .eq('id', badge.id);
      
      if (error) throw error;
      fetchBadges();
    } catch (error) {
      console.error('Error toggling badge status:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la insignia",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: 'Award'
    });
    setEditingBadge(null);
  };

  const openEditDialog = (badge: BadgeType) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description || '',
      color: badge.color,
      icon: badge.icon
    });
    setIsDialogOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Award;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Cargando insignias...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Insignias</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Insignia
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map((badge) => {
          const IconComponent = getIconComponent(badge.icon);
          return (
            <Card key={badge.id} className={`relative ${!badge.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent 
                      className="h-5 w-5" 
                      style={{ color: badge.color }}
                    />
                    <CardTitle className="text-lg">{badge.name}</CardTitle>
                  </div>
                  <Badge variant={badge.is_active ? 'default' : 'secondary'}>
                    {badge.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {badge.description || 'Sin descripción'}
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(badge)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={badge.is_active ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => toggleStatus(badge)}
                  >
                    {badge.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(badge.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBadge ? 'Editar Insignia' : 'Crear Nueva Insignia'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Fundador"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la insignia"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Icono</label>
              <Select 
                value={formData.icon}
                onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingBadge ? 'Actualizar' : 'Crear'}
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