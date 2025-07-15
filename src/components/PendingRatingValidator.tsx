import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { RatingModal } from '@/components/RatingModal';

interface PendingRatingValidatorProps {
  onValidationComplete: (canProceed: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface UnratedAppointment {
  id: string;
  doctor_user_id: string;
  starts_at: string;
  doctor_profile?: {
    full_name: string | null;
  };
}

export const PendingRatingValidator = ({ 
  onValidationComplete, 
  isOpen, 
  onClose 
}: PendingRatingValidatorProps) => {
  const { user } = useAuth();
  const [unratedAppointment, setUnratedAppointment] = useState<UnratedAppointment | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      checkForUnratedAppointment();
    }
  }, [isOpen, user]);

  const checkForUnratedAppointment = async () => {
    if (!user) return;

    try {
      console.log('Checking for unrated appointments for user:', user.id);
      
      // Check for completed appointments without ratings
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, doctor_user_id, starts_at, status')
        .eq('patient_user_id', user.id)
        .eq('status', 'completed')
        .order('ends_at', { ascending: false })
        .limit(1);

      console.log('Appointments query result:', { appointments, error });

      if (error) throw error;

      // If we found a completed appointment, check if it has ratings
      if (appointments && appointments.length > 0) {
        const lastAppointment = appointments[0];
        
        // Check if this appointment has any ratings
        const { data: ratings, error: ratingsError } = await supabase
          .from('ratings')
          .select('id')
          .eq('appointment_id', lastAppointment.id)
          .limit(1);

        console.log('Ratings check:', { ratings, ratingsError });

        if (!ratingsError && (!ratings || ratings.length === 0)) {
          // No rating found, fetch doctor info
          const { data: doctorProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', lastAppointment.doctor_user_id)
            .single();

          setUnratedAppointment({
            ...lastAppointment,
            doctor_profile: doctorProfile
          });
          
          onValidationComplete(false);
          return;
        }
      }

      // No unrated appointments found
      onValidationComplete(true);
      onClose();
    } catch (error) {
      console.error('Error checking for unrated appointments:', error);
      // In case of error, allow to proceed to avoid blocking users
      onValidationComplete(true);
      onClose();
    }
  };

  const handleRatingSubmitted = () => {
    setShowRatingModal(false);
    setUnratedAppointment(null);
    onValidationComplete(true);
    onClose();
  };

  const handleClose = () => {
    onValidationComplete(false);
    onClose();
  };

  if (!unratedAppointment) return null;

  return (
    <>
      <Dialog open={isOpen && !showRatingModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <DialogTitle>Calificación Pendiente</DialogTitle>
            </div>
            <DialogDescription className="space-y-3">
              <p>
                Debes calificar tu última consulta antes de agendar una nueva cita.
              </p>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium">Consulta pendiente de calificar:</p>
                <p className="text-sm text-muted-foreground">
                  Dr. {unratedAppointment.doctor_profile?.full_name || 'Doctor'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(unratedAppointment.starts_at).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={() => setShowRatingModal(true)}
              className="flex-1"
            >
              Calificar Ahora
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showRatingModal && unratedAppointment && (
        <RatingModal
          appointmentId={unratedAppointment.id}
          doctorUserId={unratedAppointment.doctor_user_id}
          patientUserId={user?.id || ''}
          isOpen={showRatingModal}
          onRatingSubmitted={handleRatingSubmitted}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </>
  );
};