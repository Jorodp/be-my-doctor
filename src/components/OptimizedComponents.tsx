import React, { memo, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

// Componente optimizado para listas de doctores
interface DoctorCardProps {
  doctor: {
    id: string;
    name: string;
    specialty: string;
    rating: number;
    verified: boolean;
  };
  onSelect: (id: string) => void;
}

export const OptimizedDoctorCard = memo(({ doctor, onSelect }: DoctorCardProps) => {
  const handleSelect = useCallback(() => {
    onSelect(doctor.id);
  }, [doctor.id, onSelect]);

  const ratingDisplay = useMemo(() => {
    return `⭐ ${doctor.rating.toFixed(1)}`;
  }, [doctor.rating]);

  return (
    <Card className="p-4 hover-scale cursor-pointer" onClick={handleSelect}>
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h3 className="font-semibold">{doctor.name}</h3>
          <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm">{ratingDisplay}</span>
            {doctor.verified && (
              <Badge variant="secondary" className="text-xs">
                Verificado
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
});

OptimizedDoctorCard.displayName = 'OptimizedDoctorCard';

// Componente optimizado para notificaciones
interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    read: boolean;
    timestamp: string;
  };
  onMarkAsRead: (id: string) => void;
}

export const OptimizedNotificationItem = memo(({ notification, onMarkAsRead }: NotificationItemProps) => {
  const { useDebounce } = usePerformanceOptimization();
  
  const debouncedMarkAsRead = useDebounce((id: string) => {
    onMarkAsRead(id);
  }, 300);

  const handleMarkAsRead = useCallback(() => {
    if (!notification.read) {
      debouncedMarkAsRead(notification.id);
    }
  }, [notification.id, notification.read, debouncedMarkAsRead]);

  const timeAgo = useMemo(() => {
    const now = new Date();
    const notificationTime = new Date(notification.timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `hace ${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `hace ${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `hace ${Math.floor(diffInMinutes / 1440)}d`;
    }
  }, [notification.timestamp]);

  return (
    <div 
      className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
        !notification.read ? 'bg-accent/10' : ''
      }`}
      onClick={handleMarkAsRead}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1">
          <p className="font-medium text-sm">{notification.title}</p>
          <p className="text-xs text-muted-foreground">{notification.message}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {!notification.read && (
            <div className="w-2 h-2 bg-primary rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
});

OptimizedNotificationItem.displayName = 'OptimizedNotificationItem';

// Componente para métricas con renderizado optimizado
interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  formatter?: (value: number) => string;
}

export const OptimizedMetricCard = memo(({ title, value, change, formatter }: MetricCardProps) => {
  const formattedValue = useMemo(() => {
    return formatter ? formatter(value) : value.toString();
  }, [value, formatter]);

  const changeDisplay = useMemo(() => {
    if (change === undefined) return null;
    
    const isPositive = change > 0;
    const changeText = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;
    
    return (
      <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {changeText}
      </span>
    );
  }, [change]);

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold">{formattedValue}</p>
          {changeDisplay}
        </div>
      </div>
    </Card>
  );
});

OptimizedMetricCard.displayName = 'OptimizedMetricCard';