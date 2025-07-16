import { useState, useEffect } from "react";
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
  onPaymentAdded?: () => void;
}

interface Doctor {
  user_id: string;
  full_name: string;
}

interface PaymentSettings {
  monthly_price: number;
  annual_price: number;
}

const ManualPaymentModal = ({ onPaymentAdded }: ManualPaymentModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<'monthly' | 'annual' | ''>('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [observations, setObservations] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadDoctorsAndSettings();
    }
  }, [open]);

  const loadDoctorsAndSettings = async () => {
    setLoadingData(true);
    try {
      // Load doctors
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'doctor')
        .order('full_name');

      if (doctorsError) throw doctorsError;

      // Load payment settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('payment_settings')
        .select('monthly_price, annual_price')
        .single();

      if (settingsError) throw settingsError;

      setDoctors(doctorsData || []);
      setPaymentSettings(settingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos necesarios",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

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
    if (!paymentSettings) return 0;
    return planType === 'monthly' ? paymentSettings.monthly_price : paymentSettings.annual_price;
  };

  const getSelectedDoctorName = () => {
    const doctor = doctors.find(d => d.user_id === selectedDoctorId);
    return doctor ? doctor.full_name : '';
  };

  const handleSubmit = async () => {
    console.log('Form data before validation:', {
      plan,
      expirationDate,
      selectedDoctorId,
      paymentDate,
      paymentSettings
    });

    if (!plan || !expirationDate || !selectedDoctorId) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios (doctor, plan y fecha de pago)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const subscriptionData: any = {
        user_id: selectedDoctorId,
        plan: plan,
        status: 'active',
        amount: getAmount(plan),
        currency: 'MXN',
        payment_method: 'manual', // Cambio de 'offline' a 'manual'
        starts_at: paymentDate.toISOString(),
        ends_at: expirationDate.toISOString(),
        stripe_customer_id: null,
        stripe_subscription_id: null,
      };

      // Add optional fields if they have values
      if (receiptNumber.trim()) {
        subscriptionData.receipt_number = receiptNumber.trim();
      }
      if (observations.trim()) {
        subscriptionData.observations = observations.trim();
      }

      console.log('Subscription data to insert:', subscriptionData);

      const { error } = await supabase.from('subscriptions').insert(subscriptionData);

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      // Crear log de creación
      try {
        const { data: user } = await supabase.auth.getUser();
        const { data: insertedSubscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', selectedDoctorId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (insertedSubscription) {
          await supabase.from('subscription_logs').insert({
            subscription_id: insertedSubscription.id,
            admin_user_id: user.user?.id,
            action: 'created',
            old_values: null,
            new_values: subscriptionData,
            notes: `Suscripción manual creada por administrador. Recibo: ${receiptNumber || 'N/A'}. Observaciones: ${observations || 'N/A'}`
          });
        }
      } catch (logError) {
        console.error('Error creating log:', logError);
      }

      toast({
        title: "Pago registrado exitosamente",
        description: `Suscripción ${plan === 'monthly' ? 'mensual' : 'anual'} activada para Dr. ${getSelectedDoctorName()}`,
      });

      // Reset form
      setPlan('');
      setSelectedDoctorId('');
      setPaymentDate(new Date());
      setExpirationDate(null);
      setReceiptNumber('');
      setObservations('');
      setOpen(false);

      if (onPaymentAdded) {
        onPaymentAdded();
      }
    } catch (error: any) {
      console.error('Error registering payment:', error);
      const errorMessage = error?.message || 'Error desconocido';
      const errorDetails = error?.details || '';
      const errorHint = error?.hint || '';
      
      toast({
        title: "Error al registrar pago",
        description: `${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}${errorHint ? ` - ${errorHint}` : ''}`,
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
          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label>Doctor *</Label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId} disabled={loadingData}>
              <SelectTrigger>
                <SelectValue placeholder={loadingData ? "Cargando doctores..." : "Selecciona un doctor"} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.user_id} value={doctor.user_id}>
                    Dr. {doctor.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <Label>Plan de Suscripción *</Label>
            <Select value={plan} onValueChange={handlePlanChange} disabled={!paymentSettings}>
              <SelectTrigger>
                <SelectValue placeholder={!paymentSettings ? "Cargando precios..." : "Selecciona un plan"} />
              </SelectTrigger>
              <SelectContent>
                {paymentSettings && (
                  <>
                    <SelectItem value="monthly">
                      Mensual - ${paymentSettings.monthly_price} MXN/mes
                    </SelectItem>
                    <SelectItem value="annual">
                      Anual - ${paymentSettings.annual_price} MXN/año
                    </SelectItem>
                  </>
                )}
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
              disabled={loading || !plan || !selectedDoctorId || loadingData}
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