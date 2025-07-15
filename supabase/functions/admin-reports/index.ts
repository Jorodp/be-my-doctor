import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    const body = await req.json();
    const { action, reportType, startDate, endDate, filters } = body;

    console.log('Generating report:', { action, reportType, startDate, endDate, filters });

    if (action === 'generate') {
      let reportData: any = {};
      let filename = 'report';

      switch (reportType) {
        case 'appointments':
          filename = 'appointments_report';
          const { data: appointments } = await supabase
            .from('appointments')
            .select(`
              id,
              starts_at,
              ends_at,
              status,
              price,
              created_at,
              patient_profiles:patient_user_id(full_name),
              doctor_profiles:doctor_user_id(full_name)
            `)
            .gte('starts_at', startDate || '2024-01-01')
            .lte('starts_at', endDate || new Date().toISOString());

          reportData = {
            title: 'Reporte de Citas',
            period: `${startDate || 'Inicio'} - ${endDate || 'Hoy'}`,
            total: appointments?.length || 0,
            data: appointments?.map(apt => ({
              'ID': apt.id,
              'Fecha': new Date(apt.starts_at).toLocaleDateString('es-ES'),
              'Hora': new Date(apt.starts_at).toLocaleTimeString('es-ES'),
              'Estado': apt.status,
              'Paciente': apt.patient_profiles?.full_name || 'N/A',
              'Doctor': apt.doctor_profiles?.full_name || 'N/A',
              'Precio': apt.price ? `$${apt.price}` : 'N/A'
            })) || []
          };
          break;

        case 'users':
          filename = 'users_report';
          const { data: users } = await supabaseAdmin.auth.admin.listUsers();
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*');

          reportData = {
            title: 'Reporte de Usuarios',
            period: `Generado el ${new Date().toLocaleDateString('es-ES')}`,
            total: users.users?.length || 0,
            data: users.users?.map(user => {
              const profile = profiles?.find(p => p.user_id === user.id);
              return {
                'ID': user.id,
                'Email': user.email,
                'Rol': profile?.role || 'N/A',
                'Nombre': profile?.full_name || 'N/A',
                'Fecha Registro': new Date(user.created_at).toLocaleDateString('es-ES'),
                'Último Login': user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('es-ES') : 'Nunca'
              };
            }) || []
          };
          break;

        case 'ratings':
          filename = 'ratings_report';
          const { data: ratings } = await supabase
            .from('ratings')
            .select(`
              id,
              rating,
              comment,
              created_at,
              patient_profiles:patient_user_id(full_name),
              doctor_profiles:doctor_user_id(full_name)
            `)
            .gte('created_at', startDate || '2024-01-01')
            .lte('created_at', endDate || new Date().toISOString());

          const avgRating = ratings?.length ? 
            (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2) : '0';

          reportData = {
            title: 'Reporte de Calificaciones',
            period: `${startDate || 'Inicio'} - ${endDate || 'Hoy'}`,
            total: ratings?.length || 0,
            averageRating: avgRating,
            data: ratings?.map(rating => ({
              'ID': rating.id,
              'Calificación': rating.rating,
              'Comentario': rating.comment || 'Sin comentario',
              'Paciente': rating.patient_profiles?.full_name || 'N/A',
              'Doctor': rating.doctor_profiles?.full_name || 'N/A',
              'Fecha': new Date(rating.created_at).toLocaleDateString('es-ES')
            })) || []
          };
          break;

        case 'revenue':
          filename = 'revenue_report';
          const { data: paidAppointments } = await supabase
            .from('appointments')
            .select('price, starts_at, status')
            .eq('status', 'completed')
            .not('price', 'is', null)
            .gte('starts_at', startDate || '2024-01-01')
            .lte('starts_at', endDate || new Date().toISOString());

          const totalRevenue = paidAppointments?.reduce((sum, apt) => sum + (apt.price || 0), 0) || 0;

          reportData = {
            title: 'Reporte de Ingresos',
            period: `${startDate || 'Inicio'} - ${endDate || 'Hoy'}`,
            total: paidAppointments?.length || 0,
            totalRevenue: totalRevenue,
            averageRevenue: paidAppointments?.length ? (totalRevenue / paidAppointments.length).toFixed(2) : '0',
            data: paidAppointments?.map(apt => ({
              'Fecha': new Date(apt.starts_at).toLocaleDateString('es-ES'),
              'Precio': `$${apt.price}`,
              'Estado': apt.status
            })) || []
          };
          break;

        default:
          throw new Error('Invalid report type');
      }

      // Generate CSV content
      const headers = Object.keys(reportData.data[0] || {});
      const csvContent = [
        `# ${reportData.title}`,
        `# Período: ${reportData.period}`,
        `# Total registros: ${reportData.total}`,
        reportData.averageRating ? `# Calificación promedio: ${reportData.averageRating}` : '',
        reportData.totalRevenue ? `# Ingresos totales: $${reportData.totalRevenue}` : '',
        '',
        headers.join(','),
        ...reportData.data.map((row: any) => 
          headers.map(header => `"${row[header] || ''}"`).join(',')
        )
      ].filter(line => line !== '').join('\n');

      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`
        },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in admin-reports function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});