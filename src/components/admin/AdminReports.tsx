import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Users, Calendar, DollarSign } from 'lucide-react';

export function AdminReports() {
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [reportConfig, setReportConfig] = useState({
    type: 'appointments' as 'appointments' | 'users' | 'ratings' | 'revenue',
    startDate: '',
    endDate: '',
    filters: {}
  });

  const generateReport = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const response = await supabase.functions.invoke('admin-reports', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          reportType: reportConfig.type,
          startDate: reportConfig.startDate,
          endDate: reportConfig.endDate,
          filters: reportConfig.filters
        })
      });

      if (response.error) {
        throw response.error;
      }

      // Create and download the CSV file
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${reportConfig.type}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Reporte Generado",
        description: "El reporte se ha descargado exitosamente.",
      });

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el reporte",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      id: 'appointments',
      title: 'Reporte de Citas',
      description: 'Listado completo de todas las citas médicas',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      id: 'users',
      title: 'Reporte de Usuarios',
      description: 'Información de todos los usuarios registrados',
      icon: Users,
      color: 'text-green-600'
    },
    {
      id: 'ratings',
      title: 'Reporte de Calificaciones',
      description: 'Análisis de calificaciones y comentarios',
      icon: FileText,
      color: 'text-yellow-600'
    },
    {
      id: 'revenue',
      title: 'Reporte de Ingresos',
      description: 'Análisis financiero y de ingresos',
      icon: DollarSign,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Generación de Reportes</h2>
        <p className="text-muted-foreground">Genera reportes detallados de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => {
          const IconComponent = report.icon;
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconComponent className={`h-5 w-5 ${report.color}`} />
                  {report.title}
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full"
                      onClick={() => setReportConfig(prev => ({ ...prev, type: report.id as any }))}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Generar Reporte
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configurar Reporte</DialogTitle>
                      <DialogDescription>
                        Configura los parámetros para generar el reporte de {report.title.toLowerCase()}.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="report-type">Tipo de Reporte</Label>
                        <Select 
                          value={reportConfig.type} 
                          onValueChange={(value: any) => setReportConfig(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="appointments">Citas</SelectItem>
                            <SelectItem value="users">Usuarios</SelectItem>
                            <SelectItem value="ratings">Calificaciones</SelectItem>
                            <SelectItem value="revenue">Ingresos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {(reportConfig.type === 'appointments' || reportConfig.type === 'ratings' || reportConfig.type === 'revenue') && (
                        <>
                          <div>
                            <Label htmlFor="start-date">Fecha de Inicio</Label>
                            <Input
                              id="start-date"
                              type="date"
                              value={reportConfig.startDate}
                              onChange={(e) => setReportConfig(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="end-date">Fecha de Fin</Label>
                            <Input
                              id="end-date"
                              type="date"
                              value={reportConfig.endDate}
                              onChange={(e) => setReportConfig(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={generateReport} disabled={loading}>
                        {loading ? 'Generando...' : 'Generar y Descargar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información sobre Reportes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Los reportes se generan en formato CSV para fácil análisis en Excel u otras herramientas.</p>
            <p>• Los datos incluyen información completa según el tipo de reporte seleccionado.</p>
            <p>• Los filtros de fecha son opcionales - sin filtros se incluyen todos los registros históricos.</p>
            <p>• Los reportes de ingresos solo incluyen citas completadas con precio asignado.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}