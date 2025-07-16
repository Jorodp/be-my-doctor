import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EditSubscriptionModalProps {
  subscription: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const EditSubscriptionModal = ({ subscription, isOpen, onClose, onUpdated }: EditSubscriptionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(
    subscription?.ends_at ? new Date(subscription.ends_at) : null
  );
  const [amount, setAmount] = useState(subscription?.amount || 0);
  const [receiptNumber, setReceiptNumber] = useState(subscription?.receipt_number || '');
  const [observations, setObservations] = useState(subscription?.observations || '');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!subscription || !expirationDate) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const oldValues = {
        ends_at: subscription.ends_at,
        receipt_number: subscription.receipt_number,
        observations: subscription.observations,
        amount: subscription.amount
      };

      const newValues = {
        ends_at: expirationDate.toISOString(),
        receipt_number: receiptNumber.trim() || null,
        observations: observations.trim() || null,
        amount: amount
      };

      const { error } = await supabase
        .from('subscriptions')
        .update(newValues)
        .eq('id', subscription.id);

      if (error) throw error;

      // Crear log de cambios
      try {
        const { data: user } = await supabase.auth.getUser();
        await supabase.from('subscription_logs').insert({
          subscription_id: subscription.id,
          admin_user_id: user.user?.id,
          action: 'updated',
          old_values: oldValues,
          new_values: newValues,
          notes: `Suscripción editada por administrador`
        });
      } catch (logError) {
        console.error('Error creating log:', logError);
      }

      toast({
        title: "Suscripción actualizada",
        description: "Los cambios se han guardado exitosamente",
      });

      onClose();
      if (onUpdated) {
        onUpdated();
      }
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: `No se pudo actualizar la suscripción: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Suscripción
          </DialogTitle>
          <DialogDescription>
            Modifica los detalles de la suscripción presencial de {subscription.doctor_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Monto */}
          <div className="space-y-2">
            <Label>Monto Pagado (en centavos)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Ej: 79900 para $799.00"
            />
            <p className="text-xs text-muted-foreground">
              Equivale a: ${(amount / 100).toFixed(2)} {subscription?.currency || 'MXN'}
            </p>
          </div>

          {/* Fecha de Expiración */}
          <div className="space-y-2">
            <Label>Fecha de Expiración *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expirationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expirationDate ? format(expirationDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expirationDate}
                  onSelect={(date) => date && setExpirationDate(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Número de Recibo */}
          <div className="space-y-2">
            <Label>Número de Recibo</Label>
            <Input
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="Ej: REC-2024-001"
            />
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas adicionales, método de pago específico, etc."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !expirationDate} 
              className="flex-1"
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditSubscriptionModal;