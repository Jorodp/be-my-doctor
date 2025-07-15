import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Calendar, RefreshCw, Send, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DoctorSubscription {
  user_id: string;
  full_name: string;
  email: string;
  plan: string;
  amount: number;
  expires_at: string;
  status: string;
  days_remaining: number;
}

export const SubscriptionRenewals = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<DoctorSubscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<DoctorSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingRenewal, setProcessingRenewal] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [subscriptions, daysFilter, statusFilter]);

  const fetchSubscriptions = async () => {
    try {
      // Get all doctor subscriptions
      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('user_id, plan, amount, ends_at, status')
        .order('ends_at', { ascending: true });

      if (error) throw error;

      if (!subs || subs.length === 0) {
        setSubscriptions([]);
        return;
      }

      // Get user profiles separately
      const userIds = subs.map(sub => sub.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const subscriptionsWithDetails: DoctorSubscription[] = subs.map(sub => {
        const profile = profiles?.find(p => p.user_id === sub.user_id);
        const daysRemaining = sub.ends_at 
          ? differenceInDays(new Date(sub.ends_at), new Date())
          : 0;

        return {
          user_id: sub.user_id,
          full_name: profile?.full_name || 'Sin nombre',
          email: 'doctor@example.com', // This would need to be fetched from auth.users
          plan: sub.plan,
          amount: sub.amount,
          expires_at: sub.ends_at,
          status: sub.status,
          days_remaining: daysRemaining
        };
      });

      setSubscriptions(subscriptionsWithDetails);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las suscripciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...subscriptions];

    // Filter by days remaining
    if (daysFilter !== 'all') {
      const days = parseInt(daysFilter);
      filtered = filtered.filter(sub => sub.days_remaining <= days);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    // Sort by days remaining (ascending)
    filtered.sort((a, b) => a.days_remaining - b.days_remaining);

    setFilteredSubscriptions(filtered);
  };

  const renewSubscription = async (userId: string, currentPlan: string) => {
    setProcessingRenewal(userId);
    try {
      // Calculate new expiration date
      const currentExpiry = subscriptions.find(s => s.user_id === userId)?.expires_at;
      const expiryDate = new Date(currentExpiry || new Date());
      
      // Extend based on plan
      if (currentPlan === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (currentPlan === 'annual') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }

      // Update subscription
      const { error } = await supabase
        .from('subscriptions')
        .update({
          ends_at: expiryDate.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Renovación Exitosa",
        description: `Suscripción renovada hasta ${format(expiryDate, 'dd/MM/yyyy', { locale: es })}`
      });

      await fetchSubscriptions();
    } catch (error) {
      console.error('Error renewing subscription:', error);
      toast({
        title: "Error",
        description: "No se pudo renovar la suscripción",
        variant: "destructive"
      });
    } finally {
      setProcessingRenewal(null);
    }
  };

  const sendReminder = async (userId: string, fullName: string, daysRemaining: number) => {
    setSendingReminder(userId);
    try {
      // Send notification through notifications edge function
      const { error } = await supabase.functions.invoke('notifications', {
        body: {
          action: 'send',
          notification: {
            user_id: userId,
            type: 'subscription_reminder',
            title: 'Recordatorio de Renovación',
            message: `Hola ${fullName}, tu suscripción vence en ${daysRemaining} días. Renueva para continuar usando nuestros servicios.`,
            data: {
              days_remaining: daysRemaining,
              renewal_required: true
            }
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Recordatorio Enviado",
        description: `Se envió el recordatorio a ${fullName}`
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el recordatorio",
        variant: "destructive"
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const getDaysRemainingBadge = (days: number) => {
    if (days < 0) {
      return <Badge variant="destructive">Vencida</Badge>;
    } else if (days <= 7) {
      return <Badge variant="destructive">{days} días</Badge>;
    } else if (days <= 30) {
      return <Badge variant="secondary">{days} días</Badge>;
    } else {
      return <Badge variant="outline">{days} días</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Renovaciones de Suscripción
          </CardTitle>
          <CardDescription>
            Gestiona las renovaciones y recordatorios de suscripción de los doctores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="space-y-2">
              <Label>Filtrar por días restantes</Label>
              <Select value={daysFilter} onValueChange={setDaysFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="7">Vence en 7 días</SelectItem>
                  <SelectItem value="15">Vence en 15 días</SelectItem>
                  <SelectItem value="30">Vence en 30 días</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="expired">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              onClick={fetchSubscriptions}
              className="md:mt-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {/* Subscriptions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha Expiración</TableHead>
                  <TableHead>Días Restantes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No se encontraron suscripciones
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.full_name}</div>
                          <div className="text-sm text-muted-foreground">{subscription.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={subscription.plan === 'annual' ? 'default' : 'secondary'}>
                          {subscription.plan === 'monthly' ? 'Mensual' : 'Anual'}
                        </Badge>
                      </TableCell>
                      <TableCell>${subscription.amount} MXN</TableCell>
                      <TableCell>
                        {format(new Date(subscription.expires_at), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {getDaysRemainingBadge(subscription.days_remaining)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            subscription.status === 'active' 
                              ? 'default' 
                              : subscription.status === 'expired' 
                                ? 'destructive' 
                                : 'secondary'
                          }
                        >
                          {subscription.status === 'active' ? 'Activo' : 
                           subscription.status === 'expired' ? 'Vencido' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminder(
                              subscription.user_id, 
                              subscription.full_name, 
                              subscription.days_remaining
                            )}
                            disabled={sendingReminder === subscription.user_id}
                          >
                            {sendingReminder === subscription.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => renewSubscription(subscription.user_id, subscription.plan)}
                            disabled={processingRenewal === subscription.user_id}
                          >
                            {processingRenewal === subscription.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};