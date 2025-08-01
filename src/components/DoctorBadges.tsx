import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Award, Crown, Star, Shield, Trophy, Heart } from 'lucide-react';

interface BadgeType {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface DoctorBadge {
  id: string;
  badge_type_id: string;
  assigned_at: string;
  notes: string;
  is_visible: boolean;
  badge_types: BadgeType;
}

interface DoctorBadgesProps {
  doctorUserId: string;
  variant?: 'default' | 'compact';
  showOnlyVisible?: boolean;
}

const iconComponents = {
  Award,
  Crown,
  Star,
  Shield,
  Trophy,
  Heart
};

export const DoctorBadges: React.FC<DoctorBadgesProps> = ({ 
  doctorUserId, 
  variant = 'default',
  showOnlyVisible = true 
}) => {
  const [badges, setBadges] = useState<DoctorBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDoctorBadges = async () => {
      try {
        let query = supabase
          .from('doctor_badges')
          .select(`
            *,
            badge_types (*)
          `)
          .eq('doctor_user_id', doctorUserId)
          .order('assigned_at', { ascending: false });

        if (showOnlyVisible) {
          query = query.eq('is_visible', true);
        }

        const { data, error } = await query;

        if (error) throw error;
        setBadges(data || []);
      } catch (error) {
        console.error('Error fetching doctor badges:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (doctorUserId) {
      fetchDoctorBadges();
    }
  }, [doctorUserId, showOnlyVisible]);

  const getIconComponent = (iconName: string) => {
    return iconComponents[iconName as keyof typeof iconComponents] || Award;
  };

  if (isLoading || badges.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-1">
        {badges.map((doctorBadge) => {
          const IconComponent = getIconComponent(doctorBadge.badge_types.icon);
          return (
            <div
              key={doctorBadge.id}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
              style={{ 
                backgroundColor: `${doctorBadge.badge_types.color}20`,
                color: doctorBadge.badge_types.color 
              }}
              title={`${doctorBadge.badge_types.name}: ${doctorBadge.badge_types.description}`}
            >
              <IconComponent className="h-3 w-3" />
              <span className="font-medium">{doctorBadge.badge_types.name}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Insignias</h4>
      <div className="flex flex-wrap gap-2">
        {badges.map((doctorBadge) => {
          const IconComponent = getIconComponent(doctorBadge.badge_types.icon);
          return (
            <div
              key={doctorBadge.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ 
                borderColor: doctorBadge.badge_types.color,
                backgroundColor: `${doctorBadge.badge_types.color}10`
              }}
              title={doctorBadge.badge_types.description}
            >
              <IconComponent 
                className="h-4 w-4" 
                style={{ color: doctorBadge.badge_types.color }}
              />
              <span 
                className="text-sm font-medium"
                style={{ color: doctorBadge.badge_types.color }}
              >
                {doctorBadge.badge_types.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};