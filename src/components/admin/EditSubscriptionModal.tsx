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
  const [plan, setPlan] = useState<'monthly' | 'annual'>(subscription?.plan || 'monthly');
  const [paidAt, setPaidAt] = useState<Date>(subscription?.paid_at ? new Date(subscription.paid_at) : new Date());
  const [endsAt, setEndsAt] = useState<Date>(subscription?.ends_at ? new Date(subscription.ends_at) : new Date());
  const [receiptNumber, setReceiptNumber] = useState(subscription?.receipt_number || '');
  const [observations, setObservations] = useState(subscription?.observations || '');
  const { toast } = useToast();

  const getAmount = (planType: 'monthly' | 'annual') => {
    return planType === 'monthly' ? 799 : 7990;
  };

  const handleSubmit = async () => {
    if (!subscription?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan: plan,
          amount: getAmount(plan),
          paid_at: paidAt.toISOString(),
          ends_at: endsAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "Suscripción actualizada",
        description: "Los cambios se han guardado correctamente",
      });

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la suscripción",
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
          {/* Plan */}
          <div className="space-y-2">
            <Label>Plan de Suscripción</Label>
            <Select value={plan} onValueChange={(value: 'monthly' | 'annual') => setPlan(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual - $7.99 USD/mes</SelectItem>
                <SelectItem value="annual">Anual - $79.90 USD/año</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Paid At */}
          <div className="space-y-2">
            <Label>Fecha de Pago</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paidAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paidAt ? format(paidAt, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paidAt}
                  onSelect={(date) => date && setPaidAt(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Ends At */}
          <div className="space-y-2">
            <Label>Fecha de Expiración</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endsAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endsAt ? format(endsAt, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endsAt}
                  onSelect={(date) => date && setEndsAt(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Receipt Number */}
          <div className="space-y-2">
            <Label>Número de Recibo</Label>
            <Input
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="Ej: REC-2024-001"
            />
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditSubscriptionModal;