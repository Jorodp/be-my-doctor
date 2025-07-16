import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Search, RefreshCw, Calendar, Edit, CreditCard, Receipt, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ManualPaymentModal from "@/components/admin/ManualPaymentModal";
import EditSubscriptionModal from "@/components/admin/EditSubscriptionModal";

interface SubscriptionWithDoctor {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  paid_at: string | null;
  ends_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  doctor_name: string;
  doctor_email: string;
  specialty: string;
}

const AdminSubscriptionsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDoctor | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      // Get all doctors first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'doctor');

      if (profilesError) throw profilesError;

      // Get doctor profiles for specialties
      const { data: doctorProfiles, error: doctorProfilesError } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialty');

      if (doctorProfilesError) throw doctorProfilesError;

      // Get all subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      // Get user emails
      const userIds = subscriptionsData?.map(s => s.user_id) || [];
      const { data: authData } = await supabase.auth.admin.listUsers();
      const users = authData?.users || [];

      // Combine all data
      const combinedData = subscriptionsData?.map(subscription => {
        const profile = profiles?.find(p => p.user_id === subscription.user_id);
        const doctorProfile = doctorProfiles?.find(dp => dp.user_id === subscription.user_id);
        const authUser = users.find(u => u.id === subscription.user_id);
        
        return {
          ...subscription,
          paid_at: (subscription as any).paid_at || subscription.starts_at || new Date().toISOString(),
          payment_method: subscription.payment_method || 'stripe',
          stripe_customer_id: subscription.stripe_customer_id || null,
          stripe_subscription_id: subscription.stripe_subscription_id || null,
          doctor_name: profile?.full_name || 'N/A',
          doctor_email: authUser?.email || 'N/A',
          specialty: doctorProfile?.specialty || 'N/A'
        } as SubscriptionWithDoctor;
      }) || [];

      return combinedData;
    },
  });

  const filteredSubscriptions = subscriptions?.filter(sub => {
    const matchesSearch = sub.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.doctor_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isActive = new Date(sub.ends_at) > new Date();
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && isActive) ||
                         (statusFilter === "expired" && !isActive);
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (subscription: SubscriptionWithDoctor) => {
    const isActive = new Date(subscription.ends_at) > new Date();
    return isActive ? 
      <Badge className="bg-green-100 text-green-800">Activo</Badge> : 
      <Badge variant="destructive">Expirado</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    return plan === 'monthly' ? 
      <Badge variant="outline">Mensual</Badge> : 
      <Badge className="bg-purple-100 text-purple-800">Anual</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    return method === 'offline' ? 
      <Badge variant="secondary">Presencial</Badge> : 
      <Badge className="bg-blue-100 text-blue-800">Stripe</Badge>;
  };

  const handleEdit = (subscription: SubscriptionWithDoctor) => {
    setSelectedSubscription(subscription);
    setShowEditModal(true);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency === 'MXN' ? 'MXN' : 'USD',
    }).format(amount / 100);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Suscripciones de Médicos
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona todas las suscripciones de la plataforma
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Suscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {subscriptions?.filter(s => new Date(s.ends_at) > new Date()).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagos Presenciales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {subscriptions?.filter(s => s.payment_method === 'offline').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(subscriptions?.reduce((sum, s) => sum + s.amount, 0) || 0, 'USD')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Todas las Suscripciones
              </CardTitle>
              <CardDescription>
                Historial completo de suscripciones y pagos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ManualPaymentModal 
                doctorId=""
                doctorName="Nuevo Pago"
                onPaymentAdded={refetch}
              />
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por doctor, email o especialidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead>Fecha de Pago</TableHead>
                  <TableHead>Expiración</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions?.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subscription.doctor_name}</div>
                        <div className="text-sm text-muted-foreground">{subscription.specialty}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(subscription.plan)}</TableCell>
                    <TableCell>{getPaymentMethodBadge(subscription.payment_method)}</TableCell>
                    <TableCell>
                      {subscription.paid_at ? 
                        format(new Date(subscription.paid_at), 'dd/MM/yyyy', { locale: es }) : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(subscription.ends_at), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(subscription.amount, subscription.currency)}</TableCell>
                    <TableCell>{getStatusBadge(subscription)}</TableCell>
                    <TableCell>
                      {subscription.payment_method === 'offline' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(subscription)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredSubscriptions?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron suscripciones</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <EditSubscriptionModal
        subscription={selectedSubscription}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSubscription(null);
        }}
        onUpdated={refetch}
      />
    </div>
  );
};

export default AdminSubscriptionsPage;