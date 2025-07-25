import { useDoctorClinics } from "@/hooks/useDoctorClinics";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MapPin, DollarSign, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DoctorClinicsDisplayProps {
  doctorUserId: string;
}

export function DoctorClinicsDisplay({ doctorUserId }: DoctorClinicsDisplayProps) {
  const { data: clinics = [], isLoading, error } = useDoctorClinics(doctorUserId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (error || !clinics.length) {
    return (
      <div className="text-center p-4">
        <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">
          No hay consultorios disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {clinics.map((clinic) => (
        <div
          key={clinic.id}
          className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 hover:border-primary/30 transition-all"
        >
          <div className="space-y-3">
            {/* Clinic Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {clinic.name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {clinic.address}
                </p>
                {clinic.city && clinic.state && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {clinic.city}, {clinic.state}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="ml-4">
                <Clock className="w-3 h-3 mr-1" />
                Disponible
              </Badge>
            </div>

            {/* Consultation Fee */}
            <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Consulta: <span className="text-primary font-semibold">$1,500 MXN</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}