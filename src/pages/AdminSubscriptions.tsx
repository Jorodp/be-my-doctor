import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Crown, Search, RefreshCw, Calendar, Edit, CreditCard, Receipt, FileText, 
  Trash2, AlertTriangle, History, Ban, Eye, CheckCircle 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ManualPaymentModal from "@/components/admin/ManualPaymentModal";
import EditSubscriptionModal from "@/components/admin/EditSubscriptionModal";
import { DashboardLayout } from "@/components/ui/DashboardLayout";

interface SubscriptionWithDoctor {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  receipt_number: string | null;
  observations: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  doctor_name: string;
  doctor_email: string;
  specialty: string;
}

interface SubscriptionLog {
  id: string;
  action: string;
  admin_user_id: string;
  admin_name: string;
  old_values: any;
  new_values: any;
  notes: string | null;
  created_at: string;
}

const AdminSubscriptionsPage = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDoctor | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [subscriptionLogs, setSubscriptionLogs] = useState<SubscriptionLog[]>([]);

  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      try {
        console.log('Fetching subscriptions...');
        
        // Get subscriptions first with a simple query
        const { data: subscriptionsData, error: subscriptionsError } = await supabase
          .from('subscriptions')
          .select('*')
          .order('created_at', { ascending: false });

        if (subscriptionsError) {
          console.error('Error fetching subscriptions:', subscriptionsError);
          throw subscriptionsError;
        }

        console.log('Subscriptions found:', subscriptionsData?.length);

        if (!subscriptionsData || subscriptionsData.length === 0) {
          return [];
        }

        // Get all unique user IDs from subscriptions
        const userIds = [...new Set(subscriptionsData.map(s => s.user_id))];
        console.log('User IDs from subscriptions:', userIds);

        // Get profiles for these users
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Get doctor profiles for specialties
        const { data: doctorProfiles, error: doctorProfilesError } = await supabase
          .from('doctor_profiles')
          .select('user_id, specialty')
          .in('user_id', userIds);

        if (doctorProfilesError) {
          console.error('Error fetching doctor profiles:', doctorProfilesError);
        }

        // Get user emails from auth with better error handling
        let authUsers: any[] = [];
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
          if (authError) {
            console.error('Error fetching auth users:', authError);
          } else {
            authUsers = authData?.users || [];
          }
        } catch (authError) {
          console.error('Failed to fetch auth users:', authError);
        }

        // Combine all data with fallbacks
        const combinedData = subscriptionsData.map(subscription => {
          const profile = profiles?.find(p => p.user_id === subscription.user_id);
          const doctorProfile = doctorProfiles?.find(dp => dp.user_id === subscription.user_id);
          const authUser = authUsers.find(u => u.id === subscription.user_id);
          
          return {
            ...subscription,
            doctor_name: profile?.full_name || `Usuario ${subscription.user_id.slice(-8)}`,
            doctor_email: authUser?.email || 'N/A',
            specialty: doctorProfile?.specialty || 'N/A'
          } as SubscriptionWithDoctor;
        });

        console.log('Combined data:', combinedData.length, 'subscriptions processed');
        return combinedData;
      } catch (error) {
        console.error('Critical error in subscription query:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  const filteredSubscriptions = subscriptions?.filter(sub => {
    const matchesSearch = sub.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.doctor_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (sub.receipt_number && sub.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const isActive = sub.status === 'active' && new Date(sub.ends_at) > new Date();
    const isCancelled = sub.status === 'cancelled';
    const isExpired = sub.status === 'active' && new Date(sub.ends_at) <= new Date();
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && isActive) ||
                         (statusFilter === "cancelled" && isCancelled) ||
                         (statusFilter === "expired" && isExpired);

    const matchesPaymentMethod = paymentMethodFilter === "all" ||
                                (paymentMethodFilter === "stripe" && sub.payment_method === 'stripe') ||
                                (paymentMethodFilter === "manual" && sub.payment_method === 'manual');
    
    return matchesSearch && matchesStatus && matchesPaymentMethod;
  });

  const getStatusBadge = (subscription: SubscriptionWithDoctor) => {
    if (subscription.status === 'cancelled') {
      return <Badge variant="destructive">Cancelado</Badge>;
    }
    const isActive = new Date(subscription.ends_at) > new Date();
    return isActive ? 
      <Badge className="bg-green-100 text-green-800">Activo</Badge> : 
      <Badge variant="outline" className="text-orange-600">Expirado</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    return plan === 'monthly' ? 
      <Badge variant="outline">Mensual</Badge> : 
      <Badge className="bg-purple-100 text-purple-800">Anual</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    return method === 'manual' ? 
      <Badge variant="secondary">Manual</Badge> : 
      <Badge className="bg-blue-100 text-blue-800">Stripe</Badge>;
  };

  // Función para crear log de cambios
  const createSubscriptionLog = async (
    subscriptionId: string, 
    action: string, 
    oldValues: any = null, 
    newValues: any = null, 
    notes: string = ''
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      await supabase.from('subscription_logs').insert({
        subscription_id: subscriptionId,
        admin_user_id: user.user?.id,
        action,
        old_values: oldValues,
        new_values: newValues,
        notes
      });
    } catch (error) {
      console.error('Error creating log:', error);
    }
  };

  const handleCancelSubscription = async (subscription: SubscriptionWithDoctor) => {
    try {
      const oldValues = { status: subscription.status };
      const newValues = { 
        status: 'cancelled', 
        cancelled_at: new Date().toISOString(),
        cancelled_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('subscriptions')
        .update(newValues)
        .eq('id', subscription.id);

      if (error) throw error;

      await createSubscriptionLog(
        subscription.id,
        'cancelled',
        oldValues,
        newValues,
        `Suscripción cancelada por administrador`
      );

      toast({
        title: "Suscripción cancelada",
        description: `La suscripción de ${subscription.doctor_name} ha sido cancelada exitosamente.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo cancelar la suscripción: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubscription = async (subscription: SubscriptionWithDoctor) => {
    try {
      await createSubscriptionLog(
        subscription.id,
        'deleted',
        subscription,
        null,
        `Suscripción eliminada completamente por administrador`
      );

      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "Suscripción eliminada",
        description: `La suscripción de ${subscription.doctor_name} ha sido eliminada completamente.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo eliminar la suscripción: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const fetchSubscriptionLogs = async (subscriptionId: string) => {
    try {
      // Primero obtener los logs básicos
      const { data: logs, error } = await supabase
        .from('subscription_logs')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Luego obtener los nombres de los administradores
      const adminIds = logs?.map(log => log.admin_user_id).filter(Boolean) || [];
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', adminIds);

      const enrichedLogs = logs?.map(log => ({
        ...log,
        admin_name: adminProfiles?.find(admin => admin.user_id === log.admin_user_id)?.full_name || 'Administrador'
      })) || [];

      setSubscriptionLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setSubscriptionLogs([]);
    }
  };

  const handleEdit = (subscription: SubscriptionWithDoctor) => {
    setSelectedSubscription(subscription);
    setShowEditModal(true);
  };

  const handleViewLogs = async (subscription: SubscriptionWithDoctor) => {
    setSelectedSubscription(subscription);
    await fetchSubscriptionLogs(subscription.id);
    setShowLogsModal(true);
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
    <DashboardLayout
      title="Suscripciones de Médicos"
      subtitle="Gestiona todas las suscripciones de la plataforma"
      breadcrumbs={[
        {
          label: "Suscripciones"
        }
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

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
              <CardTitle className="text-sm font-medium">Pagos Manuales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {subscriptions?.filter(s => s.payment_method === 'manual').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(subscriptions?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0, 'MXN')}
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
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
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
                    <TableHead>Fecha de Inicio</TableHead>
                    <TableHead>Expiración</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Recibo/Observaciones</TableHead>
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
                        {format(new Date(subscription.starts_at), 'dd/MM/yyyy', { locale: es })}
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
                        <div className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {subscription.receipt_number && (
                            <div>Recibo: {subscription.receipt_number}</div>
                          )}
                          {subscription.observations && (
                            <div title={subscription.observations}>
                              {subscription.observations}
                            </div>
                          )}
                          {!subscription.receipt_number && !subscription.observations && "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Ver historial */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewLogs(subscription)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          
                          {/* Editar (solo pagos manuales) */}
                          {subscription.payment_method === 'manual' && subscription.status !== 'cancelled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(subscription)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Cancelar suscripción activa */}
                          {subscription.status === 'active' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-800">
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción cancelará la suscripción de {subscription.doctor_name}. 
                                    El doctor perderá acceso inmediatamente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleCancelSubscription(subscription)}
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    Sí, cancelar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {/* Eliminar (solo pagos manuales) */}
                          {subscription.payment_method === 'manual' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar suscripción?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará completamente la suscripción de {subscription.doctor_name}. 
                                    Esta acción NO se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteSubscription(subscription)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Sí, eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
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

      {/* Logs Modal */}
      <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Cambios - {selectedSubscription?.doctor_name}
            </DialogTitle>
            <DialogDescription>
              Registro de todas las modificaciones realizadas a esta suscripción
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[500px] overflow-y-auto">
            {subscriptionLogs.length > 0 ? (
              <div className="space-y-4">
                {subscriptionLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          log.action === 'created' ? 'default' :
                          log.action === 'updated' ? 'secondary' :
                          log.action === 'cancelled' ? 'destructive' :
                          log.action === 'deleted' ? 'destructive' : 'outline'
                        }>
                          {log.action === 'created' && 'Creado'}
                          {log.action === 'updated' && 'Modificado'}
                          {log.action === 'cancelled' && 'Cancelado'}
                          {log.action === 'deleted' && 'Eliminado'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          por {log.admin_name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </span>
                    </div>
                    
                    {log.notes && (
                      <p className="text-sm mb-2">{log.notes}</p>
                    )}
                    
                    {(log.old_values || log.new_values) && (
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {log.old_values && (
                          <div>
                            <h4 className="font-medium text-red-600 mb-1">Valores anteriores:</h4>
                            <pre className="bg-red-50 p-2 rounded text-red-800 overflow-auto">
                              {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <h4 className="font-medium text-green-600 mb-1">Valores nuevos:</h4>
                            <pre className="bg-green-50 p-2 rounded text-green-800 overflow-auto">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay registros de cambios para esta suscripción</p>
              </div>
            )}
          </div>
        </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminSubscriptionsPage;