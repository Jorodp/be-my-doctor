import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Stethoscope,
  Award,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock
} from 'lucide-react';

interface DoctorInfo {
  user_id: string;
  specialty: string;
  biography: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  verification_status: string;
  profile: {
    full_name: string;
    phone: string;
    email: string;
  } | null;
}

interface AssignedDoctorInfoProps {
  doctorId: string;
}

export function AssignedDoctorInfo({ doctorId }: AssignedDoctorInfoProps) {
  const { toast } = useToast();
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    scheduledAppointments: 0
  });

  useEffect(() => {
    if (doctorId) {
      fetchDoctorInfo();
      fetchTodayStats();
    }
  }, [doctorId]);

  const fetchDoctorInfo = async () => {
    try {
      const { data: doctorProfile, error } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', doctorId)
        .single();

      if (error) throw error;
      if (!doctorProfile) throw new Error('Doctor profile not found');

      // Get profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', doctorId)
        .single();

      if (error) throw error;
      if (!doctorProfile) throw new Error('Doctor profile not found');

      // Get email from auth.users via edge function or direct query
      let email = 'No disponible';
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(doctorId);
        if (userData?.user?.email) {
          email = userData.user.email;
        }
      } catch (error) {
        console.log('Could not fetch user email:', error);
      }
      
      const doctorData: DoctorInfo = {
        user_id: doctorProfile.user_id,
        specialty: doctorProfile.specialty,
        biography: doctorProfile.biography,
        years_experience: doctorProfile.years_experience,
        consultation_fee: doctorProfile.consultation_fee,
        verification_status: doctorProfile.verification_status,
        profile: profile ? {
          full_name: profile.full_name || 'No especificado',
          phone: profile.phone || 'No especificado',
          email: email
        } : null
      };

      setDoctorInfo(doctorData);
    } catch (error) {
      console.error('Error fetching doctor info:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del médico",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('status')
        .eq('doctor_user_id', doctorId)
        .gte('starts_at', today.toISOString())
        .lt('starts_at', tomorrow.toISOString());

      if (error) throw error;

      const stats = {
        totalAppointments: appointments?.length || 0,
        completedAppointments: appointments?.filter(apt => apt.status === 'completed').length || 0,
        scheduledAppointments: appointments?.filter(apt => apt.status === 'scheduled').length || 0
      };

      setTodayStats(stats);
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!doctorInfo) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No se pudo cargar la información del médico</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Doctor Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Médico Asignado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {doctorInfo.profile?.full_name?.split(' ').map(n => n[0]).join('') || 'Dr'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2 flex-1">
              <div>
                <h3 className="text-xl font-semibold">{doctorInfo.profile?.full_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{doctorInfo.specialty}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {doctorInfo.verification_status === 'verified' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Verificado
                    </Badge>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <Badge variant="secondary">
                      {doctorInfo.verification_status === 'pending' ? 'Pendiente' : 'No Verificado'}
                    </Badge>
                  </>
                )}
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>📞 {doctorInfo.profile?.phone || 'No especificado'}</p>
                <p>✉️ {doctorInfo.profile?.email}</p>
                {doctorInfo.years_experience && (
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    <span>{doctorInfo.years_experience} años de experiencia</span>
                  </div>
                )}
                {doctorInfo.consultation_fee && (
                  <p>💰 Consulta: ${doctorInfo.consultation_fee}</p>
                )}
              </div>
            </div>
          </div>

          {doctorInfo.biography && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Biografía</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {doctorInfo.biography}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumen del Día
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">{todayStats.totalAppointments}</div>
              <div className="text-xs text-muted-foreground">Total Citas</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">{todayStats.completedAppointments}</div>
              <div className="text-xs text-muted-foreground">Completadas</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">{todayStats.scheduledAppointments}</div>
              <div className="text-xs text-muted-foreground">Pendientes</div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Estado Actual
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Citas pendientes:</span>
                <span className="font-medium">{todayStats.scheduledAppointments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progreso del día:</span>
                <span className="font-medium">
                  {todayStats.totalAppointments > 0 
                    ? Math.round((todayStats.completedAppointments / todayStats.totalAppointments) * 100)
                    : 0
                  }%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}