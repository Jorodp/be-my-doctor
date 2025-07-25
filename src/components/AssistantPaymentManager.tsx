import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePayments } from "@/hooks/usePayments";
import { AppointmentCard } from "@/components/AppointmentCard";
import { ManualPaymentForm } from "@/components/ManualPaymentForm";

interface AssistantPaymentManagerProps {
  doctorId: string;
}

interface AppointmentWithPayment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  patient_user_id: string;
  consultation_fee?: number;
  patient_profile?: {
    full_name: string;
    phone: string;
  };
  payment?: {
    status: string;
    amount: number;
    payment_method: string;
  };
}

export function AssistantPaymentManager({ doctorId }: AssistantPaymentManagerProps) {
  const { toast } = useToast();
  const { markCashPayment } = usePayments();
  const [appointments, setAppointments] = useState<AppointmentWithPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, [doctorId]);

  const fetchAppointments = async () => {
    try {
      // Fetch today's and future appointments for the assigned doctor
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_user_id", doctorId)
        .gte("starts_at", today.toISOString())
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch doctor profile to get consultation fee
      const { data: doctorProfile, error: doctorError } = await supabase
        .from("doctor_profiles")
        .select("consultation_fee")
        .eq("user_id", doctorId)
        .single();

      if (doctorError) throw doctorError;

      // Fetch payment status for each appointment
      const appointmentsWithPayments = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          // Fetch patient profile
          const { data: patientProfile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", appointment.patient_user_id)
            .single();

          // Fetch payment data
          const { data: paymentData } = await supabase
            .from("consultation_payments")
            .select("*")
            .eq("appointment_id", appointment.id)
            .maybeSingle();

          return {
            ...appointment,
            consultation_fee: doctorProfile?.consultation_fee || 0,
            patient_profile: patientProfile ? {
              full_name: patientProfile.full_name || 'Sin nombre',
              phone: patientProfile.phone || 'Sin teléfono'
            } : undefined,
            payment: paymentData ? {
              status: paymentData.status,
              amount: paymentData.amount,
              payment_method: paymentData.payment_method
            } : undefined
          };
        })
      );

      setAppointments(appointmentsWithPayments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCashPayment = async (appointmentId: string, amount: number, patientId: string) => {
    try {
      await markCashPayment(appointmentId, amount, patientId, doctorId);
      toast({
        title: "Éxito",
        description: "Pago en efectivo registrado correctamente"
      });
      fetchAppointments(); // Refresh the list
    } catch (error) {
      console.error("Error marking cash payment:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago en efectivo",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Pagado</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fallido</Badge>;
      default:
        return <Badge variant="outline">Sin pago</Badge>;
    }
  };

  const filteredAppointments = appointments.filter(appointment =>
    appointment.patient_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 animate-spin mr-2" />
            Cargando citas...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Gestión de Pagos de Consultas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente o estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No hay citas programadas</p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <AppointmentCard
                      appointment={appointment}
                      paymentStatus={appointment.payment}
                      userRole="assistant"
                      showPayment={true}
                    />
                  </div>
                  
                  <div className="lg:w-80">
                    <Card className="border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Estado del Pago</span>
                          {appointment.payment ? 
                            getStatusBadge(appointment.payment.status) : 
                            getStatusBadge("none")
                          }
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {appointment.payment ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Monto Pagado:</span>
                              <span className="font-bold">${appointment.payment.amount} MXN</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Método:</span>
                              <span className="capitalize text-sm">{appointment.payment.payment_method}</span>
                            </div>
                          </div>
                        ) : (
                          <ManualPaymentForm
                            appointmentId={appointment.id}
                            patientId={appointment.patient_user_id}
                            doctorId={doctorId}
                            defaultAmount={appointment.consultation_fee || 0}
                            onPaymentRecorded={fetchAppointments}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}