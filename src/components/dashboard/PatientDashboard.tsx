import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardHeader } from "@/components/DashboardHeader";
import { AssignedDoctorInfo } from "@/components/AssignedDoctorInfo";
import { PatientDocumentManager } from "@/components/PatientDocumentManager";
import { PendingRatingValidator } from "@/components/PendingRatingValidator";
import { ChatInterface } from "@/components/ChatInterface";
import { AppointmentCard } from "@/components/AppointmentCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, MessageSquare, User } from "lucide-react";

export const PatientDashboard = () => {
  const { signOut } = useAuth();
  const [validatorOpen, setValidatorOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <DashboardHeader
        title="Panel del Paciente"
        subtitle="Gestiona tus citas y consultas médicas"
        onSignOut={signOut}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Tabs defaultValue="citas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="citas" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Citas
            </TabsTrigger>
            <TabsTrigger value="perfil" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Mi Perfil
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="citas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Doctor Asignado</CardTitle>
                <CardDescription>
                  Información de tu médico de cabecera
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4" />
                  <p>No tienes doctor asignado</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Mis Citas</CardTitle>
                <CardDescription>
                  Próximas citas y historial médico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>No hay citas programadas</p>
                </div>
              </CardContent>
            </Card>
            <PendingRatingValidator 
              onValidationComplete={() => {}}
              isOpen={validatorOpen}
              onClose={() => setValidatorOpen(false)}
            />
          </TabsContent>

          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <CardTitle>Mi Perfil</CardTitle>
                <CardDescription>
                  Gestiona tu información personal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4" />
                  <p>Gestión de perfil disponible próximamente</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <PatientDocumentManager appointmentPatients={[]} />
          </TabsContent>

          <TabsContent value="chat">
            <ChatInterface />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};