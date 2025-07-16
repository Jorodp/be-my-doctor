import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Search, RefreshCw, Calendar, DollarSign, User, Mail, Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ManualPaymentModal from "./ManualPaymentModal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DoctorSubscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  starts_at: string;
  ends_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  updated_at: string;
  profiles: {
    full_name: string;
    phone: string;
    role: string;
  };
  doctor_profiles: {
    specialty: string;
    professional_license: string;
  }[];
}

const DoctorSubscriptions = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ['doctor-subscriptions'],
    queryFn: async () => {
      // First get subscriptions for doctors
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .eq('role', 'doctor');

      if (profilesError) throw profilesError;

      const doctorUserIds = profiles?.map(p => p.user_id) || [];

      if (doctorUserIds.length === 0) return [];

      // Get subscriptions for these doctors
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .in('user_id', doctorUserIds)
        .order('updated_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      // Get doctor profiles
      const { data: doctorProfiles, error: doctorProfilesError } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialty, professional_license')
        .in('user_id', doctorUserIds);

      if (doctorProfilesError) throw doctorProfilesError;

      // Combine the data
      const combinedData = subscriptionsData?.map(subscription => {
        const profile = profiles.find(p => p.user_id === subscription.user_id);
        const doctorProfile = doctorProfiles?.find(dp => dp.user_id === subscription.user_id);
        
        return {
          ...subscription,
          profiles: profile || { full_name: 'N/A', phone: '', role: 'doctor' },
          doctor_profiles: doctorProfile ? [doctorProfile] : [{ specialty: 'N/A', professional_license: 'N/A' }]
        };
      }) || [];

      return combinedData;
    },
  });

  const filteredSubscriptions = subscriptions?.filter(sub =>
    sub.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.doctor_profiles[0]?.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.doctor_profiles[0]?.professional_license.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Activa</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactiva</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'monthly':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Mensual</Badge>;
      case 'annual':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Anual</Badge>;
      default:
        return <Badge variant="secondary">Sin plan</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency === 'MXN' ? 'MXN' : 'USD',
    }).format(amount / 100);
  };

  const getTotalRevenue = () => {
    if (!subscriptions) return 0;
    return subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((total, sub) => total + sub.amount, 0);
  };

  const getActiveSubscriptions = () => {
    if (!subscriptions) return 0;
    return subscriptions.filter(sub => sub.status === 'active').length;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getActiveSubscriptions()}</div>
            <p className="text-xs text-muted-foreground">
              De {subscriptions?.length || 0} médicos totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(getTotalRevenue(), 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresos recurrentes activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions?.length ? Math.round((getActiveSubscriptions() / subscriptions.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Médicos con suscripción activa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Suscripciones de Médicos
              </CardTitle>
              <CardDescription>
                Gestiona y supervisa las suscripciones de todos los médicos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ManualPaymentModal 
                onPaymentAdded={refetch}
              />
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, especialidad o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Médico</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Renovación</TableHead>
                  <TableHead>Última Actualización</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions?.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{subscription.profiles.full_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {subscription.doctor_profiles[0]?.professional_license}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {subscription.doctor_profiles[0]?.specialty}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPlanBadge(subscription.plan)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(subscription.status)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(subscription.amount, subscription.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {subscription.plan === 'monthly' ? '/mes' : '/año'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(subscription.starts_at), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(subscription.ends_at), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(subscription.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredSubscriptions?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron suscripciones</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorSubscriptions;