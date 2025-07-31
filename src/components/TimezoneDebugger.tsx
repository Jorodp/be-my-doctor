/**
 * 🔧 Componente de prueba para debugging de zonas horarias
 * Muestra información detallada sobre las conversiones de tiempo
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dayjs } from "@/utils/dayjsConfig";
import { Clock, Globe, AlertCircle } from "lucide-react";

export function TimezoneDebugger() {
  const now = new Date();
  const utcNow = dayjs.utc();
  const localNow = dayjs();
  const guessedTZ = dayjs.tz.guess();
  
  // Ejemplo de conversión UTC -> Local
  const exampleUTC = "2025-07-31T22:00:00.000Z";
  const utcMoment = dayjs.utc(exampleUTC);
  const localMoment = utcMoment.tz(guessedTZ);
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertCircle className="w-5 h-5" />
          🐛 Timezone Debugger
        </CardTitle>
        <CardDescription className="text-orange-700">
          Información de debugging para zonas horarias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Información del Sistema */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Información del Sistema
          </h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <Badge variant="outline">Zona detectada: {guessedTZ}</Badge>
            <Badge variant="outline">Offset: {localNow.format('Z')}</Badge>
            <Badge variant="outline">UTC Actual: {utcNow.format()}</Badge>
            <Badge variant="outline">Local Actual: {localNow.format()}</Badge>
          </div>
        </div>

        {/* Ejemplo de Conversión */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Ejemplo de Conversión UTC → Local
          </h4>
          <div className="grid grid-cols-1 gap-2 text-sm bg-white p-3 rounded border">
            <div><strong>Input UTC:</strong> {exampleUTC}</div>
            <div><strong>Parsed UTC:</strong> {utcMoment.toString()}</div>
            <div><strong>Local Time:</strong> {localMoment.toString()}</div>
            <div><strong>Formatted:</strong> {localMoment.format('HH:mm DD/MM/YYYY')}</div>
          </div>
        </div>

        {/* Test de appointmentDateTime */}
        <div className="space-y-2">
          <h4 className="font-medium">Test appointmentDateTime Creation</h4>
          <div className="text-sm bg-white p-3 rounded border space-y-1">
            {(() => {
              const testDate = "2025-08-01";
              const testTime = "14:30";
              const testLocal = dayjs.tz(`${testDate} ${testTime}`, guessedTZ);
              const testUTC = testLocal.utc();
              
              return (
                <>
                  <div><strong>Input:</strong> {testDate} {testTime}</div>
                  <div><strong>Local TZ:</strong> {testLocal.format()}</div>
                  <div><strong>UTC for DB:</strong> {testUTC.toISOString()}</div>
                </>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}