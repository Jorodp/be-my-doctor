-- Crear políticas RLS para la tabla scheduled_notifications
-- La tabla existe pero no tiene políticas, lo que causa el error RLS

-- Política para permitir que el sistema cree notificaciones automáticamente
CREATE POLICY "System can create scheduled notifications" 
ON public.scheduled_notifications 
FOR INSERT 
WITH CHECK (true);

-- Política para que los usuarios puedan ver sus propias notificaciones
CREATE POLICY "Users can view their own scheduled notifications" 
ON public.scheduled_notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a 
    WHERE a.id = scheduled_notifications.appointment_id 
    AND (a.patient_user_id = auth.uid() OR a.doctor_user_id = auth.uid())
  )
);

-- Política para admins
CREATE POLICY "Admins can manage all scheduled notifications" 
ON public.scheduled_notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Política para que el sistema pueda actualizar las notificaciones (marcar como enviadas)
CREATE POLICY "System can update scheduled notifications" 
ON public.scheduled_notifications 
FOR UPDATE 
USING (true)
WITH CHECK (true);