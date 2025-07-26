import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ManualPaymentFormProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  defaultAmount: number;
  onPaymentRecorded: () => void;
}

export function ManualPaymentForm({ 
  appointmentId, 
  patientId, 
  doctorId, 
  defaultAmount, 
  onPaymentRecorded 
}: ManualPaymentFormProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !paymentMethod) {
      toast({
        title: "Error",
        description: "Debes ingresar el monto y seleccionar un método de pago",
        variant: "destructive"
      });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser un número válido mayor a 0",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Llamar a la función de edge para registrar el pago
      const { data, error } = await supabase.functions.invoke("payments", {
        body: {
          action: "mark-manual-payment",
          appointmentId,
          amount: numericAmount,
          patientId,
          doctorId,
          paymentMethod
        }
      });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Pago de $${numericAmount} MXN registrado correctamente`
      });
      
      onPaymentRecorded();
    } catch (error) {
      console.error("Error registering manual payment:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm">Monto Sugerido:</span>
        <span className="text-sm text-muted-foreground">${defaultAmount} MXN</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="amount" className="text-sm">Monto Real Cobrado</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="payment-method" className="text-sm">Método de Pago</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="stripe">Tarjeta</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={loading || !amount || !paymentMethod}
          className="w-full"
          size="sm"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {loading ? "Registrando..." : "Registrar Pago"}
        </Button>
      </div>
    </div>
  );
}