import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface RevenueStats {
  totalRevenue: number;
  physicalSubscriptions: number;
  onlineSubscriptions: number;
  subscriptionRevenue: number;
  monthlyGrowth: number;
  totalTransactions: number;
}

export const RevenueOverview = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    physicalSubscriptions: 0,
    onlineSubscriptions: 0,
    subscriptionRevenue: 0,
    monthlyGrowth: 0,
    totalTransactions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);

      // Solo obtener suscripciones activas y pagadas (ingresos de la plataforma)
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('amount, plan, status, created_at, payment_method')
        .in('status', ['active', 'past_due']);

      if (subscriptionError) throw subscriptionError;

      // Calcular estadísticas
      const currentMonth = new Date();
      const startMonth = startOfMonth(currentMonth);
      const endMonth = endOfMonth(currentMonth);
      const lastMonth = subDays(startMonth, 1);
      const startLastMonth = startOfMonth(lastMonth);

      // Ingresos por suscripciones (solo ingresos de la plataforma)
      const subscriptionRevenue = subscriptions?.reduce((sum, sub) => 
        sum + Number(sub.amount), 0) || 0;

      // Pagos físicos vs online de suscripciones
      const physicalSubscriptions = subscriptions?.filter(s => 
        s.payment_method === 'cash' || s.payment_method === 'transfer')
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      const onlineSubscriptions = subscriptions?.filter(s => 
        s.payment_method === 'stripe' || s.payment_method === 'card' || !s.payment_method)
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      const totalRevenue = subscriptionRevenue;

      // Cálculo de crecimiento mensual basado en suscripciones
      const currentMonthRevenue = subscriptions?.filter(s => 
        new Date(s.created_at) >= startMonth && new Date(s.created_at) <= endMonth)
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      const lastMonthRevenue = subscriptions?.filter(s => 
        new Date(s.created_at) >= startLastMonth && new Date(s.created_at) < startMonth)
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      const monthlyGrowth = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      const totalTransactions = subscriptions?.length || 0;

      setStats({
        totalRevenue,
        physicalSubscriptions,
        onlineSubscriptions,
        subscriptionRevenue,
        monthlyGrowth,
        totalTransactions
      });

    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de ingresos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Ingresos Totales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <div className={`text-xs flex items-center gap-1 ${getGrowthColor(stats.monthlyGrowth)}`}>
              {getGrowthIcon(stats.monthlyGrowth)}
              {Math.abs(stats.monthlyGrowth).toFixed(1)}% vs mes anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Suscripciones Físicas
            </CardTitle>
            <Banknote className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.physicalSubscriptions)}</div>
            <div className="text-xs text-muted-foreground">
              {stats.totalRevenue > 0 
                ? ((stats.physicalSubscriptions / stats.totalRevenue) * 100).toFixed(1)
                : 0}% del total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Suscripciones Online
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.onlineSubscriptions)}</div>
            <div className="text-xs text-muted-foreground">
              {stats.totalRevenue > 0 
                ? ((stats.onlineSubscriptions / stats.totalRevenue) * 100).toFixed(1)
                : 0}% del total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Suscripciones Activas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <div className="text-xs text-muted-foreground">
              Total de suscripciones
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Métodos de Pago de Suscripciones
            </CardTitle>
            <CardDescription>
              Ingresos de la plataforma por método de pago
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-orange-600"></div>
                <span className="font-medium">Físicos (Efectivo/Transferencia)</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatCurrency(stats.physicalSubscriptions)}</div>
                <Badge variant="secondary" className="text-xs">
                  {stats.totalRevenue > 0 
                    ? ((stats.physicalSubscriptions / stats.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                <span className="font-medium">Digitales (Stripe/Tarjeta)</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatCurrency(stats.onlineSubscriptions)}</div>
                <Badge variant="secondary" className="text-xs">
                  {stats.totalRevenue > 0 
                    ? ((stats.onlineSubscriptions / stats.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </Badge>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="text-sm text-muted-foreground">
                Última actualización: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                <strong>Nota:</strong> Solo se muestran ingresos de la plataforma (suscripciones). Los pagos de consultas van directamente a los doctores.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};