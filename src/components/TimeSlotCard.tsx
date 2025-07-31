/**
 * Componente para mostrar un slot de tiempo individual
 * Maneja la visualización clara de horarios con zona horaria correcta
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin } from "lucide-react";
import { formatUTCToMexicoTime } from "@/utils/dayjsConfig";

interface TimeSlotCardProps {
  startTime: string;
  endTime: string;
  clinicName: string;
  clinicId: string;
  isSelected: boolean;
  isAvailable: boolean;
  showClinic?: boolean;
  onSelect: (startTime: string, clinicId: string) => void;
}

export function TimeSlotCard({
  startTime,
  endTime,
  clinicName,
  clinicId,
  isSelected,
  isAvailable,
  showClinic = false,
  onSelect
}: TimeSlotCardProps) {
  /**
   * Formatea el tiempo ya convertido a zona horaria de México
   */
  const formatTimeSlot = (time: string) => {
    return time.slice(0, 5); // Simplemente extraer HH:mm
  };

  if (!isAvailable) {
    return null;
  }

  return (
    <div
      className={`group relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
        isSelected
          ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-primary shadow-lg scale-[1.02]'
          : 'bg-gradient-to-r from-background to-primary/5 border-primary/20 hover:border-primary/50 hover:shadow-md hover:scale-[1.01]'
      }`}
      onClick={() => onSelect(startTime, clinicId)}
    >
      {/* Background decoration */}
      <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isSelected ? 'opacity-100' : ''}`} />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className={`w-3 h-3 rounded-full ${
            isSelected ? 'bg-primary shadow-md' : 'bg-primary/60'
          } ${isSelected ? 'animate-pulse' : ''}`} />
          
          <div className="flex flex-col gap-2">
            {/* Time slot badge */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <Badge 
                variant={isSelected ? "default" : "outline"} 
                className={`text-lg px-4 py-2 font-bold ${
                  isSelected 
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border-primary/40 text-primary hover:bg-primary/10"
                }`}
              >
                {formatTimeSlot(startTime)} - {formatTimeSlot(endTime)}
              </Badge>
            </div>
            
            {/* Clinic info */}
            {showClinic && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="font-medium">{clinicName}</span>
              </div>
            )}
            
            {/* Duration indicator */}
            <div className="text-xs text-muted-foreground">
              Duración: 1 hora
            </div>
          </div>
        </div>
        
        {/* Select button */}
        <Button 
          size="sm" 
          className={`px-6 py-2 font-semibold transition-all duration-200 ${
            isSelected ? 'shadow-md scale-105' : 'scale-100'
          }`}
          variant={isSelected ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(startTime, clinicId);
          }}
        >
          {isSelected ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                ✓
              </div>
              Seleccionado
            </div>
          ) : (
            "Seleccionar"
          )}
        </Button>
      </div>
      
      {/* Selection indicator line */}
      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-dark" />
      )}
    </div>
  );
}