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
  physicalPayments: number;
  onlinePayments: number;
  subscriptionRevenue: number;
  consultationRevenue: number;
  monthlyGrowth: number;
  totalTransactions: number;
}

export const RevenueOverview = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    physicalPayments: 0,
    onlinePayments: 0,
    subscriptionRevenue: 0,
    consultationRevenue: 0,
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

      // Obtener pagos de consultas
      const { data: consultationPayments, error: consultationError } = await supabase
        .from('consultation_payments')
        .select('amount, payment_method, status, created_at')
        .eq('status', 'completed');

      if (consultationError) throw consultationError;

      // Obtener suscripciones activas y pagadas
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('amount, plan, status, created_at')
        .in('status', ['active', 'past_due']);

      if (subscriptionError) throw subscriptionError;

      // Obtener pagos físicos completados
      const { data: physicalRequests, error: physicalError } = await supabase
        .from('physical_payment_requests')
        .select('amount, status, created_at')
        .eq('status', 'completed');

      if (physicalError) throw physicalError;

      // Calcular estadísticas
      const currentMonth = new Date();
      const startMonth = startOfMonth(currentMonth);
      const endMonth = endOfMonth(currentMonth);
      const lastMonth = subDays(startMonth, 1);
      const startLastMonth = startOfMonth(lastMonth);

      // Ingresos por consultas
      const consultationRevenue = consultationPayments?.reduce((sum, payment) => 
        sum + Number(payment.amount), 0) || 0;

      // Pagos físicos vs online (basado en method)
      const physicalPayments = (consultationPayments?.filter(p => 
        p.payment_method === 'cash' || p.payment_method === 'transfer')
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0) +
        (physicalRequests?.reduce((sum, p) => sum + Number(p.amount), 0) || 0);

      const onlinePayments = consultationPayments?.filter(p => 
        p.payment_method === 'stripe' || p.payment_method === 'card')
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Ingresos por suscripciones
      const subscriptionRevenue = subscriptions?.reduce((sum, sub) => 
        sum + Number(sub.amount), 0) || 0;

      const totalRevenue = consultationRevenue + subscriptionRevenue;

      // Cálculo de crecimiento mensual (simplificado)
      const currentMonthRevenue = consultationPayments?.filter(p => 
        new Date(p.created_at) >= startMonth && new Date(p.created_at) <= endMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const lastMonthRevenue = consultationPayments?.filter(p => 
        new Date(p.created_at) >= startLastMonth && new Date(p.created_at) < startMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const monthlyGrowth = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      const totalTransactions = (consultationPayments?.length || 0) + 
                               (subscriptions?.length || 0) + 
                               (physicalRequests?.length || 0);

      setStats({
        totalRevenue,
        physicalPayments,
        onlinePayments,
        subscriptionRevenue,
        consultationRevenue,
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
              Pagos Físicos
            </CardTitle>
            <Banknote className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.physicalPayments)}</div>
            <div className="text-xs text-muted-foreground">
              {stats.totalRevenue > 0 
                ? ((stats.physicalPayments / stats.totalRevenue) * 100).toFixed(1)
                : 0}% del total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pagos Online
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.onlinePayments)}</div>
            <div className="text-xs text-muted-foreground">
              {stats.totalRevenue > 0 
                ? ((stats.onlinePayments / stats.totalRevenue) * 100).toFixed(1)
                : 0}% del total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transacciones
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <div className="text-xs text-muted-foreground">
              Total de pagos procesados
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Desglose por Tipo
            </CardTitle>
            <CardDescription>
              Distribución de ingresos por categoría
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                <span className="font-medium">Suscripciones</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatCurrency(stats.subscriptionRevenue)}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.totalRevenue > 0 
                    ? ((stats.subscriptionRevenue / stats.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-600"></div>
                <span className="font-medium">Consultas</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatCurrency(stats.consultationRevenue)}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.totalRevenue > 0 
                    ? ((stats.consultationRevenue / stats.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Métodos de Pago
            </CardTitle>
            <CardDescription>
              Comparativa entre pagos físicos y digitales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-orange-600"></div>
                <span className="font-medium">Físicos (Efectivo/Transferencia)</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatCurrency(stats.physicalPayments)}</div>
                <Badge variant="secondary" className="text-xs">
                  {stats.totalRevenue > 0 
                    ? ((stats.physicalPayments / stats.totalRevenue) * 100).toFixed(1)
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
                <div className="font-bold">{formatCurrency(stats.onlinePayments)}</div>
                <Badge variant="secondary" className="text-xs">
                  {stats.totalRevenue > 0 
                    ? ((stats.onlinePayments / stats.totalRevenue) * 100).toFixed(1)
                    : 0}%
                </Badge>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="text-sm text-muted-foreground">
                Última actualización: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};