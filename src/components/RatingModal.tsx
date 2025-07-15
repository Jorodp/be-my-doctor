import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  doctorUserId: string;
  patientUserId: string;
  onRatingSubmitted: () => void;
}

export const RatingModal = ({ 
  isOpen, 
  onClose, 
  appointmentId, 
  doctorUserId, 
  patientUserId, 
  onRatingSubmitted 
}: RatingModalProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona una calificación",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('ratings')
        .insert({
          appointment_id: appointmentId,
          patient_user_id: patientUserId,
          doctor_user_id: doctorUserId,
          rating,
          comment: comment || null,
        });

      if (error) throw error;

      toast({
        title: "Calificación enviada",
        description: "Gracias por tu feedback",
      });
      
      onRatingSubmitted();
      onClose();
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la calificación",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calificar consulta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= rating 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Comentarios (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar calificación'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};