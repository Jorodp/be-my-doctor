import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PhysicalPaymentButtonProps {
  doctorUserId: string;
  doctorName: string;
  isEnabled: boolean;
  onToggleComplete: () => void;
}

export const PhysicalPaymentButton = ({ 
  doctorUserId, 
  doctorName, 
  isEnabled, 
  onToggleComplete 
}: PhysicalPaymentButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleTogglePhysicalPayment = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (!isEnabled) {
        // Habilitar pagos físicos
        const { error } = await supabase
          .from('doctor_physical_payments')
          .upsert({
            doctor_user_id: doctorUserId,
            enabled: true,
            enabled_by: user.id,
            enabled_at: new Date().toISOString()
          }, {
            onConflict: 'doctor_user_id'
          });

        if (error) throw error;

        toast({
          title: "Pagos físicos habilitados",
          description: `Los pagos físicos han sido habilitados para Dr. ${doctorName}`,
        });
      } else {
        // Deshabilitar pagos físicos
        const { error } = await supabase
          .from('doctor_physical_payments')
          .update({
            enabled: false,
            enabled_by: user.id,
            enabled_at: new Date().toISOString()
          })
          .eq('doctor_user_id', doctorUserId);

        if (error) throw error;

        toast({
          title: "Pagos físicos deshabilitados",
          description: `Los pagos físicos han sido deshabilitados para Dr. ${doctorName}`,
        });
      }

      onToggleComplete();
    } catch (error) {
      console.error('Error toggling physical payment:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de los pagos físicos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs">
        {isEnabled ? (
          <>
            <Check className="w-3 h-3 mr-1" />
            Pagos Físicos Habilitados
          </>
        ) : (
          <>
            <X className="w-3 h-3 mr-1" />
            Pagos Físicos Deshabilitados
          </>
        )}
      </Badge>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant={isEnabled ? "outline" : "default"}
            size="sm"
            disabled={loading}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {isEnabled ? 'Deshabilitar' : 'Habilitar'} Pagos Físicos
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isEnabled ? 'Deshabilitar' : 'Habilitar'} Pagos Físicos
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isEnabled 
                ? `¿Estás seguro de que quieres deshabilitar los pagos físicos para Dr. ${doctorName}? El doctor ya no podrá solicitar pagos en efectivo o con tarjeta física.`
                : `¿Estás seguro de que quieres habilitar los pagos físicos para Dr. ${doctorName}? El doctor podrá solicitar pagos en efectivo o con tarjeta física a través de atención al cliente.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTogglePhysicalPayment} disabled={loading}>
              {loading ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};