import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CreditCard, Receipt } from "lucide-react";
import { format, addMonths, addYears } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ManualPaymentModalProps {
  doctorId: string;
  doctorName: string;
  onPaymentAdded?: () => void;
}

const ManualPaymentModal = ({ doctorId, doctorName, onPaymentAdded }: ManualPaymentModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<'monthly' | 'annual' | ''>('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [observations, setObservations] = useState('');
  const { toast } = useToast();

  const calculateExpiration = (planType: 'monthly' | 'annual', fromDate: Date = new Date()) => {
    return planType === 'monthly' 
      ? addMonths(fromDate, 1)
      : addYears(fromDate, 1);
  };

  const handlePlanChange = (newPlan: 'monthly' | 'annual') => {
    setPlan(newPlan);
    setExpirationDate(calculateExpiration(newPlan, paymentDate));
  };

  const handlePaymentDateChange = (date: Date | undefined) => {
    if (date) {
      setPaymentDate(date);
      if (plan) {
        setExpirationDate(calculateExpiration(plan, date));
      }
    }
  };

  const getAmount = (planType: 'monthly' | 'annual') => {
    return planType === 'monthly' ? 799 : 7990; // $7.99 or $79.90 in cents
  };

  const handleSubmit = async () => {
    if (!plan || !expirationDate) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('subscriptions').insert({
        user_id: doctorId,
        plan: plan,
        status: 'active',
        amount: getAmount(plan),
        currency: 'USD',
        payment_method: 'offline',
        starts_at: paymentDate.toISOString(),
        ends_at: expirationDate.toISOString(),
        paid_at: paymentDate.toISOString(),
        stripe_customer_id: null,
        stripe_subscription_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      toast({
        title: "Pago registrado exitosamente",
        description: `Suscripción ${plan === 'monthly' ? 'mensual' : 'anual'} activada para ${doctorName}`,
      });

      // Reset form
      setPlan('');
      setPaymentDate(new Date());
      setExpirationDate(null);
      setReceiptNumber('');
      setObservations('');
      setOpen(false);

      if (onPaymentAdded) {
        onPaymentAdded();
      }
    } catch (error) {
      console.error('Error registering payment:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Receipt className="h-4 w-4" />
          Registrar Pago Presencial
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Registrar Pago Presencial
          </DialogTitle>
          <DialogDescription>
            Registra un pago realizado de forma presencial para activar la suscripción del médico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Doctor */}
          <div className="space-y-2">
            <Label>Doctor</Label>
            <Input value={doctorName} disabled className="bg-muted" />
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <Label>Plan de Suscripción *</Label>
            <Select value={plan} onValueChange={handlePlanChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">
                  Mensual - $7.99 USD/mes
                </SelectItem>
                <SelectItem value="annual">
                  Anual - $79.90 USD/año (2 meses gratis)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Fecha de Pago</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={handlePaymentDateChange}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Expiration Date */}
          {expirationDate && (
            <div className="space-y-2">
              <Label>Fecha de Expiración</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(expirationDate, "PPP", { locale: es })}
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
          )}

          {/* Receipt Number */}
          <div className="space-y-2">
            <Label>Número de Recibo (Opcional)</Label>
            <Input
              placeholder="Ej: REC-2024-001"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
            />
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label>Observaciones (Opcional)</Label>
            <Textarea
              placeholder="Ej: Pago en efectivo, transferencia bancaria, etc."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !plan}
              className="flex-1"
            >
              {loading ? "Registrando..." : "Registrar Pago"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualPaymentModal;