import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatientDocumentValidator } from '@/components/PatientDocumentValidator';
import { ConsultationModal } from '@/components/ConsultationModal';

interface ConsultationFlowProps {
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
  onConsultationComplete: () => void;
}

export const ConsultationFlow = ({
  appointment,
  isOpen,
  onClose,
  onConsultationComplete
}: ConsultationFlowProps) => {
  const [step, setStep] = useState<'validation' | 'consultation'>('validation');
  const [documentsValid, setDocumentsValid] = useState(false);

  const handleValidationComplete = (isValid: boolean) => {
    if (isValid) {
      setDocumentsValid(true);
      setStep('consultation');
    } else {
      // Documents are not valid, close the consultation
      onClose();
    }
  };

  const handleValidatorCancel = () => {
    onClose();
  };

  const handleConsultationClose = () => {
    setStep('validation');
    setDocumentsValid(false);
    onClose();
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'validation' ? 'Validación de Documentos' : 'Consulta Médica'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'validation' ? (
          <PatientDocumentValidator
            appointmentId={appointment.id}
            patientUserId={appointment.patient_user_id}
            onValidationComplete={handleValidationComplete}
            onCancel={handleValidatorCancel}
          />
        ) : (
          <ConsultationModal
            isOpen={step === 'consultation'}
            onClose={handleConsultationClose}
            appointment={appointment}
            onConsultationComplete={() => {
              onConsultationComplete();
              handleConsultationClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};